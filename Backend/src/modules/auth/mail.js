/**
 * Account emails: verification and password-reset codes.
 *
 * Built the way large senders build transactional mail: a 600px table
 * layout with inline styles (the only markup Gmail, Outlook and Apple Mail
 * all render the same), a hidden preheader for the inbox preview, the logo
 * as an embedded image (mail clients block SVG and often remote images),
 * a plain-text part, and a footer that says why the mail was sent, where to
 * get help, and links to the terms and privacy policy.
 *
 * Without SMTP configured (local development) the code is written to the log
 * instead, so the whole flow can be exercised without a mail server.
 * Production refuses to start without SMTP_HOST.
 */


import nodemailer from 'nodemailer';

import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

let transporter = null;

function transport() {
  if (!config.smtp.host) return null;
  transporter ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    pool: true,                 // reuse open connections: no TCP + TLS + login per email
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

// ── delivery off the request path ───────────────────────────────────────────
// Handing a message to SMTP takes 1-3 s, so requests never wait for it: the
// code or message is already saved, the response goes out at once and the
// email follows. A failed send is retried once after a short pause. Pending
// sends are finished on shutdown (drainMail) so none are cut off.

const pending = new Set();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendWithRetry(message, what) {
  const mailer = transport();
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mailer.sendMail(message);
      return true;
    } catch (err) {
      if (attempt >= 2) {
        logger.error({ err: err.message, what }, 'Sending email failed');
        return false;
      }
      await pause(1500);
    }
  }
}

/** Queue an email; returns at once. */
function deliver(message, what) {
  const job = sendWithRetry(message, what).finally(() => pending.delete(job));
  pending.add(job);
  return job;
}

/** Open the SMTP connection at startup so the first email is as fast as the rest. */
export function warmMail() {
  const mailer = transport();
  if (!mailer) return;
  mailer.verify().then(
    () => logger.info('SMTP ready'),
    (err) => logger.warn({ err: err.message }, 'SMTP check failed - emails will retry when sent'),
  );
}

/** Wait (bounded) for queued emails before the process exits. */
export async function drainMail(ms = 15_000) {
  if (pending.size) await Promise.race([Promise.allSettled([...pending]), pause(ms)]);
  transporter?.close();
}

// The logo is linked from the website (Frontend/public/email/logo.png, drawn
// at 3x so it is sharp on phones), not attached - so no "farmxpert.png" file
// shows under the message. A mail app can only fetch it from a public
// address, so while APP_URL is local (development) the header uses the
// wordmark as text instead of a broken picture.
const APP = config.auth.appUrl.replace(/\/$/, '');
const PUBLIC_APP = !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\]|[^/]*\.local)/i.test(APP);
const TEXT_MARK = `<span style="font-family:'Poppins','Segoe UI',Helvetica,Arial,sans-serif;font-size:26px;line-height:44px;font-weight:300;letter-spacing:0.3px;color:#ffffff;white-space:nowrap;">Farm<span style="color:#85c736;font-weight:600;">X</span>pert</span>`;
const WORDMARK = PUBLIC_APP
  ? `<img src="${APP}/email/logo.png" width="121" height="44" alt="FarmXpert" style="display:block;border:0;outline:none;text-decoration:none;width:121px;height:44px;color:#ffffff;font-family:Georgia,serif;font-size:22px;">`
  : TEXT_MARK;

const COPY = {
  email_verification: {
    subject: 'Your FarmXpert verification code',
    preheader: 'Your code to finish creating your FarmXpert account.',
    eyebrow: 'Verify your email',
    title: 'Welcome to FarmXpert',
    line: 'Enter this code to verify your email address and finish creating your account.',
    reason: 'You are receiving this email because this address was used to create a FarmXpert account.',
    ignore: 'If you did not create an account, you can safely ignore this email. No account will be created without the code.',
  },
  password_reset: {
    subject: 'Your FarmXpert password reset code',
    preheader: 'Your code to set a new FarmXpert password.',
    eyebrow: 'Password reset',
    title: 'Reset your password',
    line: 'Enter this code to set a new password for your FarmXpert account.',
    reason: 'You are receiving this email because a password reset was requested for this address.',
    ignore: 'If you did not ask to reset your password, you can ignore this email. Your password stays the same and your account is safe.',
  },
};

