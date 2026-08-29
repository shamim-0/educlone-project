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
    const trackingId = url.searchParams.get("tracking_id");
    const companyCode = url.searchParams.get("company_code") || url.searchParams.get("code");

    if (!companyId && !trackingId && !companyCode) {
      return new Response(
        JSON.stringify({ error: "company_id, tracking_id or company_code query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let companyQuery = supabase
      .from("companies")
      .select("id, name, status, branch_id, type, tracking_id, company_code, note, warning, warning_note");
    if (trackingId) {
      companyQuery = companyQuery.eq("tracking_id", trackingId.toUpperCase().replace(/\s+/g, ""));
    } else if (companyCode) {
      companyQuery = companyQuery.eq("company_code", companyCode.toUpperCase().replace(/\s+/g, ""));
    } else {
      companyQuery = companyQuery.eq("id", companyId!);
    }
    const { data: company, error: cErr } = await companyQuery.maybeSingle();

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
        .eq("company_id", (company as any).id),
      supabase.from("services").select("key, label, sort_order").order("sort_order"),
    ]);

    const stepMap = new Map((steps ?? []).map((s: any) => [s.step_key, s]));

    // Services-type companies exclude USA/Canada formation steps
    const excludedKeys =
      (company as any).type === "services"
        ? new Set(["usa_company_formation", "canada_company_formation"])
        : new Set<string>();

    // Build steps in service sort order; include missing steps as not_started
    const workflowSteps = (services ?? [])
      .filter((svc: any) => !excludedKeys.has(svc.key))
      .map((svc: any) => {
        const step = stepMap.get(svc.key);
        return {
          key: svc.key,
          label: svc.label ?? svc.key,
          status: step?.status ?? "not_started",
          status_changed_at: step?.status_changed_at ?? null,
          updated_at: step?.updated_at ?? null,
          updated_by: step?.update_status_by ?? null,
        };
      });

    const doneStatuses = ["done", "no_need"];
    const total = workflowSteps.length;
    const done = workflowSteps.filter((s: any) => doneStatuses.includes(s.status)).length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return new Response(
      JSON.stringify({
        company_code: (company as any).company_code ?? null,
        tracking_id: (company as any).tracking_id ?? null,
        name: (company as any).company_code
          ? String(company.name).replace(new RegExp(`^\\s*${(company as any).company_code}\\s*`, "i"), "").trim() || company.name
          : company.name,
        full_name: company.name,
        branch: branchName,
        status: company.status,
        note: (company as any).note ?? null,
        warning: (company as any).warning ?? false,
        warning_note: (company as any).warning_note ?? null,
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
