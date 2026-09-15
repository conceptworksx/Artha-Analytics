import os
import httpx
from core.logging import get_logger
from core.exceptions import EmailDeliveryError

logger = get_logger(__name__)


class EmailService:
    def __init__(self):
        self.brevo_api_key = os.getenv("BREVO_API_KEY")
        self.sender_email = os.getenv("SENDER_EMAIL", "arthaanalytics.co@gmail.com")
        self.sender_name = os.getenv("SENDER_NAME", "Artha Analytics")
        self.logo_url = os.getenv("APP_LOGO_URL")

    def _generate_html_body(self, otp_code: str) -> str:
        if self.logo_url:
            logo_html = f'<img src="{self.logo_url}" alt="{self.sender_name}" width="180" style="display: block; margin: 0 auto 20px auto; border: 0; outline: none; text-decoration: none;" />'
        else:
            logo_html = f"""
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">{self.sender_name}</div>
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #d4a84c; vertical-align: middle;"></span>
                <span style="font-size: 9.5px; font-weight: 700; color: #d4a84c; font-family: 'Courier New', Courier, monospace; letter-spacing: 1.8px; text-transform: uppercase; vertical-align: middle;">MULTI-AGENT AI. SINGULAR MARKET EDGE.</span>
              </div>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #09090b; margin: 0; padding: 30px 12px; -webkit-font-smoothing: antialiased; }}
            .container {{ max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08); overflow: hidden; position: relative; }}
            .gold-bar {{ height: 4px; background: linear-gradient(90deg, #d4a84c, #f59e0b, #d4a84c); margin: -36px -28px 28px -28px; }}
            .title {{ font-size: 18px; font-weight: 700; color: #09090b; margin-bottom: 8px; letter-spacing: -0.02em; }}
            .desc {{ font-size: 13px; color: #71717a; line-height: 1.5; margin-bottom: 24px; max-width: 360px; margin-left: auto; margin-right: auto; }}
            .otp-container {{ background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #f59e0b; text-shadow: 0 0 10px rgba(245, 158, 11, 0.3); margin-left: 12px; }}
            .timer-badge {{ font-size: 12px; font-weight: 600; color: #d97706; background: #fef3c7; border: 1px solid #fde68a; border-radius: 20px; padding: 6px 16px; display: inline-block; margin-bottom: 24px; }}
            .footer {{ font-size: 11px; color: #a1a1aa; border-top: 1px solid #f4f4f5; padding-top: 20px; margin-top: 20px; line-height: 1.6; }}
            .tagline {{ font-size: 9px; font-family: monospace; color: #d4a84c; letter-spacing: 1.5px; margin-top: 6px; font-weight: 600; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="gold-bar"></div>
            {logo_html}
            <div class="title">Verify Your Email Address</div>
            <div class="desc">Please use the verification code below to complete your registration on {self.sender_name}:</div>
            <div class="otp-container">
              <span class="otp-code">{otp_code}</span>
            </div>
            <br />
            <div class="timer-badge">⏱️ Code expires in <strong>5 minutes</strong></div>
            <div class="footer">
              <div>If you did not request this account registration, please ignore this email.</div>
              <div class="tagline">SECURED TRANSACTIONAL EMAIL · ARTHA ANALYTICS</div>
            </div>
          </div>
        </body>
        </html>
        """

    async def send_otp_email(self, recipient_email: str, otp_code: str) -> None:
        html_body = self._generate_html_body(otp_code)

        is_placeholder = (
            not self.brevo_api_key
            or "xxxx" in self.brevo_api_key.lower()
            or "your_" in self.brevo_api_key.lower()
        )
        if is_placeholder:
            logger.info(
                f"[EmailService - Local Dev] Valid BREVO_API_KEY not configured. OTP for {recipient_email} is: [{otp_code}]"
            )
            return

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": self.brevo_api_key,
            "accept": "application/json",
            "content-type": "application/json",
        }
        sender_addr = self.sender_email
        if "<" in sender_addr:
            sender_addr = sender_addr.split("<")[-1].rstrip(">").strip()

        payload = {
            "sender": {
                "name": self.sender_name,
                "email": sender_addr,
            },
            "to": [{"email": recipient_email}],
            "subject": f"{otp_code} is your Artha Analytics Verification Code",
            "htmlContent": html_body,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code not in (200, 201):
                    logger.error(
                        f"[EmailService] Brevo API error ({resp.status_code}): {resp.text}"
                    )
                    raise EmailDeliveryError(
                        f"Failed to deliver verification email via Brevo API ({resp.status_code}). Please ensure '{sender_addr}' is verified in Brevo Dashboard -> Senders."
                    )
                logger.info(
                    f"[EmailService] Sent OTP verification email via Brevo REST API (HTTPS :443) to {recipient_email}"
                )
        except EmailDeliveryError:
            raise
        except Exception as e:
            logger.error(
                f"[EmailService] Unexpected error connecting to Brevo API: {e}"
            )
            raise EmailDeliveryError(
                "Unable to reach verification email provider. Please try again in a few moments."
            )
