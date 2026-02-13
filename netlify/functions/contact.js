import nodemailer from "nodemailer";

const recipients = "radubobirnac@gmail.com, virinchiaddanki@gmail.com";

const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON payload" })
    };
  }

  const { fullName, workEmail, trustOrHospital, message } = payload;

  if (!fullName || !workEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Full name and work email are required." })
    };
  }

  try {
    const host = getEnv("SMTP_HOST");
    const port = Number(getEnv("SMTP_PORT"));
    const user = getEnv("SMTP_USER");
    const pass = getEnv("SMTP_PASS");
    const from = process.env.SMTP_FROM || user;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const text = [
      `Full Name: ${fullName}`,
      `Work Email: ${workEmail}`,
      `Trust or Hospital: ${trustOrHospital || "N/A"}`,
      "",
      "Message:",
      message || "(no message provided)"
    ].join("\n");

    await transporter.sendMail({
      from,
      to: recipients,
      subject: `HealthRoster Demo Request - ${fullName}`,
      replyTo: workEmail,
      text
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || "Email send failed." })
    };
  }
}
