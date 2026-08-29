// Admin-only edge function to create users with username/email/password/branch/role
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { username, email, password, branch_id, role, accounts_access, expenses_access, expenses_branch_id } = body ?? {};
    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (cErr || !created.user) {
      return new Response(JSON.stringify({ error: cErr?.message ?? "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newId = created.user.id;

    // profile trigger inserts profile; update branch + accounts access
    const profileUpdate: Record<string, unknown> = {};
    if (branch_id) profileUpdate.branch_id = branch_id;
    if (typeof accounts_access === "boolean") profileUpdate.accounts_access = accounts_access;
    if (typeof expenses_access === "boolean") profileUpdate.expenses_access = expenses_access;
    if (expenses_access && expenses_branch_id) profileUpdate.expenses_branch_id = expenses_branch_id;
    if (Object.keys(profileUpdate).length > 0) {
      await admin.from("profiles").update(profileUpdate).eq("id", newId);
    }

    if (role && role !== "viewer") {
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role });
    }

    return new Response(JSON.stringify({ id: newId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
