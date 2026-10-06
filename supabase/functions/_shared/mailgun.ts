import { env, optionalEnv } from "./env.ts";

/**
 * Send an email through the Mailgun HTTP API.
 * Secrets: MAILGUN_API_KEY, MAILGUN_DOMAIN, optional MAILGUN_FROM and MAILGUN_API_BASE
 * (https://api.eu.mailgun.net for EU-region domains).
 */
export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  const domain = env("MAILGUN_DOMAIN");
  const base = optionalEnv("MAILGUN_API_BASE", "https://api.mailgun.net");
  const from = optionalEnv("MAILGUN_FROM", `BELKA'S ENTERPRISE <orders@${domain}>`);

  const form = new FormData();
  form.append("from", from);
  form.append("to", opts.to);
  form.append("subject", opts.subject);
  form.append("html", opts.html);
  form.append("text", opts.text);

  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`api:${env("MAILGUN_API_KEY")}`) },
    body: form,
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
  return res.json();
}
