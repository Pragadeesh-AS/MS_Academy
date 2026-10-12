// Sends one email through the Google Apps Script email webhook (GAS_WEBHOOK_URL - see
// apps-script/EmailWebhook.gs). The script answers HTTP 200 even when sending fails, so an email only
// counts as sent when the reply is { status: 'success' }. Resolves true / false, never throws.
const sendWebhookEmail = async (webhookUrl, { to, subject, html }) => {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ to_email: to, subject, message_html: html }),
    });
    const result = await res.json().catch(() => null);
    if (result && result.status === 'success') return true;
    console.error('Email failed for', to, (result && result.message) || `HTTP ${res.status}`);
    return false;
  } catch (err) {
    console.error('Email failed for', to, err);
    return false;
  }
};

// Same email to each address separately (no shared recipient list), 10 at a time. Returns how many went out.
const sendWebhookEmailToEach = async (webhookUrl, emails, { subject, html }) => {
  let sent = 0;
  for (let i = 0; i < emails.length; i += 10) {
    const results = await Promise.all(emails.slice(i, i + 10).map(to => sendWebhookEmail(webhookUrl, { to, subject, html })));
    sent += results.filter(Boolean).length;
  }
  return sent;
};

module.exports = { sendWebhookEmail, sendWebhookEmailToEach };
