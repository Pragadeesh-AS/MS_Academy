const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');

// Same Google Apps Script email webhook as the test and solution-release emails (functions/.env GAS_WEBHOOK_URL)
const GAS_WEBHOOK_URL = defineString('GAS_WEBHOOK_URL', { default: '' });
const SITE_URL = defineString('SITE_URL', { default: '' });
// Who gets the enquiry emails - comma-separated (functions/.env ENQUIRY_NOTIFY_EMAILS)
const ENQUIRY_NOTIFY_EMAILS = defineString('ENQUIRY_NOTIFY_EMAILS', { default: 'msacademy2026@gmail.com' });

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A new enquiry from the website's Enquiry form: email the admin straight away
exports.notifyAdminOfEnquiry = onDocumentCreated('contact_queries/{queryId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const q = snap.data();

  const webhookUrl = GAS_WEBHOOK_URL.value();
  const recipients = ENQUIRY_NOTIFY_EMAILS.value().split(',').map(e => e.trim()).filter(Boolean);
  if (!webhookUrl || recipients.length === 0) {
    console.warn(`GAS_WEBHOOK_URL or ENQUIRY_NOTIFY_EMAILS is not set - no email for enquiry ${event.params.queryId}.`);
    return;
  }

  const name = q.fullName || 'Someone';
  const subject = `New enquiry: ${name}${q.course ? ` - ${q.course}` : ''}`;
  const rows = [
    ['Name', q.fullName],
    ['Email', q.email],
    ['Phone', q.phone],
    ['Course', q.course],
    ['College', q.college],
    ['Department', q.department],
    ['Date', q.date],
  ].filter(([, v]) => v);
  const siteUrl = SITE_URL.value();
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">New enquiry from the website</h2>
      <table style="border-collapse: collapse; margin: 8px 0 16px;">
        ${rows.map(([k, v]) => `<tr><td style="padding: 4px 16px 4px 0; color: #64748b;">${k}</td><td style="padding: 4px 0; font-weight: bold;">${escapeHtml(v)}</td></tr>`).join('')}
      </table>
      <p style="margin: 0 0 6px; color: #64748b;">Query</p>
      <p style="white-space: pre-wrap; margin: 0 0 16px;">${escapeHtml(q.description || q.message || '-')}</p>
      ${siteUrl ? `<p><a href="${escapeHtml(siteUrl)}/admin" style="color: #2563eb; font-weight: bold;">Open the Admin Dashboard</a></p>` : ''}
    </div>
  `;

  let sent = 0;
  for (const email of recipients) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ to_email: email, subject, message_html: html }),
      });
      if (res.ok) sent += 1;
      else console.error('Enquiry email failed for', email, res.status);
    } catch (err) {
      console.error('Enquiry email failed for', email, err);
    }
  }
  await snap.ref.update({ adminEmailed: sent > 0, adminEmailedAt: new Date().toISOString() });
});
