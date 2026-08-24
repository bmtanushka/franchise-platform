import json
from typing import Any, Optional
from uuid import UUID

import asyncpg

from .config import settings

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool


async def create_chat_session(tenant_id: str, service_type_id: Optional[str]) -> str:
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        insert into chat_sessions (tenant_id, service_type_id, status)
        values ($1, $2, 'active')
        returning id
        """,
        UUID(tenant_id),
        UUID(service_type_id) if service_type_id else None,
    )
    return str(row["id"])


async def get_chat_session(session_id: str) -> Optional[dict[str, Any]]:
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        select id, tenant_id, service_type_id, status, collected_answers, lead_id
        from chat_sessions
        where id = $1
        """,
        UUID(session_id),
    )
    if row is None:
        return None
    return {
        "id": str(row["id"]),
        "tenant_id": str(row["tenant_id"]),
        "service_type_id": str(row["service_type_id"]) if row["service_type_id"] else None,
        "status": row["status"],
        "collected_answers": json.loads(row["collected_answers"]),
        "lead_id": str(row["lead_id"]) if row["lead_id"] else None,
    }


async def set_session_service_type(session_id: str, service_type_id: str) -> None:
    pool = await get_pool()
    await pool.execute(
        "update chat_sessions set service_type_id = $2, last_message_at = now() where id = $1",
        UUID(session_id),
        UUID(service_type_id),
    )


async def update_session_answers(session_id: str, collected_answers: dict[str, Any]) -> None:
    pool = await get_pool()
    await pool.execute(
        "update chat_sessions set collected_answers = $2, last_message_at = now() where id = $1",
        UUID(session_id),
        json.dumps(collected_answers),
    )


async def complete_chat_session(session_id: str, lead_id: str) -> None:
    pool = await get_pool()
    await pool.execute(
        "update chat_sessions set status = 'completed', lead_id = $2, last_message_at = now() where id = $1",
        UUID(session_id),
        UUID(lead_id),
    )


async def insert_chat_message(session_id: str, role: str, content: str) -> None:
    pool = await get_pool()
    await pool.execute(
        "insert into chat_messages (session_id, role, content) values ($1, $2, $3)",
        UUID(session_id),
        role,
        content,
    )


async def get_service_type_id(key: str) -> Optional[str]:
    pool = await get_pool()
    row = await pool.fetchrow("select id from service_types where key = $1", key)
    return str(row["id"]) if row else None


async def get_service_type_key(service_type_id: str) -> Optional[str]:
    pool = await get_pool()
    row = await pool.fetchrow("select key from service_types where id = $1", UUID(service_type_id))
    return row["key"] if row else None


async def get_service_type_name(service_type_id: str) -> Optional[str]:
    pool = await get_pool()
    row = await pool.fetchrow("select name from service_types where id = $1", UUID(service_type_id))
    return row["name"] if row else None


async def list_offered_services(tenant_type: str) -> list[dict[str, str]]:
    """
    Active services offered to a visitor of this tenant type — corporate-
    only services (franchise_interest, or any future one an admin marks
    that way) are excluded everywhere except the franchisor's own site.
    Replaces chat.py's old hardcoded `SERVICE_LABELS` + key-equality check.
    """
    pool = await get_pool()
    rows = await pool.fetch(
        """
        select key, name from service_types
        where is_active and (not corporate_only or $1 = 'franchisor')
        order by created_at
        """,
        tenant_type,
    )
    return [{"key": r["key"], "name": r["name"]} for r in rows]


