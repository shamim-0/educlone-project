// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id") || url.searchParams.get("id");

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "company_id query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id, name, status, branch_id, type")
      .eq("id", companyId)
      .maybeSingle();

    if (cErr || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found", detail: cErr?.message ?? null }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let branchName: string | null = null;
    if ((company as any).branch_id) {
      const { data: branch } = await supabase
        .from("branches")
        .select("name")
        .eq("id", (company as any).branch_id)
        .maybeSingle();
      branchName = branch?.name ?? null;
    }

    const [{ data: steps }, { data: services }] = await Promise.all([
      supabase
        .from("company_steps")
        .select("step_key, status, status_changed_at, updated_at, update_status_by, subtasks_done")
        .eq("company_id", companyId),
      supabase.from("services").select("key, label").order("sort_order"),
    ]);

    const labelMap = new Map((services ?? []).map((s: any) => [s.key, s.label]));

    const doneStatuses = ["done", "no_need"];
    const workflowSteps = (steps ?? []).map((s: any) => ({
      key: s.step_key,
      label: labelMap.get(s.step_key) ?? s.step_key,
      status: s.status,
      status_changed_at: s.status_changed_at,
      updated_at: s.updated_at,
      updated_by: s.update_status_by,
    }));

    const total = workflowSteps.length;
    const done = workflowSteps.filter((s: any) => doneStatuses.includes(s.status)).length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return new Response(
      JSON.stringify({
        name: company.name,
        branch: branchName,
        status: company.status,
        percentage,
        workflow_steps: workflowSteps,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
