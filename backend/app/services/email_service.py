import asyncio
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import mimetypes
import smtplib

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


def send_email_sync(
    to_email: str,
    subject: str,
    html_content: str,
    attachments: list[tuple[str, bytes, str | None]] | None = None,
) -> bool:
    """Envío síncrono usando smtplib nativo con soporte de adjuntos binarios y fallback a consola."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        att_count = len(attachments) if attachments else 0
        print(f"\n[EMAIL SIMULADO - Sin credenciales SMTP]\nPara: {to_email}\nAsunto: {subject}\nHTML generado correctamente. Adjuntos: {att_count}")
        return True

    try:
        if attachments:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["To"] = to_email

            alt_part = MIMEMultipart("alternative")
            alt_part.attach(MIMEText(html_content, "html", "utf-8"))
            msg.attach(alt_part)

            for filename, file_bytes, ctype in attachments:
                if file_bytes:
                    content_type = ctype or mimetypes.guess_type(filename)[0] or "application/octet-stream"
                    maintype, subtype = content_type.split("/", 1) if "/" in content_type else ("application", "octet-stream")
                    part = MIMEBase(maintype, subtype)
                    part.set_payload(file_bytes)
                    encoders.encode_base64(part)
                    part.set_param("name", filename)
                    part.add_header("Content-Disposition", "attachment", filename=filename)
                    part.add_header("Content-ID", f"<{filename}>")
                    part.add_header("X-Attachment-Id", filename)
                    msg.attach(part)
        else:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["To"] = to_email

            part = MIMEText(html_content, "html", "utf-8")
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


def generate_thank_you_html(athlete_name: str, athlete_handle: str, shakes_count: int, thank_you_message: str | None) -> str:
    custom_msg = thank_you_message if thank_you_message else "¡Muchas gracias por tu apoyo y por ser parte de mi camino deportivo!"
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Gracias por tu apoyo! - Buymeashake.fit</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090c0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 40px auto; background-color: #121614; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        
        <!-- Header con Logo -->
        <tr>
          <td align="center" style="padding: 36px 24px 20px 24px;">
            <div style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 900; font-size: 20px; padding: 10px 14px; border-radius: 16px; margin-bottom: 12px;">
              
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
              ¡{athlete_name} te agradece tus {shakes_count} Shakes!
            </h2>
            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
              Tu donación ha sido recibida exitosamente e impulsa directamente la carrera deportiva de @{athlete_handle}.
            </p>

            <!-- Nota Personalizada del Atleta -->
            <div style="background-color: #1a221a; border-left: 4px solid #c9ff3d; border-radius: 12px; padding: 18px 20px; margin: 0 auto 28px auto; text-align: left;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #c9ff3d;">
                Mensaje de {athlete_name}:
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff; font-style: italic;">
                "{custom_msg}"
              </p>
            </div>

            <!-- Botón Visitar Perfil -->
            <a href="https://buymeashake.fit/{athlete_handle}" style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 28px; border-radius: 9999px;">
              Ver perfil de @{athlete_handle}
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: #0d110f; border-top: 1px solid rgba(255,255,255,0.05);">
            <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
              © 2026 Buymeashake.fit · Gracias por impulsar el deporte
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


async def send_thank_you_email(to_email: str, athlete_name: str, athlete_handle: str, shakes_count: int, thank_you_message: str | None) -> bool:
    """Envía el email de agradecimiento al donante tras completar el pago."""
    subject = f"¡{athlete_name} te agradece tus {shakes_count} Shakes en Buymeashake.fit!"
    html = generate_thank_you_html(athlete_name, athlete_handle, shakes_count, thank_you_message)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, send_email_sync, to_email, subject, html)


def generate_compliance_report_html(
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
    description: str,
    evidence_links: list[str] | None = None,
    attached_file: str | None = None,
    reporter_email: str = "Confidencial",
    created_at: str | None = None,
) -> str:
    links_html = ""
    if evidence_links and any(link.strip() for link in evidence_links if link):
        clean_links = [link.strip() for link in evidence_links if link and link.strip()]
        items = "".join(f'<li><a href="{l}" style="color: #c9ff3d; text-decoration: underline;" target="_blank">{l}</a></li>' for l in clean_links)
        links_html = f"""
        <div style="margin-top: 14px; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px;">Enlaces aportados:</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #d4d4d8; line-height: 1.6;">
            {items}
          </ul>
        </div>
        """

    attachment_html = ""
    if attached_file:
        is_image = any(attached_file.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"])
        preview_markup = ""
        if is_image:
            preview_markup = f"""
            <div style="margin-top: 10px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); text-align: center; background-color: #0b0e0c; padding: 10px;">
              <img src="cid:{attached_file}" style="max-width: 100%; max-height: 420px; height: auto; border-radius: 8px; display: inline-block;" alt="{attached_file}" />
            </div>
            """
        attachment_html = f"""
        <div style="margin-top: 14px; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px;">Archivo / Captura adjunta:</p>
          <div style="background-color: #191c1d; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; display: block;">
            <div style="font-size: 13px; font-weight: 700; color: #ffffff;">
              [Adjunto descargable] <span style="color: #c9ff3d;">{attached_file}</span>
            </div>
            {preview_markup}
          </div>
        </div>
        """

    time_str = created_at if created_at else "Fecha y hora de recepción automática"

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo Reporte de Cumplimiento {folio} - Buymeashake.fit</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090c0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #121614; border-radius: 24px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
        
        <!-- Header con Alerta de Compliance -->
        <tr>
          <td style="padding: 28px 32px 20px 32px; background: linear-gradient(180deg, #1b241e 0%, #121614 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
            <table width="100%">
              <tr>
                <td>
                  <span style="display: inline-block; background-color: rgba(255,90,44,0.15); border: 1px solid rgba(255,90,44,0.35); color: #ff5a2c; font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                    Notificación de Moderación
                  </span>
                  <h1 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                    Nuevo Reporte de Conducta o Contenido
                  </h1>
                </td>
                <td align="right" valign="top">
                  <div style="font-family: monospace; font-size: 13px; font-weight: 800; background-color: #c9ff3d; color: #070a08; padding: 6px 12px; border-radius: 8px;">
                    {folio}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Resumen del Reporte -->
        <tr>
          <td style="padding: 24px 32px 10px 32px;">
            <table width="100%" style="background-color: #161b18; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); padding: 16px;">
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa; width: 38%;">Atleta / Creador denunciado:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 800; color: #ffffff;">
                  <span style="color: #c9ff3d;">@{creator_target.replace('buymeashake.fit/@', '').replace('@', '')}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Motivo seleccionado:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 700; color: #ffffff;">
                  <span style="display: inline-block; background-color: rgba(201,255,61,0.15); color: #c9ff3d; font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">[{reason_code}]</span>
                  {reason_title}
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Correo denunciante:</td>
                <td style="padding: 6px 8px; font-size: 13px; color: #d4d4d8;">
                  {reporter_email} <span style="font-size: 10px; color: #71717a;">(Confidencial)</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Fecha de registro:</td>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">
                  {time_str}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Descripción del Incidente -->
        <tr>
          <td style="padding: 16px 32px;">
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px;">
              Descripción detallada de la denuncia:
            </p>
            <div style="background-color: #191e1b; border-left: 4px solid #c9ff3d; border-radius: 12px; padding: 16px 18px; font-size: 13px; line-height: 1.6; color: #f4f4f5; white-space: pre-wrap;">
{description}
            </div>

            {links_html}
            {attachment_html}
          </td>
        </tr>

        <!-- Protocolo de Moderación -->
        <tr>
          <td style="padding: 10px 32px 28px 32px;">
            <div style="background-color: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 18px; text-align: left;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase;">
                Protocolo Operativo de Integridad:
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                1. Revisar si la cuenta posee historial de reportes previos.<br>
                2. Si el motivo involucra sustancias prohibidas (EAA/SARMs) o peligro de salud, proceder a suspensión cautelar temporal.<br>
                3. Notificar la resolución al denunciante preservando siempre el anonimato.
              </p>
            </div>

            <!-- Botones de Acción -->
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://buymeashake.fit/{creator_target.replace('buymeashake.fit/@', '').replace('@', '')}" style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 12px 24px; border-radius: 9999px; margin-right: 8px;">
                Ver Perfil del Atleta →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: #0a0d0b; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
              © 2026 Buymeashake.fit · Mesa de Confianza, Integridad y Cumplimiento
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


def send_compliance_report_sync(
    to_email: str,
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
    description: str,
    evidence_links: list[str] | None = None,
    attached_file: str | None = None,
    reporter_email: str = "Confidencial",
    attached_file_bytes: bytes | None = None,
    attached_file_type: str | None = None,
) -> bool:
    """Envía la notificación del reporte formal al equipo de compliance con adjunto físico descargable."""
    subject = f"[Reporte {folio}] Denuncia contra @{creator_target.replace('buymeashake.fit/@', '').replace('@', '')} - [{reason_code}]"
    html = generate_compliance_report_html(
        folio=folio,
        creator_target=creator_target,
        reason_code=reason_code,
        reason_title=reason_title,
        description=description,
        evidence_links=evidence_links,
        attached_file=attached_file,
        reporter_email=reporter_email,
    )
    attachments = []
    if attached_file and attached_file_bytes:
        attachments.append((attached_file, attached_file_bytes, attached_file_type))

    return send_email_sync(to_email, subject, html, attachments=attachments if attachments else None)


async def send_compliance_report_email(
    to_email: str,
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
    description: str,
    evidence_links: list[str] | None = None,
    attached_file: str | None = None,
    reporter_email: str = "Confidencial",
    attached_file_bytes: bytes | None = None,
    attached_file_type: str | None = None,
) -> bool:
    """Envía el reporte formal de manera asíncrona."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        send_compliance_report_sync,
        to_email,
        folio,
        creator_target,
        reason_code,
        reason_title,
        description,
        evidence_links,
        attached_file,
        reporter_email,
        attached_file_bytes,
        attached_file_type,
    )


