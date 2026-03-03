import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (
  to: string,
  name: string,
  inviteLink: string
) => {
  await transporter.sendMail({
    from: `"VizGRC" <${process.env.SMTP_USER}>`,
    to,
    subject: "You're Invited to VizGRC",
    html: `
      <h2>Hello ${name},</h2>
      <p>You have been invited to join VizGRC.</p>
      <p>Click below to activate your account:</p>
      <a href="${inviteLink}" 
         style="padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
         Accept Invitation
      </a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
};