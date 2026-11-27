import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
};

/** Never throws: a failed email must never fail an order or a proof. */
export const sendMail = async ({ to, subject, text }) => {
  if (!to) return false;
  try {
    const t = getTransporter();
    if (!t) {
      console.log(`[mail:dry-run] to=${to} | ${subject}`);
      return false;
    }
    await t.sendMail({
      from: process.env.MAIL_FROM || 'Digital Heroes <no-reply@digitalheroes.co.in>',
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error('Mail error:', error.message);
    return false;
  }
};