def generate_reporter_confirmation_html(
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
) -> str:
    clean_target = creator_target.replace('buymeashake.fit/@', '').replace('@', '').strip()
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acuse de recibo de reporte {folio} - Buymeashake.fit</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090c0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 30px auto; background-color: #121614; border-radius: 24px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
        
        <!-- Header -->
        <tr>
          <td style="padding: 30px 32px 20px 32px; background: linear-gradient(180deg, #1b241e 0%, #121614 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
            <table width="100%">
              <tr>
                <td>
                  <span style="display: inline-block; background-color: rgba(201,255,61,0.15); border: 1px solid rgba(201,255,61,0.35); color: #c9ff3d; font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                    Acuse de Recibo Confidencial
                  </span>
                  <h1 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                    Hemos recibido tu reporte
                  </h1>
                </td>
                <td align="right" valign="top">
                  <div style="font-family: monospace; font-size: 13px; font-weight: 800; background-color: #c9ff3d; color: #070a08; padding: 6px 12px; border-radius: 8px;">
                    {folio}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Mensaje de confirmación -->
        <tr>
          <td style="padding: 24px 32px 16px 32px;">
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
              Gracias por colaborar en mantener a la comunidad de <strong>Buymeashake</strong> limpia, segura y profesional. Tu reporte ha quedado registrado con éxito bajo estricta confidencialidad.
            </p>

            <table width="100%" style="background-color: #161b18; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); padding: 16px;">
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa; width: 40%;">Perfil reportado:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 800; color: #ffffff;">
                  <span style="color: #c9ff3d;">@{clean_target}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Motivo reportado:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 700; color: #ffffff;">
                  <span style="display: inline-block; background-color: rgba(201,255,61,0.15); color: #c9ff3d; font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">[{reason_code}]</span>
                  {reason_title}
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Estatus:</td>
                <td style="padding: 6px 8px; font-size: 12px; font-weight: 700; color: #ffab00;">
                  En revisión por Moderación y Compliance
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Próximos pasos -->
        <tr>
          <td style="padding: 10px 32px 24px 32px;">
            <div style="background-color: #191e1b; border-left: 4px solid #c9ff3d; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #d4d4d8;">
              <p style="margin: 0 0 6px 0; font-weight: 800; color: #ffffff;">¿Qué sucede a continuación?</p>
              Nuestro equipo revisará las evidencias adjuntas en un plazo estimado de 24 a 48 horas hábiles. En caso de requerir información complementaria o de resolver medidas cautelares, nos pondremos en contacto a través de este correo de forma privada.
            </div>

            <!-- Botón Volver -->
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://buymeashake.fit" style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 12px 24px; border-radius: 9999px;">
                Ir a Buymeashake.fit →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: #0a0d0b; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
              © 2026 Buymeashake.fit · BDER Communications and Technologies · Soporte: bdercommunications@gmail.com
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


