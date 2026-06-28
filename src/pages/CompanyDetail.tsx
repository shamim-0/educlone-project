import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Zap, Save, Plus, Trash2, Upload, FileText, Download, Folder, FileDown, AlertTriangle, Pencil, Package as PackageIcon } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_OPTS, statusBadgeClass, getApplicableServiceDefs, getStatusOptsFor } from "@/lib/steps";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { useAuth } from "@/hooks/useAuth";

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
  subtasks_done?: string[] | null;
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
  { key: "mother_plain", title: "Mother Company Documents", subtitle: "Without Apostille & Translation", flag: "MC", color: "border-accent/30" },
  { key: "mother_apostille", title: "Mother Company Documents", subtitle: "With Apostille & Certified Translation", flag: "MA", color: "border-accent/30" },
  { key: "canada", title: "Canadian Company Documents", subtitle: "", flag: "CA", color: "border-primary/30" },
  { key: "usa", title: "USA Company Documents", subtitle: "", flag: "US", color: "border-destructive/30" },
  { key: "misa", title: "Investment License (MISA License)", subtitle: "", flag: "MI", color: "border-primary/30" },
  { key: "cr", title: "Commercial Registration (CR)", subtitle: "", flag: "CR", color: "border-primary/30" },
  { key: "aoa", title: "Articles of Association (AoA) / Nizam Al Asas", subtitle: "", flag: "AO", color: "border-primary/30" },
  { key: "cr_extract", title: "CR Extract (Mustakhrij CR)", subtitle: "", flag: "CX", color: "border-primary/30" },
  { key: "vat", title: "VAT Registration Certificate", subtitle: "", flag: "VT", color: "border-primary/30" },
  { key: "spl", title: "National Address Certificate (SPL)", subtitle: "", flag: "SP", color: "border-primary/30" },
  { key: "gosi", title: "GOSI Certificate", subtitle: "", flag: "GO", color: "border-primary/30" },
  { key: "chamber", title: "Chamber of Commerce Certificate", subtitle: "", flag: "CH", color: "border-primary/30" },
  { key: "other", title: "Any Other Supporting Documents", subtitle: "", flag: "📁", color: "border-border" },
] as const;

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, branchId: myBranchId } = useAuth();
  const STEP_DEFS = useServiceDefs();
  const [company, setCompany] = useState<Company | null>(null);
  const applicableDefs = useMemo(() => getApplicableServiceDefs(company?.type ?? "", STEP_DEFS), [company?.type, STEP_DEFS]);
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
  const [packages, setPackages] = useState<{ id: string; name: string; price: number }[]>([]);
  const [packageOpen, setPackageOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("none");
  const [savingPackage, setSavingPackage] = useState(false);


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
      if (c.data) {
        setCompany(c.data as Company);
        setEmergency(!!(c.data as any).emergency);
        setTakeAction(!!(c.data as any).take_action);
      }
      if (b.data) setBranches(b.data as Branch[]);
      if (a.data) setActivities(a.data as CrActivity[]);
      if (m.data) setManagers(m.data as Manager[]);
      if (sh.data) setShareholders(sh.data as Shareholder[]);
      if (docs.data) setDocuments(docs.data as CompanyDoc[]);
      const map: Record<string, Step> = {};
      (s.data ?? []).forEach((row: any) => { map[row.step_key] = row; });
      applicableDefs.forEach(def => {
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

  // Ensure steps map has an entry for every current applicable service def
  useEffect(() => {
    if (!applicableDefs.length) return;
    setSteps(prev => {
      let changed = false;
      const next = { ...prev };
      applicableDefs.forEach(def => {
        if (!next[def.key]) {
          next[def.key] = { step_key: def.key, status: "not_started", note: "", username: "", password: "" };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [applicableDefs]);

  const progress = useMemo(() => {
    const applicable = applicableDefs.filter(d => steps[d.key]?.status !== "no_need");
    const total = applicable.length;
    const done = applicable.filter(d => steps[d.key]?.status === "done").length;
    const target = 45;
    const allPapers = steps["all_papers_recieved"] as any;
    const startAt = allPapers && allPapers.status === "done" && allPapers.updated_at ? new Date(allPapers.updated_at) : null;
    const started = !!startAt;
    const days = started ? Math.floor((Date.now() - startAt!.getTime()) / 86400000) : 0;
    const overdue = started && days > target;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0, days, overdue, remaining: target - days, started };
  }, [steps, applicableDefs]);

  const currentlyWorking = applicableDefs.filter(d => steps[d.key]?.status === "processing");

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
      subtasks_done: s.subtasks_done ?? [],
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

  const isAdmin = role === "admin";
  const isEditorLike = role === "editor" || role === "sub_admin";
  // Admin always edits. Editor/Sub-admin edit only companies in their assigned branch (or if they have no branch restriction). Viewer cannot edit.
  const canEdit = isAdmin || (isEditorLike && (!myBranchId || company.branch_id === myBranchId));
  const canDelete = isAdmin;

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-4 py-2 text-sm">
          You have read-only access to this company.
        </div>
      )}
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
          <Badge className="bg-success/15 text-success border border-success/30">
            {progress.percent}% ({progress.done}/{progress.total})
          </Badge>
          {emergency && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
              <AlertTriangle className="h-3 w-3 mr-1" /> EMERGENCY
            </Badge>
          )}
          {takeAction && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
              <Zap className="h-3 w-3 mr-1" /> TAKE ACTION
            </Badge>
          )}
        </div>

        {/* Day status banner — starts counting when "All Papers Recieved" is marked done */}
        <div className={cn(
          "mt-4 p-3 rounded-md border text-sm flex items-center gap-2",
          !progress.started
            ? "bg-muted/40 border-border text-muted-foreground"
            : progress.overdue
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-accent/10 border-accent/30 text-foreground"
        )}>
          <span className={cn("h-2.5 w-2.5 rounded-full", !progress.started ? "bg-muted-foreground" : progress.overdue ? "bg-destructive" : "bg-accent")} />
          {!progress.started ? (
            <span>
              <span className="font-semibold">কাউন্টডাউন শুরু হয়নি</span> — "All Papers Recieved" status Done হলে 45 দিনের কাউন্ট শুরু হবে
            </span>
          ) : progress.overdue ? (
            <span>
              <span className="font-semibold">{progress.days} দিন হয়ে গেছে</span> — {Math.abs(progress.remaining)} দিন অতিরিক্ত
            </span>
          ) : (
            <span>
              <span className="font-semibold">{progress.days} দিন</span> — {progress.remaining} দিন বাকি আছে
              <span className="ml-2 text-xs text-muted-foreground">Day {progress.days} since All Papers Recieved</span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={emergency ? "destructive" : "outline"}
            size="sm"
            onClick={async () => {
              const next = !emergency;
              setEmergency(next);
              const { error } = await supabase.from("companies").update({ emergency: next } as any).eq("id", company.id);
              if (error) { setEmergency(!next); return toast.error(error.message); }
              toast.success(next ? "Emergency set" : "Emergency cleared");
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-1" /> {emergency ? "Clear Emergency" : "Set Emergency"}
          </Button>
          <Button
            variant={takeAction ? "destructive" : "outline"}
            size="sm"
            onClick={async () => {
              const next = !takeAction;
              setTakeAction(next);
              const { error } = await supabase.from("companies").update({ take_action: next } as any).eq("id", company.id);
              if (error) { setTakeAction(!next); return toast.error(error.message); }
              toast.success(next ? "Take Action set" : "Take Action cleared");
            }}
          >
            <Zap className="h-4 w-4 mr-1" /> {takeAction ? "Clear Take Action" : "Set Take Action"}
          </Button>
          <Button variant="outline" size="sm" onClick={renameCompany}>
            <Pencil className="h-4 w-4 mr-1" /> Rename
          </Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={deleteCompany}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data } = await supabase.from("packages").select("id,name,price").order("name");
                setPackages((data as any) ?? []);
                setSelectedPackageId(((company as any).package_id as string) ?? "none");
                setPackageOpen(true);
              }}
            >
              <PackageIcon className="h-4 w-4 mr-1" /> Update Package
            </Button>
          )}
        </div>
        )}

        <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Package</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Package</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecting a package will set the Deal amount automatically. Choosing "No Package" will clear it.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPackageOpen(false)}>Cancel</Button>
              <Button
                disabled={savingPackage}
                onClick={async () => {
                  setSavingPackage(true);
                  const pkg = packages.find((p) => p.id === selectedPackageId);
                  const payload: any = pkg
                    ? { package_id: pkg.id, total_deal: pkg.price }
                    : { package_id: null, total_deal: null };
                  const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
                  setSavingPackage(false);
                  if (error) return toast.error(error.message);
                  setCompany({ ...(company as any), ...payload });
                  setPackageOpen(false);
                  toast.success("Package updated");
                }}
              >Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <div className="mt-5">
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground mb-2">STEP OVERVIEW</div>
          <div className="flex gap-1.5 flex-wrap">
            {applicableDefs.map(def => {
              const st = steps[def.key]?.status ?? "not_started";
              const clean = def.label.replace(/\s*\([^)]*\)/g, "").trim();
              const words = clean.split(/\s+/);
              const short = words.length <= 2 ? clean : words.slice(0, 2).join(" ");
              const cls =
                st === "done"
                  ? "bg-success text-success-foreground border-success"
                  : st === "processing"
                  ? "bg-primary text-primary-foreground border-primary"
                  : st === "no_need"
                  ? "bg-white text-black border-border"
                  : "bg-destructive text-destructive-foreground border-destructive";
              return (
                <span
                  key={def.key}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-md border whitespace-nowrap",
                    cls
                  )}
                  title={`${def.label}: ${st}`}
                >
                  {short}
                </span>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", progress.overdue ? "bg-destructive" : "bg-success")}
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
          {applicableDefs.map(def => {
            const s = steps[def.key] ?? { step_key: def.key, status: "not_started", note: "", username: "", password: "", subtasks_done: [] };
            const subDone = s.subtasks_done ?? [];
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
                        {(s.status ?? "not_started").replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={s.status} onValueChange={(v) => updateStep(def.key, { status: v })} disabled={!canEdit}>
                      <SelectTrigger className={cn("w-[140px] h-8 text-xs font-medium border", statusBadgeClass(s.status))}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getStatusOptsFor(def.label).map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className={cn("inline-block px-2 py-0.5 rounded border text-xs", statusBadgeClass(o.value))}>{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {canEdit && <Button size="sm" onClick={() => saveStep(def.key)}>Save</Button>}
                  </div>
                </div>

                {def.hasCreds && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Username / Email</Label>
                      <Input value={s.username ?? ""} onChange={(e) => updateStep(def.key, { username: e.target.value })} disabled={!canEdit} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <Input value={s.password ?? ""} onChange={(e) => updateStep(def.key, { password: e.target.value })} disabled={!canEdit} />
                    </div>
                  </div>
                )}

                {def.subtasks && def.subtasks.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    {def.subtasks.map((label) => {
                      const checked = subDone.includes(label);
                      return (
                        <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            disabled={!canEdit}
                            onCheckedChange={(v) => {
                              const next = v
                                ? Array.from(new Set([...subDone, label]))
                                : subDone.filter((x) => x !== label);
                              updateStep(def.key, { subtasks_done: next });
                            }}
                          />
                          <span className={cn(checked && "text-muted-foreground")}>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Note</Label>
                  <Textarea
                    rows={2}
                    placeholder="Notes…"
                    value={s.note ?? ""}
                    onChange={(e) => updateStep(def.key, { note: e.target.value })}
                    disabled={!canEdit}
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
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">COMPANY NAME</Label>
              <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">TYPE</Label>
                <Select value={company.type} onValueChange={(v) => setCompany({ ...company, type: v })} disabled={!canEdit}>
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
                <Input value={company.cr_number ?? ""} onChange={(e) => setCompany({ ...company, cr_number: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">WHATSAPP</Label>
                <Input value={company.whatsapp ?? ""} onChange={(e) => setCompany({ ...company, whatsapp: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs">EMAIL</Label>
                <Input value={company.contact_email ?? ""} onChange={(e) => setCompany({ ...company, contact_email: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
            <div>
              <Label className="text-xs">NOTE / CONDITION</Label>
              <Textarea rows={3} value={company.note ?? ""} onChange={(e) => setCompany({ ...company, note: e.target.value })} disabled={!canEdit} />
            </div>
            {canEdit && (
              <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
                <Save className="h-4 w-4 mr-1" /> {savingProfile ? "Saving…" : "Save Profile"}
              </Button>
            )}
          </Card>

          {/* Company Activities */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="text-accent">✅</span> Company Activities
              </h2>
              {canEdit && (
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setActivityOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Activity
                </Button>
              )}
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
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteActivity(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
              {canEdit && (
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setManagerOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              )}
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
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteManager(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
              const creds = applicableDefs.filter(d => {
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
              {canEdit && (
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              )}
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
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteShareholder(sh.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{cat.flag}</span>
                          <span className="font-medium text-sm">{cat.title}</span>
                        </div>
                        {cat.subtitle && (
                          <span className="text-[11px] text-muted-foreground ml-[calc(1.5rem+0.5rem)]">{cat.subtitle}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">({files.length})</span>
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
                      {canEdit && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={uploadingCat === cat.key}
                          onClick={() => fileInputs.current[cat.key]?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          {uploadingCat === cat.key ? "…" : "Upload"}
                        </Button>
                      )}
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
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteDocument(f)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
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
            <DialogTitle>Add Company Activity</DialogTitle>
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
