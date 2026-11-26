import nodemailer from 'nodemailer';
import { load, save, uid } from './store.js';

let transporter = null;
export function mailMode() {
  return process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? 'live' : 'demo';
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

const shell = (title, body) => `
<div style="background:#F4EDE0;padding:32px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14213D">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(20,33,61,.08)">
    <div style="background:#14213D;padding:24px 28px">
      <span style="color:#F4EDE0;font-size:22px;font-weight:800;letter-spacing:-.5px;font-family:Arial,Helvetica,sans-serif">stash<span style="color:#FF6B5B">ify</span><span style="color:#FF6B5B;font-size:11px;vertical-align:8px">&#9679;</span></span>
    </div>
    <div style="padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <div style="padding:18px 28px;background:#F4EDE0;color:rgba(20,33,61,.6);font-size:12px">
      Stashify · Everything you love, in one stash. This is an automated message.
    </div>
  </div>
</div>`;

const codeBlock = (code) => `
<div style="margin:20px 0;padding:18px;background:#F4EDE0;border-radius:14px;text-align:center">
  <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#14213D">${code}</div>
  <div style="font-size:12px;color:rgba(20,33,61,.6);margin-top:6px">Valid for 10 minutes · Never share this code</div>
</div>`;

export async function sendMail({ to, subject, title, html, kind, code }) {
  const db = load();
  const body = html || '';
  const record = {
    id: uid('mail'),
    to,
    subject,
    kind: kind || 'general',
    code: code || null,
    html: shell(title || subject, body),
    createdAt: Date.now(),
    delivery: mailMode()
  };
  db.inbox.unshift(record);
  if (db.inbox.length > 120) db.inbox = db.inbox.slice(0, 120);
  await save();

  if (mailMode() === 'live') {
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'Stashify <no-reply@stashify.shop>',
        to,
        subject,
        html: record.html
      });
      record.delivered = true;
    } catch (e) {
      record.delivered = false;
      record.error = e.message;
    }
    await save();
  }
  return record;
}

export const templates = {
  verifyEmail: (name, code) => ({
    subject: `${code} is your Stashify verification code`,
    title: `Welcome to Stashify, ${name.split(' ')[0]} 👋`,
    html: `<p style="color:rgba(20,33,61,.75);line-height:1.6">Confirm your email address to unlock your account, wishlist and order history.</p>${codeBlock(code)}<p style="font-size:13px;color:rgba(20,33,61,.6)">If you didn't create a Stashify account, you can ignore this email.</p>`
  }),
  login: (name, code) => ({
    subject: `${code} — your Stashify sign-in code`,
    title: 'Sign-in verification',
    html: `<p style="color:rgba(20,33,61,.75);line-height:1.6">Hi ${name.split(' ')[0]}, use this code to finish signing in.</p>${codeBlock(code)}`
  }),
  reset: (name, code) => ({
    subject: `${code} — reset your Stashify password`,
    title: 'Password reset',
    html: `<p style="color:rgba(20,33,61,.75);line-height:1.6">Hi ${name.split(' ')[0]}, use this code to set a new password.</p>${codeBlock(code)}<p style="font-size:13px;color:rgba(20,33,61,.6)">Didn't request this? Your password is unchanged.</p>`
  }),
  order: (order, user) => ({
    subject: `Payment successful via Razorpay · Order ${order.id} · Stashify`,
    title: 'Payment successful ✅',
    html: `<p style="color:rgba(20,33,61,.75);line-height:1.6">Hi ${user.name.split(' ')[0]}, your payment of <b>₹${order.total.toLocaleString('en-IN')}</b> was successful via <b>Razorpay</b> and your order is confirmed.</p>
      <div style="margin:18px 0;padding:16px;background:#E8F7EE;border:1px solid #BFE8CD;border-radius:14px;color:#14532D;font-size:14px;line-height:1.6">
        <b>Payment status:</b> Successful<br/>
        <b>Gateway:</b> Razorpay · ${order.payment.mode === 'live' ? 'Live' : 'Test Mode (simulated)'}<br/>
        <b>Order ID:</b> ${order.id}<br/>
        <b>Razorpay order ID:</b> ${order.payment.orderId}<br/>
        <b>Razorpay payment ID:</b> ${order.payment.paymentId}
      </div>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        ${order.items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.name} <span style="color:#888">× ${i.qty}</span></td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #eee">₹${(i.price * i.qty).toLocaleString('en-IN')}</td></tr>`).join('')}
        <tr><td style="padding:12px 0;font-weight:700">Total paid</td><td style="padding:12px 0;text-align:right;font-weight:800;color:#FF6B5B">₹${order.total.toLocaleString('en-IN')}</td></tr>
      </table>
      <p style="font-size:13px;color:rgba(20,33,61,.6)">Delivering to: ${order.address.line1}, ${order.address.city} ${order.address.pincode}</p>`
  })
};
