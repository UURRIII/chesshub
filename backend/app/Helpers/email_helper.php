<?php

/**
 * Helper d'enviament d'emails per a ChessHub.
 *
 * Usa l'API HTTP transaccional de Brevo (https://brevo.com).
 * Les credencials es llegeixen de variables d'entorn:
 *   BREVO_API_KEY       — clau d'API (comença per "xkeysib-")
 *   BREVO_SENDER_EMAIL  — adreça remitent verificada a Brevo
 *   BREVO_SENDER_NAME   — nom remitent (opcional)
 *
 * Si BREVO_API_KEY no està configurada, l'enviament no es fa i es
 * registra l'incident al log (mode fallback, no bloqueja el flux).
 */

if (!function_exists('send_email')) {
    function send_email(string $toEmail, string $toName, string $subject, string $htmlContent): bool
    {
        $apiKey      = getenv('BREVO_API_KEY')      ?: '';
        $senderEmail = getenv('BREVO_SENDER_EMAIL') ?: 'no-reply@chesshub.cat';
        $senderName  = getenv('BREVO_SENDER_NAME')  ?: 'ChessHub';

        if ($apiKey === '') {
            log_message('warning', "[email] BREVO_API_KEY no configurada. Email NO enviat a {$toEmail} (assumpte: {$subject}).");
            return false;
        }

        $payload = json_encode([
            'sender'      => ['name' => $senderName, 'email' => $senderEmail],
            'to'          => [['email' => $toEmail, 'name' => $toName ?: $toEmail]],
            'subject'     => $subject,
            'htmlContent' => $htmlContent,
        ]);

        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'accept: application/json',
                'content-type: application/json',
                'api-key: ' . $apiKey,
            ],
            CURLOPT_TIMEOUT        => 12,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return true;
        }

        log_message('error', "[email] Brevo ha retornat HTTP {$httpCode}: {$response}");
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
