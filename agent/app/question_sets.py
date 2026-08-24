"""
Deterministic per-service question flows. Structured data, now backed by
the `chat_questions`/`chat_question_options` tables (migrations 013/014)
instead of static Python dicts — franchisor/super_admin manage services
and questions through the dashboard (web/src/lib/db/chat-services.ts),
tunable without a redeploy. `agent/app/db.py`'s `get_questions_for_service`
builds the `Field` dicts this module's functions operate on.

Each field has:
  key         - name the answer is stored under (top-level leads column,
                or a key inside leads.details for service-specific fields)
  prompt      - base question text; OpenAI only rephrases this, it doesn't
                invent questions
  type        - drives the tool-calling extraction schema: "text" | "email"
                | "phone" | "boolean" | "enum"
  enum_values - required when type == "enum"; the stored option values
  enum_labels - optional dict of value -> human-friendly label, used by
                openai_helper.py to give extraction more than a bare slug
                to match a visitor's free text against
  lead_field  - if set, this answer goes on leads.<lead_field> directly
                instead of into leads.details
  depends_on  - optional; if set, this field is only ever asked (and only
                ever appears in leads.details) when the referenced earlier
                field's answer matches. Must reference an earlier enum or
                boolean field in the same question list — dependencies
                aren't resolved out of order, and only fields with a small
                closed set of possible answers make sense as a branch
                condition.
"""

from typing import Any, Literal, TypedDict


class DependsOn(TypedDict, total=False):
    field: str  # key of the earlier field this one is conditional on
    equals: Any  # answer must equal this exact value
    one_of: list[Any]  # answer must be one of these values


class Field(TypedDict, total=False):
    key: str
    prompt: str
    type: Literal["text", "email", "phone", "boolean", "enum"]
    enum_values: list[str]
    enum_labels: dict[str, str]
    lead_field: str
    depends_on: DependsOn


def _dependency_met(field: Field, answers: dict[str, Any]) -> bool:
    dep = field.get("depends_on")
    if dep is None:
        return True
    value = answers.get(dep["field"])
    if "equals" in dep:
        return value == dep["equals"]
    if "one_of" in dep:
        return value in dep["one_of"]
    return True


def next_pending_field(question_set: list[Field], answers: dict[str, Any]) -> Field | None:
    """
    First field that hasn't been answered yet and whose depends_on (if any)
    is satisfied by the answers so far — a field whose dependency is never
    met is permanently skipped, not just deferred. The single place this
    conditional-skip logic lives; chat.py always goes through this rather
    than indexing into the list directly.
    """
    for field in question_set:
        if field["key"] in answers:
            continue
        if not _dependency_met(field, answers):
            continue
        return field
    return None
