"""
OpenAI is used for exactly two things per turn, per the brief:
  1. Natural conversational phrasing of the next question.
  2. Extracting the user's free-text answer into a structured field via
     tool/function calling — never free-text parsing.

If OPENAI_API_KEY isn't set (e.g. local dev without a key yet), both steps
fall back to a deterministic, non-LLM path so the rest of the flow is still
exercisable end-to-end. This fallback is a local-dev convenience, not part
of the production behavior described in the brief.
"""

import json
import re
from typing import Any

from openai import AsyncOpenAI

from .config import settings
from .question_sets import Field

_client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

MODEL = "gpt-4o-mini"


async def phrase_intro(tenant_name: str, service_labels: list[str]) -> str:
    services_line = ", ".join(service_labels)
    base = (
        f"Hi, I'm {tenant_name}'s virtual assistant. I can help connect you with the right "
        f"specialist. Which of these are you interested in: {services_line}?"
    )
    if _client is None:
        return base

    response = await _client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a warm, concise intake assistant for {tenant_name}. "
                    "Rephrase the given opening message naturally in 2-3 short sentences. "
                    "Keep it introducing yourself and asking which service the visitor wants — "
                    "do not drop or add services."
                ),
            },
            {"role": "user", "content": base},
        ],
    )
    return response.choices[0].message.content or base


async def phrase_question(field: Field, tenant_name: str) -> str:
    base_prompt = field["prompt"]
    if _client is None:
        return base_prompt

    response = await _client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a warm, concise intake assistant for {tenant_name}. "
                    "Rephrase the given question naturally in 1-2 short sentences. "
                    "Do not add new questions, do not change what's being asked."
                ),
            },
            {"role": "user", "content": base_prompt},
        ],
    )
    return response.choices[0].message.content or base_prompt


class ExtractionResult:
    def __init__(self, ok: bool, value: Any = None):
        self.ok = ok
        self.value = value


def _tool_schema_for_field(field: Field) -> dict:
    if field["type"] == "enum":
        value_schema = {"type": "string", "enum": field["enum_values"]}
    elif field["type"] == "boolean":
        value_schema = {"type": "boolean"}
    else:
        value_schema = {"type": "string"}

    return {
        "type": "function",
        "function": {
            "name": "record_answer",
            "description": f"Record the user's answer to: {field['prompt']}",
            "parameters": {
                "type": "object",
                "properties": {"value": value_schema},
                "required": ["value"],
            },
        },
    }


async def extract_answer(field: Field, user_message: str) -> ExtractionResult:
    if _client is None:
        return _fallback_extract(field, user_message)

    tool = _tool_schema_for_field(field)

    response = await _client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract the user's answer into the record_answer tool call. "
                    "If the message doesn't actually answer the question, or is ambiguous, "
                    "do not call the tool."
                ),
            },
            {"role": "user", "content": f"Question: {field['prompt']}\nUser said: {user_message}"},
        ],
        tools=[tool],
        tool_choice="auto",
    )

    message = response.choices[0].message
    if not message.tool_calls:
        return ExtractionResult(ok=False)

    try:
        args = json.loads(message.tool_calls[0].function.arguments)
        return ExtractionResult(ok=True, value=args["value"])
    except (json.JSONDecodeError, KeyError):
        return ExtractionResult(ok=False)


def _fallback_extract(field: Field, user_message: str) -> ExtractionResult:
    text = user_message.strip()
    if not text:
        return ExtractionResult(ok=False)

    if field["type"] == "boolean":
        lowered = text.lower()
        if lowered in ("yes", "y", "yeah", "yep", "sure", "true"):
            return ExtractionResult(ok=True, value=True)
        if lowered in ("no", "n", "nope", "false"):
            return ExtractionResult(ok=True, value=False)
        return ExtractionResult(ok=False)

    if field["type"] == "enum":
        lowered = text.lower().replace(" ", "_").replace("-", "_")
        for candidate in field["enum_values"]:
            if candidate in lowered or lowered in candidate:
                return ExtractionResult(ok=True, value=candidate)
        return ExtractionResult(ok=False)

    if field["type"] == "email":
        if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", text):
            return ExtractionResult(ok=True, value=text)
        return ExtractionResult(ok=False)

    return ExtractionResult(ok=True, value=text)
