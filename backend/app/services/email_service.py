import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def generate_otp_html(code: str, athlete_name: str | None = None) -> str:
    target = f"a <strong>{athlete_name}</strong>" if athlete_name else "a tu atleta favorito"
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu código de acceso - Buymeashake.fit</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090c0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 40px auto; background-color: #121614; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        
        <!-- Header con Logo -->
        <tr>
          <td align="center" style="padding: 36px 24px 20px 24px;">
            <div style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 900; font-size: 20px; padding: 10px 14px; border-radius: 16px; margin-bottom: 12px;">
              🥤
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
              buymeashake<span style="color: #c9ff3d;">.fit</span>
            </h1>
          </td>
        </tr>

        <!-- Contenido Central -->
        <tr>
          <td align="center" style="padding: 10px 32px 30px 32px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #ffffff;">
              Tu código de verificación
            </h2>
            <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
              Ingresa el siguiente código de 6 dígitos para confirmar tu correo y comenzar a seguir {target}.
            </p>

            <!-- Box del Código OTP -->
            <div style="background-color: #191c1d; border: 2px dashed #c9ff3d; border-radius: 18px; padding: 20px 10px; margin: 0 auto; max-width: 320px; text-align: center;">
              <span style="font-family: 'SF Pro Display', -apple-system, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #c9ff3d;">
                {code}
              </span>
            </div>

            <p style="margin: 24px 0 0 0; font-size: 11px; color: #71717a;">
              Este código expirará en <strong>15 minutos</strong>. Si no solicitaste este acceso, puedes ignorar este correo.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: #0d110f; border-top: 1px solid rgba(255,255,255,0.05);">
            <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
              © 2026 Buymeashake.fit · La plataforma de monetización para atletas
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


def send_email_sync(to_email: str, subject: str, html_content: str) -> bool:
    """Envío síncrono usando smtplib nativo con fallback a consola."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"\n[EMAIL SIMULADO - Sin credenciales SMTP]\nPara: {to_email}\nAsunto: {subject}\nHTML generado correctamente.")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
            print(f"[EMAIL ENVIADO CON ÉXITO VÍA SMTP] -> {to_email}")
            return True
    except Exception as e:
        print(f"[ERROR ENVIANDO EMAIL SMTP]: {e}")
        return False


async def send_otp_email(to_email: str, code: str, athlete_name: str | None = None) -> bool:
    """Envía el email OTP de forma asíncrona usando un hilo de trabajo."""
    subject = f"{code} es tu código de verificación para Buymeashake.fit"
    html = generate_otp_html(code, athlete_name)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, send_email_sync, to_email, subject, html)
