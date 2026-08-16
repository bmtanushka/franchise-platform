"""
Deterministic per-service question flows. Structured data, not prompts —
tunable without a redeploy if this later moves into a
`service_question_sets` table (schema is compatible: each field maps
1:1 to a row).

Each field has:
  key         - name the answer is stored under (top-level leads column,
                or a key inside leads.details for service-specific fields)
  prompt      - base question text; OpenAI only rephrases this, it doesn't
                invent questions
  type        - drives the tool-calling extraction schema: "text" | "email"
                | "phone" | "boolean" | "enum"
  enum_values - required when type == "enum"
  lead_field  - if set, this answer goes on leads.<lead_field> directly
                instead of into leads.details
  depends_on  - optional; if set, this field is only ever asked (and only
                ever appears in leads.details) when the referenced earlier
                field's answer matches. Must reference a field that comes
                *before* it in the same list — dependencies aren't
                resolved out of order.
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
    lead_field: str
    depends_on: DependsOn


# Appended to the end of every service's question set — the info needed to
# actually create and route a lead, regardless of service type.
COMMON_CLOSING_FIELDS: list[Field] = [
    {"key": "full_name", "prompt": "What's your full name?", "type": "text", "lead_field": "full_name"},
    {
        "key": "contact_email",
        "prompt": "What's the best email to reach you at?",
        "type": "email",
        "lead_field": "contact_email",
    },
    {
        "key": "contact_phone",
        "prompt": "And a phone number where we can reach you?",
        "type": "phone",
        "lead_field": "contact_phone",
    },
    {
        "key": "postcode",
        "prompt": "What's your postcode / ZIP code? This helps us match you with someone in your area.",
        "type": "text",
        "lead_field": "postcode",
    },
    {
        "key": "consent_to_contact",
        "prompt": "Do you consent to being contacted by one of our service providers about this? (yes/no)",
        "type": "boolean",
        "lead_field": "consent_to_contact",
    },
]

FRANCHISE_INTEREST_CLOSING_FIELDS: list[Field] = [
    {"key": "full_name", "prompt": "What's your full name?", "type": "text", "lead_field": "full_name"},
    {
        "key": "contact_email",
        "prompt": "What's the best email to reach you at?",
        "type": "email",
        "lead_field": "contact_email",
    },
    {
        "key": "contact_phone",
        "prompt": "And a phone number where we can reach you?",
        "type": "phone",
        "lead_field": "contact_phone",
    },
    {
        "key": "consent_to_contact",
        "prompt": "Do you consent to being contacted by our franchise development team about this?",
        "type": "boolean",
        "lead_field": "consent_to_contact",
    },
]

SERVICE_SPECIFIC_FIELDS: dict[str, list[Field]] = {
    "franchise_interest": [
        {
            "key": "interest_reason",
            "prompt": "What's drawing you to franchise ownership with us?",
            "type": "text",
        },
        {
            "key": "ownership_experience",
            "prompt": "Have you owned or managed a business before?",
            "type": "enum",
            "enum_values": ["never_owned", "managed_not_owned", "owned_before", "own_currently"],
        },
        {
            "key": "capital_readiness",
            "prompt": "Do you have investment capital ready, or are you still exploring financing options?",
            "type": "enum",
            "enum_values": ["capital_ready", "exploring_financing", "not_yet_sure"],
        },
        {
            "key": "target_timeline",
            "prompt": "What's your timeline to open — within 6 months, 6-12 months, or just researching for now?",
            "type": "enum",
            "enum_values": ["within_6_months", "6_12_months", "just_researching"],
        },
        {
            "key": "desired_operating_location",
            "prompt": "What city, region, or territory are you hoping to open a location in?",
            "type": "text",
        },
    ],
    "credit": [
        {
            "key": "credit_goal",
            "prompt": "What's the main reason you're looking to build or repair credit right now?",
            "type": "text",
        },
        {
            "key": "approximate_credit_score",
            "prompt": "Roughly how would you describe your current credit? Excellent, good, fair, poor, or not sure?",
            "type": "enum",
            "enum_values": ["excellent", "good", "fair", "poor", "not_sure"],
        },
    ],
    "mortgage": [
        {
            "key": "mortgage_purpose",
            "prompt": "Are you looking to purchase a home, refinance, or take out a home equity loan?",
            "type": "enum",
            "enum_values": ["purchase", "refinance", "home_equity"],
        },
        {"key": "property_location", "prompt": "What area or city is the property in (or where are you looking)?", "type": "text"},
        {
            "key": "estimated_price_range",
            "prompt": "What's your estimated price range or loan amount?",
            "type": "text",
        },
        {
            "key": "preapproval_status",
            "prompt": "Have you already been pre-approved, or are you just starting to look?",
            "type": "enum",
            "enum_values": ["pre_approved", "not_yet"],
            "depends_on": {"field": "mortgage_purpose", "equals": "purchase"},
        },
        {
            "key": "current_lender",
            "prompt": "Who's your current mortgage lender?",
            "type": "text",
            "depends_on": {"field": "mortgage_purpose", "equals": "refinance"},
        },
        {
            "key": "home_equity_purpose",
            "prompt": "What would you use the home equity funds for?",
            "type": "text",
            "depends_on": {"field": "mortgage_purpose", "equals": "home_equity"},
        },
    ],
    "real_estate": [
        {
            "key": "real_estate_intent",
            "prompt": "Are you looking to buy, sell, or both?",
            "type": "enum",
            "enum_values": ["buying", "selling", "both"],
        },
        {"key": "target_area", "prompt": "What area are you interested in?", "type": "text"},
        {
            "key": "timeline",
            "prompt": "What's your timeline — immediately, 1-3 months, 3-6 months, or just exploring?",
            "type": "enum",
            "enum_values": ["immediately", "1_3_months", "3_6_months", "just_exploring"],
        },
        {
            "key": "financing_status",
            "prompt": "Are you pre-approved for financing, still need financing, or paying cash?",
            "type": "enum",
            "enum_values": ["pre_approved", "need_financing", "cash"],
            "depends_on": {"field": "real_estate_intent", "one_of": ["buying", "both"]},
        },
        {
            "key": "current_property_status",
            "prompt": "For the property you're selling — do you own it outright, or is there a mortgage on it?",
            "type": "enum",
            "enum_values": ["owned_outright", "has_mortgage"],
            "depends_on": {"field": "real_estate_intent", "one_of": ["selling", "both"]},
        },
    ],
    "foreign_national_credit": [
        {"key": "country_of_origin", "prompt": "What country are you relocating from?", "type": "text"},
        {"key": "visa_status", "prompt": "What's your current visa or residency status in the US?", "type": "text"},
        {
            "key": "us_credit_history",
            "prompt": "Do you have any US credit history yet — none, some, or established?",
            "type": "enum",
            "enum_values": ["none", "some", "established"],
        },
    ],
    "business_credit": [
        {"key": "business_name", "prompt": "What's your business name?", "type": "text"},
        {
            "key": "years_in_business",
            "prompt": "How long have you been in business — not yet started, less than 1 year, 1-3 years, or 3+ years?",
            "type": "enum",
            "enum_values": ["not_yet_started", "less_than_1", "1_3", "3_plus"],
        },
        {
            "key": "funding_amount_needed",
            "prompt": "Roughly how much funding are you looking for?",
            "type": "text",
        },
    ],
}

SERVICE_LABELS: dict[str, str] = {
    "credit": "Credit facilities",
    "mortgage": "Mortgage",
    "real_estate": "Real estate",
    "foreign_national_credit": "Foreign national credit facility",
    "business_credit": "Business credit",
    # Deliberately "Franchise interest" not "Franchise Opportunity" here —
    # the deterministic local-dev fallback (no OPENAI_API_KEY) matches an
    # enum answer by substring against its label text, same as every other
    # service ("Mortgage" contains "mortgage", etc.); this keeps that
    # working without needing a smarter matcher. The DB's service_types.name
    # ("Franchise Opportunity", migration 011) is the more formal label used
    # in the dashboard and is unaffected by this.
    "franchise_interest": "Franchise interest",
}


def get_question_set(service_key: str) -> list[Field]:
    closing = FRANCHISE_INTEREST_CLOSING_FIELDS if service_key == "franchise_interest" else COMMON_CLOSING_FIELDS
    return SERVICE_SPECIFIC_FIELDS[service_key] + closing


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
