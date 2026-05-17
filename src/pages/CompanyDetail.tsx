import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Zap, Save, Plus, Trash2, Upload, FileText, Download, Folder, FileDown, AlertTriangle, Pencil } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Branch { id: string; name: string }
interface Company {
  id: string; name: string; type: string; branch_id: string | null;
  cr_number: string | null; whatsapp: string | null;
  contact_email: string | null; note: string | null;
  created_at: string;
  emergency?: boolean | null; take_action?: boolean | null;
}
interface Step {
  id?: string; step_key: string; status: string;
  note: string | null; username: string | null; password: string | null;
}
interface CrActivity { id: string; code: string; label: string }
interface Manager { id: string; name: string; manager_type: string; iqama: string | null; birthdate: string | null }
interface Shareholder {
  id: string; shareholder_type: string; name: string; arabic_name: string | null;
  share_percent: number | null; phone: string | null; email: string | null;
  birthdate: string | null; passport: string | null; nid: string | null; iqama: string | null;
}
interface CompanyDoc { id: string; category: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; created_at: string }

const DOC_CATEGORIES = [
  { key: "bangladesh", label: "Bangladesh Papers", flag: "BD", color: "border-accent/30" },
  { key: "uk", label: "UK Papers", flag: "GB", color: "border-primary/30" },
  { key: "usa", label: "USA Papers", flag: "US", color: "border-destructive/30" },
  { key: "other", label: "Other Documents", flag: "📁", color: "border-border" },
] as const;

const STEP_DEFS: { key: string; label: string; tags: string[]; hasCreds?: boolean }[] = [
  { key: "email_account", label: "Email Account", tags: ["Credentials"], hasCreds: true },
  { key: "bd_formation", label: "BD Formation", tags: ["Bangladesh"] },
  { key: "usa_subsidiary", label: "USA Subsidiary", tags: ["International"] },
  { key: "uk_subsidiary", label: "UK Subsidiary", tags: ["International"] },
  { key: "dhl_send", label: "DHL Send", tags: ["Logistics"] },
  { key: "sbc_clearance", label: "SBC Clearance", tags: ["Portal"], hasCreds: true },
  { key: "misa_license", label: "MISA License", tags: ["Portal"], hasCreds: true },
  { key: "cr_comm_reg", label: "CR (Comm. Reg)", tags: ["KSA"] },
  { key: "qiwa", label: "QIWA", tags: ["KSA"] },
  { key: "muqeem", label: "MUQEEM", tags: ["KSA"], hasCreds: true },
  { key: "gosi", label: "GOSI", tags: ["KSA"] },
  { key: "zatca", label: "ZATCA", tags: ["KSA"], hasCreds: true },
  { key: "spl", label: "SPL", tags: ["KSA"], hasCreds: true },
  { key: "chamber", label: "Chamber", tags: ["KSA"], hasCreds: true },
  { key: "kafala", label: "Kafala", tags: ["KSA"] },
  { key: "cr_extract", label: "CR Extract", tags: ["KSA"] },
  { key: "bank_account", label: "Bank Account", tags: ["Banking"] },
  
];

const STATUS_OPTS = [
  { value: "not_started", label: "Not Started" },
  { value: "processing", label: "Processing" },
  { value: "done", label: "Done" },
];

