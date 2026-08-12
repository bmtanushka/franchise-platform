"""
Notifies a franchisee when the chat agent captures a new lead for their
tenant. Same graceful fallback as openai_helper's OPENAI_API_KEY handling:
if RESEND_API_KEY isn't set, this logs instead of failing, so local dev
without the key keeps working and a delivery failure never breaks the
actual lead-capture flow (see the try/except around the call site in
chat.py).
"""

import httpx

from .config import settings

RESEND_URL = "https://api.resend.com/emails"


async def _send(*, to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        print(f'[email] RESEND_API_KEY not set — would send "{subject}" to {to}')
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.resend_from_email, "to": to, "subject": subject, "html": html},
        )
        response.raise_for_status()


async def send_lead_created_email(
    to: str,
    *,
    tenant_name: str,
    full_name: str | None,
    service_label: str,
    lead_url: str,
) -> None:
    subject = f"New lead for {tenant_name}"
    html = f"""
      <p>A new lead came in for <strong>{tenant_name}</strong>:</p>
      <ul>
        <li>Contact: {full_name or "—"}</li>
        <li>Service: {service_label}</li>
      </ul>
      <p><a href="{lead_url}">View this lead</a></p>
    """
    await _send(to=to, subject=subject, html=html)
