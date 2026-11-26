/* Live SMS adapters for checkout / mobile verification OTP.
 * Configure ONE provider:
 *   MSG91_AUTH_KEY + MSG91_TEMPLATE_ID (optional MSG91_OTP_VAR, default OTP)
 *   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM
 * Without credentials the app stays in demo SMS mode. */

export function smsMode() {
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return 'msg91';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) return 'twilio';
  return 'demo';
}

const e164India = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
};

async function sendMsg91(phone, code) {
  const mobile = e164India(phone);
  const otpVar = process.env.MSG91_OTP_VAR || 'OTP';
  const res = await fetch('https://control.msg91.com/api/v5/flow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY
    },
    body: JSON.stringify({
      template_id: process.env.MSG91_TEMPLATE_ID,
      short_url: '0',
      recipients: [{ mobiles: mobile, [otpVar]: code }]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === 'error') {
    throw new Error(data.message || `MSG91 request failed (${res.status})`);
  }
  return data;
}

async function sendTwilio(phone, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const body = new URLSearchParams({
    To: '+' + e164India(phone),
    From: process.env.TWILIO_FROM,
    Body: `${code} is your Stashify verification code. It expires in 10 minutes. Do not share it.`
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Twilio request failed (${res.status})`);
  return data;
}

export async function sendSms({ to, code }) {
  const mode = smsMode();
  if (mode === 'msg91') return sendMsg91(to, code);
  if (mode === 'twilio') return sendTwilio(to, code);
  const err = new Error('Live SMS is not configured.');
  err.status = 503;
  throw err;
}