function statusBadgeClass(s: string) {
  if (s === "done") return "bg-accent/15 text-accent border-accent/30";
  if (s === "processing") return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [activities, setActivities] = useState<CrActivity[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [actCode, setActCode] = useState("");
  const [actLabel, setActLabel] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [mgrName, setMgrName] = useState("");
  const [mgrType, setMgrType] = useState("manager");
  const [mgrIqama, setMgrIqama] = useState("");
  const [mgrBirthdate, setMgrBirthdate] = useState("");
  const [savingManager, setSavingManager] = useState(false);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [shOpen, setShOpen] = useState(false);
  const [shForm, setShForm] = useState({
    shareholder_type: "owner", name: "", arabic_name: "", share_percent: "",
    phone: "", email: "", birthdate: "", passport: "", nid: "", iqama: "",
  });
  const [savingSh, setSavingSh] = useState(false);
  const [documents, setDocuments] = useState<CompanyDoc[]>([]);
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [takeAction, setTakeAction] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [c, b, s, a, m, sh, docs] = await Promise.all([
        supabase.from("companies").select("*").eq("id", id).maybeSingle(),
        supabase.from("branches").select("id,name").order("name"),
        supabase.from("company_steps").select("*").eq("company_id", id),
        supabase.from("cr_activities").select("*").eq("company_id", id).order("created_at"),
        supabase.from("company_managers").select("*").eq("company_id", id).order("created_at"),
        supabase.from("company_shareholders").select("*").eq("company_id", id).order("created_at"),
        supabase.from("company_documents").select("*").eq("company_id", id).order("created_at"),
      ]);
      if (c.data) setCompany(c.data as Company);
      if (b.data) setBranches(b.data as Branch[]);
      if (a.data) setActivities(a.data as CrActivity[]);
      if (m.data) setManagers(m.data as Manager[]);
      if (sh.data) setShareholders(sh.data as Shareholder[]);
      if (docs.data) setDocuments(docs.data as CompanyDoc[]);
      const map: Record<string, Step> = {};
      (s.data ?? []).forEach((row: any) => { map[row.step_key] = row; });
      STEP_DEFS.forEach(def => {
        if (!map[def.key]) {
          map[def.key] = { step_key: def.key, status: "not_started", note: "", username: "", password: "" };
        }
      });
      setSteps(map);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (company) document.title = `${company.name} | ISBI Tracker`;
  }, [company]);

  const progress = useMemo(() => {
    const total = STEP_DEFS.length;
    const done = STEP_DEFS.filter(d => steps[d.key]?.status === "done").length;
    const days = company
      ? Math.floor((Date.now() - new Date(company.created_at).getTime()) / 86400000)
      : 0;
    const target = 45;
    const overdue = days > target;
    return { total, done, percent: Math.round((done / total) * 100), days, overdue, remaining: target - days };
  }, [steps, company]);

  const currentlyWorking = STEP_DEFS.filter(d => steps[d.key]?.status === "processing");

  async function saveProfile() {
    if (!company) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: company.name,
        branch_id: company.branch_id,
        type: company.type as any,
        cr_number: company.cr_number,
        whatsapp: company.whatsapp,
        contact_email: company.contact_email,
        note: company.note,
      })
      .eq("id", company.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  async function saveStep(key: string) {
    if (!id) return;
    const s = steps[key];
    const payload = {
      company_id: id,
      step_key: key,
      status: s.status,
      note: s.note,
      username: s.username,
      password: s.password,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("company_steps")
      .upsert(payload, { onConflict: "company_id,step_key" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSteps(prev => ({ ...prev, [key]: data as Step }));
    toast.success("Saved");
  }

  function updateStep(key: string, patch: Partial<Step>) {
    setSteps(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function addActivity() {
    if (!id) return;
    const code = actCode.trim();
    const label = actLabel.trim();
    if (!code || !label) return toast.error("Code and Label are required");
    setSavingActivity(true);
    const { data, error } = await supabase
      .from("cr_activities")
      .insert({ company_id: id, code, label })
      .select()
      .single();
    setSavingActivity(false);
    if (error) return toast.error(error.message);
    setActivities(prev => [...prev, data as CrActivity]);
    setActCode(""); setActLabel(""); setActivityOpen(false);
    toast.success("Activity added");
  }

  async function deleteActivity(actId: string) {
    const { error } = await supabase.from("cr_activities").delete().eq("id", actId);
    if (error) return toast.error(error.message);
    setActivities(prev => prev.filter(a => a.id !== actId));
  }

  async function addManager() {
    if (!id) return;
    const name = mgrName.trim();
    if (!name) return toast.error("Name is required");
    setSavingManager(true);
    const { data, error } = await supabase
      .from("company_managers")
      .insert({ company_id: id, name, manager_type: mgrType, iqama: mgrIqama.trim() || null, birthdate: mgrBirthdate || null })
      .select()
      .single();
    setSavingManager(false);
    if (error) return toast.error(error.message);
    setManagers(prev => [...prev, data as Manager]);
    setMgrName(""); setMgrType("manager"); setMgrIqama(""); setMgrBirthdate("");
    setManagerOpen(false);
    toast.success("Manager added");
  }

  async function deleteManager(mid: string) {
    const { error } = await supabase.from("company_managers").delete().eq("id", mid);
    if (error) return toast.error(error.message);
    setManagers(prev => prev.filter(m => m.id !== mid));
  }

  async function addShareholder() {
    if (!id) return;
    const name = shForm.name.trim();
    if (!name) return toast.error("Name is required");
    setSavingSh(true);
    const sp = shForm.share_percent.trim();
    const { data, error } = await supabase
      .from("company_shareholders")
      .insert({
        company_id: id,
        shareholder_type: shForm.shareholder_type,
        name,
        arabic_name: shForm.arabic_name.trim() || null,
        share_percent: sp ? Number(sp) : null,
        phone: shForm.phone.trim() || null,
        email: shForm.email.trim() || null,
        birthdate: shForm.birthdate || null,
        passport: shForm.passport.trim() || null,
        nid: shForm.nid.trim() || null,
        iqama: shForm.iqama.trim() || null,
      })
      .select()
      .single();
    setSavingSh(false);
    if (error) return toast.error(error.message);
    setShareholders(prev => [...prev, data as Shareholder]);
    setShForm({ shareholder_type: "owner", name: "", arabic_name: "", share_percent: "", phone: "", email: "", birthdate: "", passport: "", nid: "", iqama: "" });
    setShOpen(false);
    toast.success("Shareholder added");
  }

  async function deleteShareholder(sid: string) {
    const { error } = await supabase.from("company_shareholders").delete().eq("id", sid);
    if (error) return toast.error(error.message);
    setShareholders(prev => prev.filter(s => s.id !== sid));
  }

  async function uploadDocument(category: string, file: File) {
    if (!id) return;
    setUploadingCat(category);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${id}/${category}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("company-documents").upload(path, file);
    if (upErr) { setUploadingCat(null); return toast.error(upErr.message); }
    const { data, error } = await supabase
      .from("company_documents")
      .insert({
        company_id: id,
        category,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();
    setUploadingCat(null);
    if (error) return toast.error(error.message);
    setDocuments(prev => [...prev, data as CompanyDoc]);
    toast.success("File uploaded");
  }

  async function downloadDocument(doc: CompanyDoc) {
    const { data, error } = await supabase.storage.from("company-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) return toast.error(error?.message || "Failed to get URL");
    window.open(data.signedUrl, "_blank");
  }

  async function deleteDocument(doc: CompanyDoc) {
    await supabase.storage.from("company-documents").remove([doc.file_path]);
    const { error } = await supabase.from("company_documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
  }

  async function renameCompany() {
    if (!company) return;
    const next = window.prompt("Rename company", company.name);
    if (!next || next.trim() === "" || next === company.name) return;
    const { error } = await supabase.from("companies").update({ name: next.trim() }).eq("id", company.id);
    if (error) return toast.error(error.message);
    setCompany({ ...company, name: next.trim() });
    toast.success("Renamed");
  }

  async function deleteCompany() {
    if (!company) return;
    if (!window.confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", company.id);
    if (error) return toast.error(error.message);
    toast.success("Company deleted");
    navigate("/");
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!company) return <p className="text-muted-foreground">Company not found. <Link to="/" className="underline">Back</Link></p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <FileDown className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Header */}
      <Card className={cn(
        "p-6",
        (progress.overdue || emergency) && "border-destructive/40 ring-1 ring-destructive/30"
      )}>
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{branches.find(b => b.id === company.branch_id)?.name ?? "—"}</Badge>
          <Badge className="bg-primary/10 text-primary border border-primary/20 capitalize">{company.type}</Badge>
          <Badge className="bg-accent/15 text-accent border border-accent/30">
            {progress.percent}% ({progress.done}/{progress.total})
          </Badge>
          {emergency && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
              <AlertTriangle className="h-3 w-3 mr-1" /> EMERGENCY
            </Badge>
          )}
          {(progress.overdue || takeAction) && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
              <Zap className="h-3 w-3 mr-1" /> TAKE ACTION
            </Badge>
          )}
        </div>

        {/* Day status banner — always visible */}
        <div className={cn(
          "mt-4 p-3 rounded-md border text-sm flex items-center gap-2",
          progress.overdue
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-accent/10 border-accent/30 text-foreground"
        )}>
          <span className={cn("h-2.5 w-2.5 rounded-full", progress.overdue ? "bg-destructive" : "bg-accent")} />
          {progress.overdue ? (
            <span>
              <span className="font-semibold">{progress.days} দিন হয়ে গেছে</span> — {Math.abs(progress.remaining)} দিন অতিরিক্ত
            </span>
          ) : (
            <span>
              <span className="font-semibold">{progress.days} দিন</span> — {progress.remaining} দিন বাকি আছে
              <span className="ml-2 text-xs text-muted-foreground">Day {progress.days} since creation</span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={emergency ? "destructive" : "outline"}
            size="sm"
            onClick={() => { setEmergency(v => !v); toast.success(emergency ? "Emergency cleared" : "Emergency set"); }}
          >
            <AlertTriangle className="h-4 w-4 mr-1" /> {emergency ? "Clear Emergency" : "Set Emergency"}
          </Button>
          <Button
            variant={takeAction ? "destructive" : "outline"}
            size="sm"
            onClick={() => { setTakeAction(v => !v); toast.success(takeAction ? "Take Action cleared" : "Take Action set"); }}
          >
            <Zap className="h-4 w-4 mr-1" /> {takeAction ? "Clear Take Action" : "Set Take Action"}
          </Button>
          <Button variant="outline" size="sm" onClick={renameCompany}>
            <Pencil className="h-4 w-4 mr-1" /> Rename
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteCompany}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>

        <div className="mt-5">
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground mb-2">STEP OVERVIEW</div>
          <div className="flex gap-1.5 flex-wrap">
            {STEP_DEFS.map(def => {
              const st = steps[def.key]?.status ?? "not_started";
              return (
                <span key={def.key} className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  st === "done" ? "bg-accent" : st === "processing" ? "bg-primary" : "bg-muted"
                )} title={`${def.label}: ${st}`} />
              );
            })}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", progress.overdue ? "bg-destructive" : "bg-gradient-accent")}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {progress.done}/{progress.total} steps · {progress.days} days since creation
          </div>
        </div>

        {currentlyWorking.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-bold tracking-wider text-muted-foreground mb-2">CURRENTLY WORKING ON</div>
            <div className="flex flex-wrap gap-2">
              {currentlyWorking.map(d => (
                <Badge key={d.key} className="bg-primary/15 text-primary border border-primary/30">{d.label}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-lg">⚙ Workflow Steps</h2>
          {STEP_DEFS.map(def => {
            const s = steps[def.key];
            return (
              <Card key={def.key} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {s.status === "done" && "✓ "}{def.label}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {def.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                      ))}
                      <span className={cn("text-[10px] px-2 py-0.5 rounded border capitalize", statusBadgeClass(s.status))}>
                        {s.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={s.status} onValueChange={(v) => updateStep(def.key, { status: v })}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => saveStep(def.key)}>Save</Button>
                  </div>
                </div>

                {def.hasCreds && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Username / Email</Label>
                      <Input value={s.username ?? ""} onChange={(e) => updateStep(def.key, { username: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <Input value={s.password ?? ""} onChange={(e) => updateStep(def.key, { password: e.target.value })} />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Note</Label>
                  <Textarea
                    rows={2}
                    placeholder="Notes…"
                    value={s.note ?? ""}
                    onChange={(e) => updateStep(def.key, { note: e.target.value })}
                  />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Profile */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">📋 Company Profile</h2>
            <div>
              <Label className="text-xs">BRANCH</Label>
              <Select
                value={company.branch_id ?? ""}
                onValueChange={(v) => setCompany({ ...company, branch_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">COMPANY NAME</Label>
              <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">TYPE</Label>
                <Select value={company.type} onValueChange={(v) => setCompany({ ...company, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">CR NUMBER</Label>
                <Input value={company.cr_number ?? ""} onChange={(e) => setCompany({ ...company, cr_number: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">WHATSAPP</Label>
                <Input value={company.whatsapp ?? ""} onChange={(e) => setCompany({ ...company, whatsapp: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">EMAIL</Label>
                <Input value={company.contact_email ?? ""} onChange={(e) => setCompany({ ...company, contact_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">NOTE / CONDITION</Label>
              <Textarea rows={3} value={company.note ?? ""} onChange={(e) => setCompany({ ...company, note: e.target.value })} />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
              <Save className="h-4 w-4 mr-1" /> {savingProfile ? "Saving…" : "Save Profile"}
            </Button>
          </Card>

          {/* CR Activities */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="text-accent">✅</span> CR Activities
              </h2>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setActivityOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Activity
              </Button>
            </div>
            {activities.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No activities assigned yet</p>
            ) : (
              <ul className="space-y-2">
                {activities.map(a => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-muted-foreground">{a.code}</div>
                      <div className="text-sm font-medium truncate">{a.label}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteActivity(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Managers */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="text-accent">👥</span> Managers
              </h2>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setManagerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {managers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No managers added yet</p>
            ) : (
              <ul className="space-y-2">
                {managers.map(m => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.manager_type === "temporary_manager" ? "Temporary Manager" : "Manager"}
                        {m.iqama ? ` · Iqama: ${m.iqama}` : ""}
                        {m.birthdate ? ` · ${m.birthdate}` : ""}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteManager(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* All Credentials */}
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="text-accent">🔑</span> All Credentials
            </h2>
            {(() => {
              const creds = STEP_DEFS.filter(d => {
                const s = steps[d.key];
                return s && ((s.username && s.username.trim()) || (s.password && s.password.trim()));
              });
              if (creds.length === 0) {
                return <p className="text-center text-sm text-muted-foreground py-6">No credentials saved yet</p>;
              }
              return (
                <ul className="space-y-2">
                  {creds.map(d => {
                    const s = steps[d.key];
                    return (
                      <li key={d.key} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="text-sm font-semibold">{d.label}</div>
                        {s.username && <div className="text-xs text-muted-foreground mt-1">User: <span className="text-foreground font-mono">{s.username}</span></div>}
                        {s.password && <div className="text-xs text-muted-foreground">Pass: <span className="text-foreground font-mono">{s.password}</span></div>}
                        {s.note && <div className="text-xs text-muted-foreground">Notes: <span className="text-foreground">{s.note}</span></div>}
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </Card>

          {/* Shareholders */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="text-accent">👥</span> Shareholders
              </h2>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {shareholders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No shareholders added yet</p>
            ) : (
              <ul className="space-y-2">
                {shareholders.map(sh => (
                  <li key={sh.id} className="flex items-start justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {sh.name}
                        {sh.share_percent != null && <span className="ml-2 text-xs text-accent">{sh.share_percent}%</span>}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {sh.shareholder_type}
                        {sh.arabic_name ? ` · ${sh.arabic_name}` : ""}
                        {sh.phone ? ` · ${sh.phone}` : ""}
                        {sh.email ? ` · ${sh.email}` : ""}
                      </div>
                      {(sh.passport || sh.nid || sh.iqama || sh.birthdate) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sh.birthdate ? `DOB: ${sh.birthdate}` : ""}
                          {sh.passport ? ` · Passport: ${sh.passport}` : ""}
                          {sh.nid ? ` · NID: ${sh.nid}` : ""}
                          {sh.iqama ? ` · Iqama: ${sh.iqama}` : ""}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteShareholder(sh.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Documents */}
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Folder className="h-5 w-5 text-accent" /> Documents
            </h2>
            <div className="space-y-3">
              {DOC_CATEGORIES.map(cat => {
                const files = documents.filter(d => d.category === cat.key);
                return (
                  <Card key={cat.key} className={cn("p-3 space-y-2 bg-muted/20", cat.color)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{cat.flag}</span>
                        <span className="font-medium text-sm truncate">{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground">({files.length})</span>
                      </div>
                      <input
                        ref={(el) => { fileInputs.current[cat.key] = el; }}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDocument(cat.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={uploadingCat === cat.key}
                        onClick={() => fileInputs.current[cat.key]?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {uploadingCat === cat.key ? "…" : "Upload"}
                      </Button>
                    </div>
                    {files.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-2">No files uploaded</p>
                    ) : (
                      <ul className="space-y-1">
                        {files.map(f => (
                          <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs truncate">{f.file_name}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDocument(f)}>
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteDocument(f)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add CR Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Activity Code</Label>
              <Input value={actCode} onChange={(e) => setActCode(e.target.value)} placeholder="e.g. 4711" maxLength={50} />
            </div>
            <div>
              <Label className="text-xs">Activity Label</Label>
              <Input value={actLabel} onChange={(e) => setActLabel(e.target.value)} placeholder="e.g. Wholesale of electronics" maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
            <Button onClick={addActivity} disabled={savingActivity}>
              {savingActivity ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={mgrName} onChange={(e) => setMgrName(e.target.value)} placeholder="Full name" maxLength={150} />
            </div>
            <div>
              <Label className="text-xs">Manager Type</Label>
              <Select value={mgrType} onValueChange={setMgrType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="temporary_manager">Temporary Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Iqama</Label>
                <Input value={mgrIqama} onChange={(e) => setMgrIqama(e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label className="text-xs">Birthdate</Label>
                <Input type="date" value={mgrBirthdate} onChange={(e) => setMgrBirthdate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerOpen(false)}>Cancel</Button>
            <Button onClick={addManager} disabled={savingManager}>
              {savingManager ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shOpen} onOpenChange={setShOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Shareholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={shForm.shareholder_type} onValueChange={(v) => setShForm({ ...shForm, shareholder_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={shForm.name} onChange={(e) => setShForm({ ...shForm, name: e.target.value })} maxLength={150} />
            </div>
            <div>
              <Label className="text-xs">Arabic Name</Label>
              <Input value={shForm.arabic_name} onChange={(e) => setShForm({ ...shForm, arabic_name: e.target.value })} maxLength={150} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Share %</Label>
                <Input type="number" value={shForm.share_percent} onChange={(e) => setShForm({ ...shForm, share_percent: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={shForm.phone} onChange={(e) => setShForm({ ...shForm, phone: e.target.value })} maxLength={50} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={shForm.email} onChange={(e) => setShForm({ ...shForm, email: e.target.value })} maxLength={255} />
              </div>
              <div>
                <Label className="text-xs">Birthdate</Label>
                <Input type="date" value={shForm.birthdate} onChange={(e) => setShForm({ ...shForm, birthdate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Passport</Label>
                <Input value={shForm.passport} onChange={(e) => setShForm({ ...shForm, passport: e.target.value })} maxLength={50} />
              </div>
              <div>
                <Label className="text-xs">NID</Label>
                <Input value={shForm.nid} onChange={(e) => setShForm({ ...shForm, nid: e.target.value })} maxLength={50} />
              </div>
              <div>
                <Label className="text-xs">Iqama</Label>
                <Input value={shForm.iqama} onChange={(e) => setShForm({ ...shForm, iqama: e.target.value })} maxLength={50} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShOpen(false)}>Cancel</Button>
            <Button onClick={addShareholder} disabled={savingSh}>
              {savingSh ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
