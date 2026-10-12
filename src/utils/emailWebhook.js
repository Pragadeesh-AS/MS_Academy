// Sends one email through the Google Apps Script email webhook (VITE_GAS_WEBHOOK_URL - see
// apps-script/EmailWebhook.gs). The script answers HTTP 200 even when sending fails, so success is
// only its { status: 'success' } reply; anything else throws with the script's message.
//   attachments: [{ filename, mimeType, base64Data }]
export const sendWebhookEmail = async ({ to, subject, html, attachments }) => {
  const webhookUrl = import.meta.env.VITE_GAS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('VITE_GAS_WEBHOOK_URL is not set');
  const payload = { to_email: to, subject, message_html: html };
  if (attachments?.length) payload.attachments = attachments;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    // text/plain keeps this a "simple" request, so the browser can read the script's reply
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  let result = null;
  try { result = await response.json(); } catch { /* not JSON - handled below */ }
  if (result?.status !== 'success') {
    throw new Error(result?.message || `Email service replied ${response.status}`);
  }
};

// Sends the same email to many people one at a time in small batches (no shared recipient list).
// Returns how many actually went out.
export const sendWebhookEmailToEach = async (emails, { subject, html }) => {
  let sent = 0;
  for (let i = 0; i < emails.length; i += 5) {
    const results = await Promise.allSettled(emails.slice(i, i + 5).map(to => sendWebhookEmail({ to, subject, html })));
    results.forEach((r, k) => {
      if (r.status === 'fulfilled') sent += 1;
      else console.error('Email failed for', emails[i + k], r.reason?.message || r.reason);
    });
  }
  return sent;
};
