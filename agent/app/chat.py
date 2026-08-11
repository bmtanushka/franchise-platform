from typing import Any, Optional

from . import db
from .openai_helper import extract_answer, phrase_intro, phrase_question
from .question_sets import Field, SERVICE_LABELS, get_question_set

SERVICE_SELECT_FIELD: Field = {
    "key": "service_type",
    "prompt": "Which service are you interested in?",
    "type": "enum",
    "enum_values": list(SERVICE_LABELS.keys()),
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


async def start_chat(tenant_id: str, tenant_name: str) -> dict[str, Any]:
    session_id = await db.create_chat_session(tenant_id, service_type_id=None)
    intro = await phrase_intro(tenant_name, list(SERVICE_LABELS.values()))
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
        return await _handle_service_selection(session_id, tenant_name, user_message)

    return await _handle_field_answer(session, tenant_name, user_message)


async def _handle_service_selection(session_id: str, tenant_name: str, user_message: str) -> dict[str, Any]:
    result = await extract_answer(SERVICE_SELECT_FIELD, user_message)
    if not result.ok:
        reply = (
            "Sorry, I didn't quite catch that — could you tell me which of these you're "
            f"interested in: {', '.join(SERVICE_LABELS.values())}?"
        )
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    service_key = result.value
    service_type_id = await db.get_service_type_id(service_key)
    if service_type_id is None:
        raise ChatTurnError(f"Unknown service type '{service_key}'.")

    await db.set_session_service_type(session_id, service_type_id)

    first_field = get_question_set(service_key)[0]
    reply = await phrase_question(first_field, tenant_name)
    await db.insert_chat_message(session_id, "assistant", reply)
    return {"session_id": session_id, "reply": reply, "done": False}


async def _handle_field_answer(session: dict[str, Any], tenant_name: str, user_message: str) -> dict[str, Any]:
    session_id = session["id"]
    service_key = await db.get_service_type_key(session["service_type_id"])
    question_set = get_question_set(service_key)
    answers = session["collected_answers"]

    field_index = len(answers)
    if field_index >= len(question_set):
        raise ChatTurnError("No more questions to answer for this session.")

    field = question_set[field_index]
    result = await extract_answer(field, user_message)

    if not result.ok:
        reply = f"Sorry, I didn't quite get that. {field['prompt']}"
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    new_answers = {**answers, field["key"]: result.value}
    await db.update_session_answers(session_id, new_answers)

    next_index = field_index + 1
    if next_index < len(question_set):
        next_field = question_set[next_index]
        reply = await phrase_question(next_field, tenant_name)
        await db.insert_chat_message(session_id, "assistant", reply)
        return {"session_id": session_id, "reply": reply, "done": False}

    return await _finalize_lead(session["tenant_id"], session_id, service_key, question_set, new_answers)


async def _finalize_lead(
    tenant_id: str,
    session_id: str,
    service_key: str,
    question_set: list[Field],
    answers: dict[str, Any],
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

    closing = (
        f"Thanks, {lead_fields.get('full_name', 'there')} — we've got everything we need. "
        "A specialist will be in touch soon."
    )
    await db.insert_chat_message(session_id, "assistant", closing)
    return {"session_id": session_id, "reply": closing, "done": True, "lead_id": lead_id}
