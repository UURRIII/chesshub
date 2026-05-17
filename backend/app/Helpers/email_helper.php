<?php

/**
 * Helper d'enviament d'emails per a ChessHub.
 *
 * Envia per SMTP (per defecte, els servidors de Gmail) amb la llibreria
 * Email de CodeIgniter 4. Les credencials es llegeixen de variables
 * d'entorn:
 *   SMTP_USER       — adreça del compte SMTP (p. ex. el Gmail)
 *   SMTP_PASS       — contrasenya d'aplicació de 16 caràcters
 *   SMTP_HOST       — servidor SMTP (per defecte smtp.gmail.com)
 *   SMTP_PORT       — port SMTP (per defecte 587, STARTTLS)
 *   SMTP_FROM_NAME  — nom remitent (per defecte ChessHub)
 *
 * Si SMTP_USER / SMTP_PASS no estan configurats, l'enviament no es fa
 * i es registra al log (mode fallback, no bloqueja cap flux).
 */

if (!function_exists('send_email')) {
    function send_email(string $toEmail, string $toName, string $subject, string $htmlContent): bool
    {
        $smtpUser = getenv('SMTP_USER') ?: '';
        $smtpPass = getenv('SMTP_PASS') ?: '';
        $fromName = getenv('SMTP_FROM_NAME') ?: 'ChessHub';

        if ($smtpUser === '' || $smtpPass === '') {
            log_message('warning', "[email] SMTP no configurat. Email NO enviat a {$toEmail} (assumpte: {$subject}).");
            return false;
        }

        $config = new \Config\Email();
        $config->protocol    = 'smtp';
        $config->SMTPHost    = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $config->SMTPUser    = $smtpUser;
        $config->SMTPPass    = $smtpPass;
        $config->SMTPPort    = (int) (getenv('SMTP_PORT') ?: 587);
        $config->SMTPCrypto  = ((int) ($config->SMTPPort) === 465) ? 'ssl' : 'tls';
        $config->SMTPTimeout = 20;
        $config->mailType    = 'html';
        $config->charset     = 'UTF-8';
        $config->fromEmail   = $smtpUser;
        $config->fromName    = $fromName;

        $email = \Config\Services::email($config, false);
        $email->setFrom($smtpUser, $fromName);
        $email->setTo($toEmail);
        $email->setSubject($subject);
        $email->setMessage($htmlContent);

        if ($email->send(false)) {
            return true;
        }

        log_message('error', '[email] Error SMTP en enviar a ' . $toEmail . ': ' . $email->printDebugger(['headers']));
        return false;
    }
}

if (!function_exists('email_layout')) {
    /**
     * Embolcalla un cos de missatge amb la plantilla HTML de ChessHub.
     */
    function email_layout(string $title, string $bodyHtml): string
    {
        return '
        <div style="font-family:-apple-system,Segoe UI,sans-serif;background:#242423;padding:32px;color:#e8e8e8">
          <div style="max-width:480px;margin:0 auto;background:#2c2b29;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
            <div style="background:#81b64c;padding:20px 28px">
              <span style="font-size:20px;font-weight:700;color:#fff">&#9817; ChessHub</span>
            </div>
            <div style="padding:28px">
              <h2 style="margin:0 0 14px;color:#fff;font-size:19px">' . $title . '</h2>
              ' . $bodyHtml . '
            </div>
            <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#6a7a8a">
              ChessHub &mdash; Projecte de Síntesi DAW
            </div>
          </div>
        </div>';
    }
}

if (!function_exists('email_button')) {
    /**
     * Genera un botó d'acció per als emails.
     */
    function email_button(string $url, string $label): string
    {
        return '<a href="' . $url . '" style="display:inline-block;background:#81b64c;color:#fff;'
             . 'text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9px;margin:14px 0">'
             . $label . '</a>'
             . '<p style="font-size:12px;color:#6a7a8a;word-break:break-all">O copia aquest enllaç: ' . $url . '</p>';
    }
}
