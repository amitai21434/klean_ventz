import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const gmailUser = (Deno.env.get("GMAIL_USER") || "").trim();
  const gmailPass = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s/g, "");
  if (!gmailUser || !gmailPass) return json({ error: "Email is not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD secret)" }, 500);

  const body = await req.json().catch(() => ({}));
  let to: string, subject: string, html: string | undefined, text: string | undefined, replyTo: string | undefined;
  let attachments: { filename: string; content: string; encoding: string }[] | undefined;

  if (body.test === true) {
    // Test mode: only ever sends to the business's own inbox.
    to = gmailUser;
    subject = "Klean Ventz CRM: test email";
    text = "If you're reading this, your CRM can send email from your Gmail. It should also appear in your Sent folder.";
    html = `<p>If you're reading this, your CRM can send email from your Gmail.</p><p>It should also appear in your <b>Sent</b> folder.</p>`;
  } else {
    // Real sends require a signed-in CRM user.
    const authHeader = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (error || !data?.user) return json({ error: "Sign in required" }, 401);
    ({ to, subject, html, text, replyTo } = body);
    if (!to || !subject || (!html && !text)) return json({ error: "to, subject and html or text are required" }, 400);
    // Optional attachments: [{ filename, content (base64) }], e.g. the PDF receipt
    if (Array.isArray(body.attachments)) {
      attachments = body.attachments
        .filter((a: any) => a && a.filename && a.content)
        .slice(0, 5)
        .map((a: any) => ({ filename: String(a.filename), content: String(a.content), encoding: "base64" }));
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    const info = await transporter.sendMail({
      from: `"Klean Ventz" <${gmailUser}>`,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || gmailUser,
      attachments,
    });
    return json({ ok: true, messageId: info.messageId });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
