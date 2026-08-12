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
