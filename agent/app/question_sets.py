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
"""

from typing import Literal, TypedDict


class Field(TypedDict, total=False):
    key: str
    prompt: str
    type: Literal["text", "email", "phone", "boolean", "enum"]
    enum_values: list[str]
    lead_field: str


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

SERVICE_SPECIFIC_FIELDS: dict[str, list[Field]] = {
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
}


def get_question_set(service_key: str) -> list[Field]:
    return SERVICE_SPECIFIC_FIELDS[service_key] + COMMON_CLOSING_FIELDS
