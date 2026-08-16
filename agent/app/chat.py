from typing import Any, Optional

from . import db, email
from .config import settings
from .openai_helper import extract_answer, phrase_intro, phrase_question
from .question_sets import Field, SERVICE_LABELS, get_question_set, next_pending_field


def _offered_labels(tenant_type: str) -> dict[str, str]:
    # Franchise-interest is only ever offered on the franchisor's own
    # corporate site — a franchisee's subdomain chat is for their local
    # customers, not people wanting to open a competing franchise.
    if tenant_type == "franchisor":
        return SERVICE_LABELS
    return {k: v for k, v in SERVICE_LABELS.items() if k != "franchise_interest"}


def _service_select_field(tenant_type: str) -> Field:
    return {
        "key": "service_type",
        "prompt": "Which service are you interested in?",
        "type": "enum",
        "enum_values": list(_offered_labels(tenant_type).keys()),
    }


class ChatTurnError(Exception):
    pass


def _split_answers(question_set: list[Field], answers: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    lead_fields: dict[str, Any] = {}
    details: dict[str, Any] = {}
    for field in question_set:
        key = field["key"]
        if key not in answers:
            continue
        if "lead_field" in field:
            lead_fields[field["lead_field"]] = answers[key]
        else:
            details[key] = answers[key]
    return lead_fields, details


async def start_chat(tenant_id: str, tenant_name: str, tenant_type: str) -> dict[str, Any]:
    session_id = await db.create_chat_session(tenant_id, service_type_id=None)
    intro = await phrase_intro(tenant_name, list(_offered_labels(tenant_type).values()))
    await db.insert_chat_message(session_id, "assistant", intro)
    return {"session_id": session_id, "reply": intro, "done": False}


async def handle_message(session_id: str, tenant_name: str, user_message: str) -> dict[str, Any]:
    session = await db.get_chat_session(session_id)
    if session is None:
        raise ChatTurnError("Session not found.")
    if session["status"] != "active":
        raise ChatTurnError("This conversation has already ended.")

    await db.insert_chat_message(session_id, "user", user_message)

    if session["service_type_id"] is None:
        return await _handle_service_selection(session_id, session["tenant_id"], tenant_name, user_message)

    return await _handle_field_answer(session, tenant_name, user_message)


async def _handle_service_selection(session_id: str, tenant_id: str, tenant_name: str, user_message: str) -> dict[str, Any]:
    tenant_type = await db.get_tenant_type(tenant_id)
    offered = _offered_labels(tenant_type or "franchisee")
    result = await extract_answer(_service_select_field(tenant_type or "franchisee"), user_message)
    if not result.ok:
        reply = (
            "Sorry, I didn't quite catch that — could you tell me which of these you're "
            f"interested in: {', '.join(offered.values())}?"
        )
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    service_key = result.value
    service_type_id = await db.get_service_type_id(service_key)
    if service_type_id is None:
        raise ChatTurnError(f"Unknown service type '{service_key}'.")

    await db.set_session_service_type(session_id, service_type_id)

    first_field = next_pending_field(get_question_set(service_key), {})
    assert first_field is not None  # every question set has at least the common closing fields
    reply = await phrase_question(first_field, tenant_name)
    await db.insert_chat_message(session_id, "assistant", reply)
    return {"session_id": session_id, "reply": reply, "done": False}


async def _handle_field_answer(session: dict[str, Any], tenant_name: str, user_message: str) -> dict[str, Any]:
    session_id = session["id"]
    service_key = await db.get_service_type_key(session["service_type_id"])
    question_set = get_question_set(service_key)
    answers = session["collected_answers"]

    field = next_pending_field(question_set, answers)
    if field is None:
        raise ChatTurnError("No more questions to answer for this session.")

    result = await extract_answer(field, user_message)

    if not result.ok:
        reply = f"Sorry, I didn't quite get that. {field['prompt']}"
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    new_answers = {**answers, field["key"]: result.value}
    await db.update_session_answers(session_id, new_answers)

    next_field = next_pending_field(question_set, new_answers)
    if next_field is not None:
        reply = await phrase_question(next_field, tenant_name)
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    return await _finalize_lead(session["tenant_id"], session_id, service_key, question_set, new_answers, tenant_name)


async def _finalize_lead(
    tenant_id: str,
    session_id: str,
    service_key: str,
    question_set: list[Field],
    answers: dict[str, Any],
    tenant_name: str,
) -> dict[str, Any]:
    lead_fields, details = _split_answers(question_set, answers)
    service_type_id = await db.get_service_type_id(service_key)
    assert service_type_id is not None

    lead_id = await db.create_lead(
        tenant_id=tenant_id,
        service_type_id=service_type_id,
        full_name=lead_fields.get("full_name"),
        contact_email=lead_fields.get("contact_email"),
        contact_phone=lead_fields.get("contact_phone"),
        postcode=lead_fields.get("postcode"),
        consent_to_contact=bool(lead_fields.get("consent_to_contact", False)),
        details=details,
        source_session_id=session_id,
    )
    await db.complete_chat_session(session_id, lead_id)

    # Franchisor-site leads are owned by the franchisor outright, never a
    # franchisee (see CLAUDE.md) — only notify when this lead actually
    # belongs to a franchisee tenant. Best-effort: a failed/unconfigured
    # email must never break lead capture itself.
    try:
        tenant_type = await db.get_tenant_type(tenant_id)
        if tenant_type == "franchisee":
            owner_email = await db.get_franchisee_owner_email(tenant_id)
            if owner_email:
                await email.send_lead_created_email(
                    owner_email,
                    tenant_name=tenant_name,
                    full_name=lead_fields.get("full_name"),
                    service_label=SERVICE_LABELS.get(service_key, service_key),
                    lead_url=f"{settings.app_public_url}/dashboard/leads/{lead_id}",
                )
    except Exception as exc:  # noqa: BLE001 - notification must never break lead capture
        print(f"[email] Failed to send lead-created notification: {exc}")

    closing = (
        f"Thanks, {lead_fields.get('full_name', 'there')} — we've got everything we need. "
        "A specialist will be in touch soon."
    )
    await db.insert_chat_message(session_id, "assistant", closing)
    return {"session_id": session_id, "reply": closing, "done": True, "lead_id": lead_id}
