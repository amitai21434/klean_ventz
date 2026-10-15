import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Owner-only: creates a Supabase Auth login plus the matching row in public.users.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "Sign in required" }, 401);
  const { data: profile } = await admin.from("users").select("role").eq("id", caller.user.id).single();
  if (!profile || profile.role !== "owner") return json({ error: "Owner access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const role = body.role || "technician";
  const name = String(body.name || "");
  if (!email || !password) return json({ error: "Email and password are required" }, 400);
  if (!["owner", "technician"].includes(role)) return json({ error: "Invalid role" }, 400);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name, role },
  });
  if (createErr) return json({ error: createErr.message }, 400);

  const { data, error } = await admin.from("users").upsert([{ id: created.user.id, email, role, name }]).select("id,email,role,name").single();
  if (error) return json({ error: error.message }, 500);
  return json(data);
});
