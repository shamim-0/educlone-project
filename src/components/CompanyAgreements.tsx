import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/appClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileSignature, Plus, Printer, Trash2, Eye, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const LICENSE_TYPES = [
  { value: "service", label: "Service License Agreement" },
  { value: "trading", label: "Trading License Agreement" },
];
export const INVESTOR_TYPES = [
  { value: "ksa", label: "KSA Resident" },
  { value: "international", label: "International Investor" },
];
export const AGREEMENT_PACKAGES = [
  { value: "legacy", label: "Legacy Package" },
  { value: "executive", label: "Executive Package" },
  { value: "business", label: "Business Package" },
  { value: "starter", label: "Starter Package" },
];

const labelOf = (list: { value: string; label: string }[], v: string) =>
  list.find(o => o.value === v)?.label ?? v;

export interface AgreementCompany {
  id: string;
  name: string;
  client_name?: string | null;
  passport_iqama?: string | null;
  whatsapp?: string | null;
  contact_email?: string | null;
}

interface AgreementRow {
  id: string;
  company_id: string;
  license_type: string;
  investor_type: string;
  package_key: string;
  template_key: string;
  field_values: Record<string, string>;
  status: string;
  finalized_at: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

function autoValues(company: AgreementCompany, investorType: string): Record<string, string> {
  const today = fmtDate(new Date());
  const client = (company.client_name || company.name || "").trim();
  const id = (company.passport_iqama || "").trim();
  const contact = [company.whatsapp, company.contact_email].filter(Boolean).join(" / ");
  const v: Record<string, string> = {
    "agreement-date": today,
    "date-1": today,
    "date-2": today,
    "draft-for-review-only-final-agreement": "DRAFT – FOR REVIEW ONLY",
  };
  if (client) v["client-name"] = client;
  if (id) { v["client-id-passport-no"] = id; v["id-number"] = id; }
  if (id && investorType === "ksa") v["iqama-residency-no"] = id;
  if (contact) v["client-phone-email"] = contact;
  return v;
}

export default function CompanyAgreements({ company }: { company: AgreementCompany }) {
  const { role, username } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = isAdmin || role === "sub_admin" || role === "editor";
  const canDelete = isAdmin || role === "sub_admin";

  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [licenseType, setLicenseType] = useState("service");
  const [investorType, setInvestorType] = useState("ksa");
  const [packageKey, setPackageKey] = useState("starter");
  const [creating, setCreating] = useState(false);

  const [active, setActive] = useState<AgreementRow | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("company_agreements")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as AgreementRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company.id]);

  // bridge with the agreement iframe
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const d: any = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "agr:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "agr:init", values: draftValues, readOnly: !canEdit || (active?.status === "final" && !isAdmin) },
          "*",
        );
      } else if (d.type === "agr:change") {
        setDraftValues(d.values ?? {});
        setDirty(true);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [draftValues, active, canEdit, isAdmin]);

  const createAgreement = async () => {
    setCreating(true);
    const template_key = `${licenseType}-${investorType}-${packageKey}`;
    const { data, error } = await supabase
      .from("company_agreements")
      .insert({
        company_id: company.id,
        license_type: licenseType,
        investor_type: investorType,
        package_key: packageKey,
        template_key,
        field_values: autoValues(company, investorType),
        status: "draft",
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        created_by_name: username,
        updated_by: username,
      })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setCreateOpen(false);
    await load();
    openAgreement(data as unknown as AgreementRow);
  };

  const openAgreement = (row: AgreementRow) => {
    setActive(row);
    setDraftValues((row.field_values ?? {}) as Record<string, string>);
    setDirty(false);
  };

  const save = async (finalize = false) => {
    if (!active) return;
    setSaving(true);
    const values = { ...draftValues };
    if (finalize) values["draft-for-review-only-final-agreement"] = "FINAL AGREEMENT";
    const { error } = await supabase
      .from("company_agreements")
      .update({
        field_values: values,
        status: finalize ? "final" : active.status,
        finalized_at: finalize ? new Date().toISOString() : active.finalized_at,
        updated_by: username,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(finalize ? "Agreement saved as final" : "Draft saved");
    setDraftValues(values);
    setDirty(false);
    setActive({ ...active, field_values: values, status: finalize ? "final" : active.status });
    iframeRef.current?.contentWindow?.postMessage(
      { type: "agr:init", values, readOnly: finalize && !isAdmin },
      "*",
    );
    load();
  };

  const remove = async (row: AgreementRow) => {
    if (!confirm("Delete this agreement?")) return;
    const { error } = await supabase.from("company_agreements").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows(prev => prev.filter(r => r.id !== row.id));
    toast.success("Agreement deleted");
  };

  const printActive = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: "agr:print" }, "*");
  };

  const activeReadOnly = !canEdit || (active?.status === "final" && !isAdmin);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-accent" /> Agreements
        </h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Agreement
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No agreement created yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{labelOf(LICENSE_TYPES, r.license_type)}</span>
                  <Badge variant="outline" className="text-[10px]">{labelOf(INVESTOR_TYPES, r.investor_type)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{labelOf(AGREEMENT_PACKAGES, r.package_key)}</Badge>
                  <Badge className={cn("text-[10px]", r.status === "final"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-border")}>
                    {r.status === "final" ? "Final" : "Draft"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Created {new Date(r.created_at).toLocaleDateString()} by {r.created_by_name ?? "—"}
                  {r.updated_by ? ` · last updated by ${r.updated_by}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openAgreement(r)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> {r.status === "final" && !isAdmin ? "View" : "Open"}
                </Button>
                {canDelete && (
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Agreement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">License type</Label>
              <Select value={licenseType} onValueChange={setLicenseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Investor type</Label>
              <Select value={investorType} onValueChange={setInvestorType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTOR_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Package</Label>
              <Select value={packageKey} onValueChange={setPackageKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGREEMENT_PACKAGES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createAgreement} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer / editor */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setDirty(false); } }}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
              {active && (
                <>
                  {labelOf(LICENSE_TYPES, active.license_type)}
                  <Badge variant="outline" className="text-[10px]">{labelOf(INVESTOR_TYPES, active.investor_type)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{labelOf(AGREEMENT_PACKAGES, active.package_key)}</Badge>
                  {activeReadOnly && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> read only
                    </span>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-muted">
            {active && (
              <iframe
                ref={iframeRef}
                key={active.id}
                title="Agreement"
                src={`/agreements/${active.template_key}.html`}
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>

          <DialogFooter className="px-4 py-3 border-t border-border flex-wrap gap-2 sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              {activeReadOnly
                ? "Final agreement — content is locked."
                : "Click any highlighted field in the document to edit it."}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={printActive}>
                <Printer className="h-4 w-4 mr-1" /> Print / PDF
              </Button>
              {!activeReadOnly && (
                <>
                  <Button size="sm" onClick={() => save(false)} disabled={saving || !dirty}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save Draft"}
                  </Button>
                  {active?.status !== "final" && (
                    <Button size="sm" variant="secondary" onClick={() => save(true)} disabled={saving}>
                      Save Final Version
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