def send_reporter_confirmation_sync(
    to_email: str,
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
) -> bool:
    """Envía el acuse de recibo de la denuncia al usuario."""
    subject = f"[Folio {folio}] Hemos recibido tu reporte en Buymeashake.fit"
    html = generate_reporter_confirmation_html(
        folio=folio,
        creator_target=creator_target,
        reason_code=reason_code,
        reason_title=reason_title,
    )
    return send_email_sync(to_email, subject, html)


async def send_reporter_confirmation_email(
    to_email: str,
    folio: str,
    creator_target: str,
    reason_code: str,
    reason_title: str,
) -> bool:
    """Envía el acuse de recibo de manera asíncrona."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        send_reporter_confirmation_sync,
        to_email,
        folio,
        creator_target,
        reason_code,
        reason_title,
    )


def generate_report_verdict_html(
    folio: str,
    creator_target: str,
    verdict: str,  # 'action_taken' | 'dismissed' | 'warning'
    verdict_title: str,
    admin_notes: str,
    action_details: str | None = None,
    created_at: str | None = None,
) -> str:
    clean_target = creator_target.replace('buymeashake.fit/@', '').replace('@', '').strip()
    is_action_taken = verdict in ("action_taken", "sanctioned", "approved")
    is_warning = verdict == "warning"

    if is_action_taken:
        badge_bg = "rgba(201, 255, 61, 0.15)"
        badge_border = "rgba(201, 255, 61, 0.4)"
        badge_color = "#c9ff3d"
        badge_text = "RESOLUCIÓN: INFRACCIÓN CONFIRMADA"
        status_tag = "Medidas Disciplinarias Aplicadas"
        status_color = "#c9ff3d"
        banner_border = "#c9ff3d"
    elif is_warning:
        badge_bg = "rgba(255, 171, 0, 0.15)"
        badge_border = "rgba(255, 171, 0, 0.4)"
        badge_color = "#ffab00"
        badge_text = "RESOLUCIÓN: ADVERTENCIA FORMAL EMITIDA"
        status_tag = "Amonestación con Cautela"
        status_color = "#ffab00"
        banner_border = "#ffab00"
    else:
        badge_bg = "rgba(161, 161, 170, 0.15)"
        badge_border = "rgba(161, 161, 170, 0.3)"
        badge_color = "#a1a1aa"
        badge_text = "RESOLUCIÓN: CASO REVISADO Y CERRADO"
        status_tag = "Sin Infracción Detectada / Evidencia Insuficiente"
        status_color = "#94a3b8"
        banner_border = "#71717a"

    action_box_html = ""
    if action_details:
        action_box_html = f"""
        <div style="margin-top: 14px; background-color: #191e1b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 18px;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px;">
            Medidas disciplinarias tomadas:
          </p>
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff;">
            {action_details}
          </p>
        </div>
        """

    time_str = created_at if created_at else "Resolución oficial de moderación"

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resolución del Reporte {folio} - Buymeashake.fit</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090c0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 30px auto; background-color: #121614; border-radius: 24px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
        
        <!-- Header de Resolución -->
        <tr>
          <td style="padding: 30px 32px 20px 32px; background: linear-gradient(180deg, #1b241e 0%, #121614 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
            <table width="100%">
              <tr>
                <td>
                  <span style="display: inline-block; background-color: {badge_bg}; border: 1px solid {badge_border}; color: {badge_color}; font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                    {badge_text}
                  </span>
                  <h1 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                    {verdict_title}
                  </h1>
                </td>
                <td align="right" valign="top">
                  <div style="font-family: monospace; font-size: 13px; font-weight: 800; background-color: #c9ff3d; color: #070a08; padding: 6px 12px; border-radius: 8px;">
                    {folio}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Resumen del Caso -->
        <tr>
          <td style="padding: 24px 32px 12px 32px;">
            <table width="100%" style="background-color: #161b18; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); padding: 16px;">
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa; width: 38%;">Perfil involucrado:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 800; color: #ffffff;">
                  <span style="color: #c9ff3d;">@{clean_target}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Veredicto de moderación:</td>
                <td style="padding: 6px 8px; font-size: 13px; font-weight: 800; color: {status_color};">
                  {status_tag}
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">Fecha de dictamen:</td>
                <td style="padding: 6px 8px; font-size: 12px; color: #a1a1aa;">
                  {time_str}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dictamen / Notas del Administrador -->
        <tr>
          <td style="padding: 12px 32px 20px 32px;">
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.5px;">
              Fundamento y Conclusión del Equipo de Integridad:
            </p>
            <div style="background-color: #191e1b; border-left: 4px solid {banner_border}; border-radius: 12px; padding: 16px 18px; font-size: 13px; line-height: 1.6; color: #f4f4f5; white-space: pre-wrap;">
{admin_notes}
            </div>

            {action_box_html}
          </td>
        </tr>

        <!-- Mensaje de Cierre y Políticas -->
        <tr>
          <td style="padding: 10px 32px 28px 32px;">
            <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 18px;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase;">
                Compromiso de Fair Play y Confianza
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                En Buymeashake investigamos cada reporte de forma independiente. Si consideras que dispones de nueva evidencia determinante que deba ser reevaluada, puedes responder a este correo citando el número de folio.
              </p>
            </div>

            <!-- Botón Ir a la Plataforma -->
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://buymeashake.fit" style="display: inline-block; background-color: #c9ff3d; color: #070a08; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 12px 26px; border-radius: 9999px;">
                Volver a Buymeashake.fit →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: #0a0d0b; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="margin: 0; font-size: 11px; color: #52525b; font-weight: 500;">
              © 2026 Buymeashake.fit · Mesa de Cumplimiento BDER Communications · Soporte: bdercommunications@gmail.com
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


def send_report_verdict_sync(
    to_email: str,
    folio: str,
    creator_target: str,
    verdict: str,
    verdict_title: str,
    admin_notes: str,
    action_details: str | None = None,
) -> bool:
    """Envía la resolución o veredicto de un reporte al denunciante."""
    status_label = "Infracción Confirmada" if verdict in ("action_taken", "sanctioned", "approved") else "Caso Concluido"
    subject = f"[Resolución {folio}] Actualización de tu reporte contra @{creator_target.replace('buymeashake.fit/@', '').replace('@', '')} - {status_label}"
    html = generate_report_verdict_html(
        folio=folio,
        creator_target=creator_target,
        verdict=verdict,
        verdict_title=verdict_title,
        admin_notes=admin_notes,
        action_details=action_details,
    )
    return send_email_sync(to_email, subject, html)


async def send_report_verdict_email(
    to_email: str,
    folio: str,
    creator_target: str,
    verdict: str,
    verdict_title: str,
    admin_notes: str,
    action_details: str | None = None,
) -> bool:
    """Envía la resolución del reporte de forma asíncrona."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        send_report_verdict_sync,
        to_email,
        folio,
        creator_target,
        verdict,
        verdict_title,
        admin_notes,
        action_details,
    )