async def get_questions_for_service(service_type_id: str) -> list[dict[str, Any]]:
    """
    Ordered question list for a service, shaped exactly like the old
    static `Field` dicts from question_sets.py so `next_pending_field`/
    `_dependency_met` (unchanged, dict-shape-agnostic) and openai_helper's
    extraction keep working unmodified. `enum_values` is the flat list of
    stored option values (what `_dependency_met`/the tool-call JSON schema
    need); `enum_labels` (value -> label) is new, used by openai_helper to
    give extraction more than a bare slug to match free text against.
    Called fresh every turn — not cached — so an admin edit takes effect
    immediately, including mid-conversation.
    """
    pool = await get_pool()
    rows = await pool.fetch(
        """
        select
          cq.id, cq.key, cq.prompt, cq.field_type, cq.lead_field,
          cq.depends_on_key, cq.depends_on_mode, cq.depends_on_values,
          co.value as option_value, co.label as option_label
        from chat_questions cq
        left join chat_question_options co on co.chat_question_id = cq.id
        where cq.service_type_id = $1
        order by cq.position, co.position
        """,
        UUID(service_type_id),
    )

    fields: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for row in rows:
        key = row["key"]
        if key not in fields:
            order.append(key)
            field: dict[str, Any] = {
                "key": key,
                "prompt": row["prompt"],
                "type": row["field_type"],
            }
            if row["lead_field"]:
                field["lead_field"] = row["lead_field"]
            if row["depends_on_key"]:
                field["depends_on"] = {"field": row["depends_on_key"]}
                if row["depends_on_mode"] == "equals":
                    field["depends_on"]["equals"] = row["depends_on_values"][0]
                else:
                    field["depends_on"]["one_of"] = list(row["depends_on_values"])
            if row["field_type"] == "enum":
                field["enum_values"] = []
                field["enum_labels"] = {}
            fields[key] = field

        if row["option_value"] is not None:
            fields[key]["enum_values"].append(row["option_value"])
            fields[key]["enum_labels"][row["option_value"]] = row["option_label"]

    return [fields[k] for k in order]


async def create_lead(
    *,
    tenant_id: str,
    service_type_id: str,
    full_name: Optional[str],
    contact_email: Optional[str],
    contact_phone: Optional[str],
    postcode: Optional[str],
    consent_to_contact: bool,
    details: dict[str, Any],
    source_session_id: str,
) -> str:
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        insert into leads (
          tenant_id, service_type_id, status, full_name, contact_email,
          contact_phone, postcode, consent_to_contact, details, source_session_id
        )
        values ($1, $2, 'qualified', $3, $4, $5, $6, $7, $8, $9)
        returning id
        """,
        UUID(tenant_id),
        UUID(service_type_id),
        full_name,
        contact_email,
        contact_phone,
        postcode,
        consent_to_contact,
        json.dumps(details),
        UUID(source_session_id),
    )
    lead_id = str(row["id"])

    await pool.execute(
        """
        insert into lead_status_history (lead_id, status, note)
        values ($1, 'qualified', 'Captured via chat agent intake')
        """,
        UUID(lead_id),
    )
    return lead_id


async def get_tenant_type(tenant_id: str) -> Optional[str]:
    pool = await get_pool()
    row = await pool.fetchrow("select type from tenants where id = $1", UUID(tenant_id))
    return row["type"] if row else None


async def get_chat_settings() -> dict[str, str]:
    """
    Singleton row — always exactly one. Franchisor/super_admin-editable
    greeting templates (web/src/lib/db/chat-settings.ts); the corporate
    site uses corporate_greeting, every franchisee site uses
    franchisee_greeting, per chat.py's start_chat.
    """
    pool = await get_pool()
    row = await pool.fetchrow("select corporate_greeting, franchisee_greeting from chat_settings limit 1")
    return {
        "corporate_greeting": row["corporate_greeting"],
        "franchisee_greeting": row["franchisee_greeting"],
    }


async def get_franchisee_owner_email(tenant_id: str) -> Optional[str]:
    pool = await get_pool()
    row = await pool.fetchrow(
        "select email from users where tenant_id = $1 and role = 'franchisee' limit 1",
        UUID(tenant_id),
    )
    return row["email"] if row else None


async def count_user_messages(session_id: str) -> int:
    pool = await get_pool()
    row = await pool.fetchrow(
        "select count(*) as n from chat_messages where session_id = $1 and role = 'user'",
        UUID(session_id),
    )
    return row["n"]
