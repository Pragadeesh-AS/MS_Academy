/**
 * MS GATE Academy - email webhook (Google Apps Script web app)
 *
 * Every email the website and Cloud Functions send goes through this script, and Apps Script
 * always sends from the Google account that deployed it. Deploy it while signed in as
 * admin@msgateacademy.com so all emails come from that address.
 *
 * Emails are sent with GmailApp so each one is saved in admin@msgateacademy.com's Sent folder
 * (and replies/bounces thread with it), and every send is logged with its recipient in the
 * script's Executions page.
 *
 * The site POSTs JSON (sent as text/plain):
 *   { to_email, subject, message_html,
 *     attachment?:  { filename, mimeType, base64Data },
 *     attachments?: [{ filename, mimeType, base64Data }, ...] }
 * and expects back { status: 'success' } or { status: 'error', message }.
 *
 * Used by: VITE_GAS_WEBHOOK_URL in .env (website) and GAS_WEBHOOK_URL in functions/.env (Cloud Functions).
 */

const SENDER_NAME = 'MS GATE Academy';

function doPost(e) {
  let to = '';
  try {
    const data = JSON.parse(e.postData.contents);
    to = String(data.to_email || '').trim();
    if (!to || !data.subject) throw new Error('to_email and subject are required');

    const files = [].concat(data.attachments || [], data.attachment ? [data.attachment] : []);
    const attachments = files
      .filter(function (a) { return a && a.base64Data; })
      .map(function (a) {
        return Utilities.newBlob(Utilities.base64Decode(a.base64Data), a.mimeType || 'application/octet-stream', a.filename || 'attachment');
      });

    const html = data.message_html || '';
    GmailApp.sendEmail(to, data.subject, plainText(html), {
      htmlBody: html,
      name: SENDER_NAME,
      attachments: attachments
    });
    console.log('Sent "' + data.subject + '" to ' + to + (attachments.length ? ' with ' + attachments.length + ' attachment(s)' : ''));
    return json({ status: 'success' });
  } catch (err) {
    console.error('Failed to send to ' + (to || '(no address)') + ': ' + ((err && err.message) || err));
    return json({ status: 'error', message: String((err && err.message) || err) });
  }
}

// Opening the web-app URL in a browser shows this - a quick way to check the deployment is live and
// how many more emails Google allows it to send today
function doGet() {
  return json({ status: 'ok', sender: Session.getEffectiveUser().getEmail(), emailsLeftToday: MailApp.getRemainingDailyQuota() });
}

// Run once from the editor (select testSend, click Run) to grant permissions and send yourself a test email
function testSend() {
  const me = Session.getEffectiveUser().getEmail();
  GmailApp.sendEmail(me, 'MS GATE Academy email webhook test', 'The email webhook works and sends from ' + me + '.', {
    htmlBody: '<p>The email webhook works and sends from <b>' + me + '</b>.</p>',
    name: SENDER_NAME
  });
  console.log('Test email sent to ' + me + '. Emails left today: ' + MailApp.getRemainingDailyQuota());
}

// Text version of the email for mail apps that don't show HTML
function plainText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
