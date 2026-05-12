import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type MailTransport = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<unknown>;
};

type NodemailerLike = {
  createTransport: (options: Record<string, unknown>) => MailTransport;
};

let transport: MailTransport | null = null;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required email env: ${name}`);
  }
  return value;
};

const getTransport = (): MailTransport => {
  if (transport) {
    return transport;
  }

  let nodemailer: NodemailerLike;
  try {
    nodemailer = require('nodemailer') as NodemailerLike;
  } catch (error) {
    throw new Error(
      'Email delivery requires nodemailer. Install it with: npm install nodemailer',
    );
  }

  const host = getRequiredEnv('SMTP_HOST');
  const port = parseInt(getRequiredEnv('SMTP_PORT'), 10);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = getRequiredEnv('SMTP_USER');
  const pass = getRequiredEnv('SMTP_PASS');

  transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transport;
};

export const sendSmtpEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> => {
  const from = getRequiredEnv('EMAIL_FROM');
  const mailTransport = getTransport();

  await mailTransport.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {}),
  });
};
