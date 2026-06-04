"""
Pluggable email provider for transactional sends (password reset, etc.).

Provider auto-selected at first use, in this priority order:

  1. SendGrid HTTP API
       - SENDGRID_API_KEY
       - EMAIL_FROM           (default: "ManyMinds <no-reply@manyminds.local>")

  2. SMTP (works with Postmark, Mailgun, Resend SMTP, Gmail App Passwords, etc.)
       - SMTP_HOST
       - SMTP_PORT            (default: 587)
       - SMTP_USER
       - SMTP_PASSWORD
       - SMTP_STARTTLS        (default: true)
       - SMTP_USE_SSL         (default: false — SMTPS on port 465)
       - EMAIL_FROM

  3. Console (dev fallback)
       - no config required. The full email (To/Subject/Body) is logged to
         stdout so password-reset still works end-to-end against any local
         setup — copy the link from the backend logs.

All providers expose the same async `send(to, subject, text, html=None)`
interface. They never raise from inside the request handler: failures are
logged, and the auth router treats `send` returning False as "we tried;
return 204 anyway so we don't leak which emails exist."
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailProvider(ABC):
    name: str = "unknown"

    @abstractmethod
    async def send(
        self,
        *,
        to: str,
        subject: str,
        text: str,
        html: str | None = None,
    ) -> bool:
        """Return True on success, False otherwise (never raise)."""


class ConsoleEmailProvider(EmailProvider):
    """No-op provider: logs the message instead of sending it.

    This exists so password reset is END-TO-END operable on any dev machine,
    even without an SMTP server. Copy the reset link from the backend logs.
    """

    name = "console"

    async def send(
        self,
        *,
        to: str,
        subject: str,
        text: str,
        html: str | None = None,  # noqa: ARG002
    ) -> bool:
        banner = "─" * 72
        logger.warning(
            "\n%s\n[EMAIL — console provider, not actually sent]\n"
            "From:    %s\nTo:      %s\nSubject: %s\n\n%s\n%s",
            banner,
            settings.EMAIL_FROM,
            to,
            subject,
            text,
            banner,
        )
        return True


class SendGridEmailProvider(EmailProvider):
    """HTTP-based SendGrid v3 client.

    Requires:
        SENDGRID_API_KEY        from the SendGrid dashboard
        EMAIL_FROM              the verified sender identity

    Endpoint: POST https://api.sendgrid.com/v3/mail/send
    """

    name = "sendgrid"

    async def send(
        self,
        *,
        to: str,
        subject: str,
        text: str,
        html: str | None = None,
    ) -> bool:
        if not settings.SENDGRID_API_KEY:
            return False
        from_name, from_email = _split_from(settings.EMAIL_FROM)
        payload: dict[str, Any] = {
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": from_email, "name": from_name},
            "subject": subject,
            "content": [{"type": "text/plain", "value": text}],
        }
        if html:
            payload["content"].append({"type": "text/html", "value": html})
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if res.status_code in (200, 202):
                return True
            logger.warning(
                "SendGrid send failed: status=%s body=%s",
                res.status_code,
                res.text[:200],
            )
            return False
        except Exception as exc:  # noqa: BLE001
            logger.warning("SendGrid send raised: %s", exc)
            return False


class SmtpEmailProvider(EmailProvider):
    """SMTP via aiosmtplib.

    Works with any standards-compliant transactional SMTP service
    (Postmark, Mailgun, Sendinblue, Resend, Amazon SES, Gmail SMTP,
    Office 365, etc.).

    Required:
        SMTP_HOST       e.g. smtp.postmarkapp.com / smtp.gmail.com
        SMTP_USER       username / API key user / email address
        SMTP_PASSWORD   password / API key
    Optional:
        SMTP_PORT       default 587
        SMTP_STARTTLS   default true   (turn off only for unencrypted local)
        SMTP_USE_SSL    default false  (set true + SMTP_PORT=465 for SMTPS)
        EMAIL_FROM      formatted as "Name <addr@host>"
    """

    name = "smtp"

    async def send(
        self,
        *,
        to: str,
        subject: str,
        text: str,
        html: str | None = None,
    ) -> bool:
        if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
            return False
        try:
            import aiosmtplib  # type: ignore
            from email.message import EmailMessage
        except ImportError:
            logger.warning("aiosmtplib not installed — install it to use SMTP")
            return False

        message = EmailMessage()
        message["From"] = settings.EMAIL_FROM
        message["To"] = to
        message["Subject"] = subject
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype="html")

        try:
            if settings.SMTP_USE_SSL:
                await aiosmtplib.send(
                    message,
                    hostname=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    username=settings.SMTP_USER,
                    password=settings.SMTP_PASSWORD,
                    use_tls=True,
                    timeout=20,
                )
            else:
                await aiosmtplib.send(
                    message,
                    hostname=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    username=settings.SMTP_USER,
                    password=settings.SMTP_PASSWORD,
                    start_tls=settings.SMTP_STARTTLS,
                    timeout=20,
                )
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("SMTP send failed: %s", exc)
            return False


def _split_from(addr: str) -> tuple[str, str]:
    """Parse "Name <email@host>" → (name, email)."""
    if "<" in addr and ">" in addr:
        name, rest = addr.split("<", 1)
        email = rest.rstrip(">").strip()
        return name.strip().strip('"'), email
    return "ManyMinds", addr.strip()


# ---------------------------------------------------------------------------
# Provider selection — picked once at process boot, then cached.
# ---------------------------------------------------------------------------

_provider: EmailProvider | None = None


def get_email_provider() -> EmailProvider:
    global _provider
    if _provider is not None:
        return _provider
    if settings.SENDGRID_API_KEY:
        _provider = SendGridEmailProvider()
    elif settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        _provider = SmtpEmailProvider()
    else:
        _provider = ConsoleEmailProvider()
        logger.info(
            "No email provider configured — falling back to console output. "
            "Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASSWORD to enable real email."
        )
    return _provider


__all__ = [
    "EmailProvider",
    "ConsoleEmailProvider",
    "SendGridEmailProvider",
    "SmtpEmailProvider",
    "get_email_provider",
]