const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function html(copy, code) {
  const app = config.auth.appUrl;
  const year = new Date().getFullYear();
  const support = config.smtp.supportEmail;
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${copy.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4efe4;-webkit-text-size-adjust:100%;">
<!-- preheader: the grey line inbox lists show after the subject -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${copy.preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe4;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

      <!-- card -->
      <tr><td style="background:#ffffff;border:1px solid #e6dcc8;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <!-- header band -->
          <tr><td style="background:#0f4a2e;background-image:linear-gradient(135deg,#062516 0%,#0f4a2e 55%,#2f7a3e 100%);padding:26px 32px 24px;">
            ${WORDMARK}
          </td></tr>
          <!-- gold rule -->
          <tr><td style="height:3px;line-height:3px;font-size:0;background:#b8913a;background-image:linear-gradient(90deg,#b8913a,#e3b951,#b8913a);">&nbsp;</td></tr>

          <!-- body -->
          <tr><td style="padding:36px 36px 8px;font-family:${FONT};">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#b8913a;font-weight:600;">${copy.eyebrow}</p>
            <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:#10281a;">${copy.title}</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:#3c4a40;">${copy.line}</p>
          </td></tr>

          <!-- the code -->
          <tr><td align="center" style="padding:24px 36px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tr><td align="center" style="background:#f2f7ee;border:1px solid #cfe2c6;padding:22px 16px;">
                <p style="margin:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5f6b62;">Your code</p>
                <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:36px;line-height:1;font-weight:bold;letter-spacing:8px;color:#0f4a2e;">${code}</p>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:10px 36px 0;font-family:${FONT};">
            <p style="margin:0;font-size:13px;color:#5f6b62;">This code expires in <strong style="color:#1d2b22;">${config.auth.otpMinutes} minutes</strong> and can be used once.</p>
          </td></tr>

          <!-- security note -->
          <tr><td style="padding:26px 36px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0;font-family:${FONT};">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#3c4a40;"><strong style="color:#10281a;">Keep this code private.</strong> FarmXpert will never ask for it by phone, message or email.</p>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:14px 36px 34px;font-family:${FONT};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6b786f;">${copy.ignore}</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- footer -->
      <tr><td align="center" style="padding:26px 24px 8px;font-family:${FONT};">
        <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#5f6b62;font-weight:600;">This is an automatically generated email. Please do not reply to it.</p>
        <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#7a857c;">${copy.reason}</p>
        <p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:#7a857c;">Need help? Write to <a href="mailto:${support}" style="color:#2f7a3e;text-decoration:underline;">${support}</a></p>
        <p style="margin:0 0 14px;font-size:12px;">
          <a href="${app}" style="color:#2f7a3e;text-decoration:none;font-weight:600;">FarmXpert</a>
          <span style="color:#c9bfa9;">&nbsp;&middot;&nbsp;</span>
          <a href="${app}/terms" style="color:#5f6b62;text-decoration:none;">Terms of Service</a>
          <span style="color:#c9bfa9;">&nbsp;&middot;&nbsp;</span>
          <a href="${app}/privacy" style="color:#5f6b62;text-decoration:none;">Privacy Policy</a>
        </p>
        <p style="margin:0 0 4px;font-size:11px;color:#9aa39c;">AI farm advice for Indian farmers, in your own language.</p>
        <p style="margin:0;font-size:11px;color:#9aa39c;">&copy; ${year} FarmXpert. All rights reserved.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function text(copy, code) {
  const app = config.auth.appUrl;
  return [
    `${copy.title}`,
    '',
    copy.line,
    '',
    `Your code: ${code}`,
    `It expires in ${config.auth.otpMinutes} minutes and can be used once.`,
    '',
    'Keep this code private. FarmXpert will never ask for it by phone, message or email.',
    copy.ignore,
    '',
    '—',
    'This is an automatically generated email. Please do not reply to it.',
    copy.reason,
    `Help: ${config.smtp.supportEmail}`,
    `Terms: ${app}/terms  ·  Privacy: ${app}/privacy`,
    `© ${new Date().getFullYear()} FarmXpert. All rights reserved.`,
  ].join('\n');
}

/** The message, for sending or for a preview (see `npm run mail:preview`). */
export function buildCodeEmail(purpose, code) {
  const copy = COPY[purpose];
  return {
    subject: copy.subject,
    text: text(copy, code),
    html: html(copy, code),
  };
}

export async function sendCode(to, purpose, code) {
  const mailer = transport();
  if (!mailer) {
    // Development only (production requires SMTP). Never log codes in production.
    logger.warn({ to, purpose, code }, 'SMTP not configured - verification code logged instead of emailed');
    return false;
  }
  // queued, not awaited: the code is saved, so the response need not wait for SMTP
  deliver({ from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`, to, ...buildCodeEmail(purpose, code) }, purpose);
  return true;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A message from the website's contact form, delivered to the support inbox. */
export async function sendContactMessage({ id, name, email, phone, topic, message }) {
  const mailer = transport();
  if (!mailer) {
    logger.warn({ name, email, topic }, 'SMTP not configured - contact message logged instead of emailed');
    logger.info({ message }, 'Contact message');
    return false;
  }
  const rows = [['Reference', String(id || '').slice(0, 8).toUpperCase()], ['Name', name], ['Email', email], ['Mobile', phone || '—'], ['Topic', topic]];
  deliver({
    from: `"${config.smtp.fromName} website" <${config.smtp.fromEmail}>`,
    to: config.smtp.supportEmail,
    replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
    subject: `[Contact · ${topic}] ${name}`,
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1d2b22">
      <table cellpadding="4" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#6b786f">${k}</td><td><b>${escapeHtml(v)}</b></td></tr>`).join('')}</table>
      <p style="white-space:pre-wrap;line-height:1.6;border-top:1px solid #e6dcc8;padding-top:12px;margin-top:12px">${escapeHtml(message)}</p>
    </div>`,
  }, 'contact message');
  return true;
}

// ── contact form: the confirmation the sender receives ─────────────────────

const ACK = {
  en: {
    subject: 'We received your message',
    eyebrow: 'Contact',
    title: (n) => `Thank you, ${n}`,
    line: 'We have received your message and will reply to this email address, usually within one working day.',
    yours: 'Your message',
    ref: 'Reference',
    auto: 'This is an automatically generated email. Please do not reply to it.',
    note: 'To add anything, write to ${support} and mention your reference number. For questions about your own farm, the Ask page in FarmXpert answers right away.',
    reason: 'You are receiving this email because this address was entered in the contact form on the FarmXpert website.',
  },
  hi: {
    subject: 'हमें आपका संदेश मिल गया',
    eyebrow: 'संपर्क',
    title: (n) => `धन्यवाद, ${n}`,
    line: 'हमें आपका संदेश मिल गया है। हम इसी ईमेल पते पर जवाब देंगे, आम तौर पर एक कार्य दिवस में।',
    yours: 'आपका संदेश',
    ref: 'संदर्भ',
    auto: 'यह एक स्वचालित ईमेल है। कृपया इसका जवाब न दें।',
    note: 'कुछ और जोड़ना हो तो ${support} पर अपना संदर्भ नंबर लिखकर भेजें। अपने खेत के सवालों के लिए FarmXpert का "पूछें" पेज तुरंत जवाब देता है।',
    reason: 'आपको यह ईमेल इसलिए मिला क्योंकि FarmXpert वेबसाइट के संपर्क फ़ॉर्म में यह पता डाला गया था।',
  },
  gu: {
    subject: 'અમને તમારો સંદેશ મળ્યો',
    eyebrow: 'સંપર્ક',
    title: (n) => `આભાર, ${n}`,
    line: 'અમને તમારો સંદેશ મળી ગયો છે. અમે આ જ ઇમેઇલ સરનામે જવાબ આપીશું, સામાન્ય રીતે એક કામકાજના દિવસમાં.',
    yours: 'તમારો સંદેશ',
    ref: 'સંદર્ભ',
    auto: 'આ આપમેળે મોકલાયેલો ઇમેઇલ છે. કૃપા કરીને તેનો જવાબ ન આપો.',
    note: 'કંઈ ઉમેરવું હોય તો ${support} પર તમારો સંદર્ભ નંબર લખીને મોકલો. તમારા ખેતરના પ્રશ્નો માટે FarmXpert નું "પૂછો" પેજ તરત જવાબ આપે છે.',
    reason: 'તમને આ ઇમેઇલ એટલે મળ્યો કારણ કે FarmXpert વેબસાઇટના સંપર્ક ફોર્મમાં આ સરનામું લખાયું હતું.',
  },
};

export async function sendContactAck({ id, name, email, message, language = 'en' }) {
  const mailer = transport();
  if (!mailer) return false;
  const c = ACK[language] || ACK.en;
  const ref = String(id || '').slice(0, 8).toUpperCase();
  const app = config.auth.appUrl;
  const year = new Date().getFullYear();
  const support = config.smtp.supportEmail;
  const note = c.note.replace('${support}', support);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only"><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#f4efe4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe4;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="background:#ffffff;border:1px solid #e6dcc8;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#0f4a2e;background-image:linear-gradient(135deg,#062516 0%,#0f4a2e 55%,#2f7a3e 100%);padding:26px 32px 24px;">
        ${WORDMARK}</td></tr>
      <tr><td style="height:3px;line-height:3px;font-size:0;background:#b8913a;">&nbsp;</td></tr>
      <tr><td style="padding:34px 36px 6px;font-family:${FONT};">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#b8913a;font-weight:600;">${c.eyebrow}</p>
        <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:#10281a;">${escapeHtml(c.title(name))}</h1>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#3c4a40;">${c.line}</p>
      </td></tr>
      <tr><td style="padding:22px 36px 6px;font-family:${FONT};">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5f6b62;">${c.yours} · ${c.ref} ${ref}</p>
        <p style="margin:0;padding:16px 18px;background:#f7f4ec;font-size:14px;line-height:1.65;color:#3c4a40;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </td></tr>
      <tr><td style="padding:18px 36px 32px;font-family:${FONT};">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b786f;">${note.replace(support, `<a href="mailto:${support}" style="color:#2f7a3e;">${support}</a>`)}</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:24px 24px 8px;font-family:${FONT};">
    <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#5f6b62;font-weight:600;">${c.auto}</p>
    <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#7a857c;">${c.reason}</p>
    <p style="margin:0 0 12px;font-size:12px;"><a href="${app}" style="color:#2f7a3e;text-decoration:none;font-weight:600;">FarmXpert</a>
      <span style="color:#c9bfa9;">&nbsp;&middot;&nbsp;</span><a href="${app}/terms" style="color:#5f6b62;text-decoration:none;">Terms of Service</a>
      <span style="color:#c9bfa9;">&nbsp;&middot;&nbsp;</span><a href="${app}/privacy" style="color:#5f6b62;text-decoration:none;">Privacy Policy</a></p>
    <p style="margin:0;font-size:11px;color:#9aa39c;">&copy; ${year} FarmXpert. All rights reserved.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
  deliver({
    from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
    to: email,
    subject: `${c.subject} · ${ref}`,
    text: `${c.title(name)}

${c.line}

${c.yours} (${c.ref} ${ref}):
${message}

${note}

${c.auto}
© ${year} FarmXpert`,
    html,
  }, 'contact ack');
  return true;
}
