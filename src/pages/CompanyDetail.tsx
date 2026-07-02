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
import { ArrowLeft, Zap, Save, Plus, Trash2, Upload, FileText, Download, Folder, FileDown, AlertTriangle, Pencil, Package as PackageIcon, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  { key: "final_quotation", title: "Final quotation and agreement", subtitle: "", flag: "FQ", color: "border-primary/30" },
  { key: "client_required", title: "Client required document", subtitle: "", flag: "CD", color: "border-primary/30" },
  { key: "mother_apostille", title: "Mother Company Documents", subtitle: "Without Apostille & Certified Translation", flag: "MA", color: "border-accent/30" },
  { key: "mother_plain", title: "Mother Company Documents", subtitle: "With Apostille & Translation", flag: "MC", color: "border-accent/30" },
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
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);




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
                  : st === "applied"
                  ? "bg-blue-700 text-white border-blue-700"
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
            {progress.done}/{progress.total} steps · {progress.started ? `${progress.days} days since All Papers Recieved` : "কাউন্টডাউন শুরু হয়নি"}
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
            // Working-day countdown banner for formation & registration services.
            // offsetWD = working days after "All Papers Received" before this window starts.
            // windowWD = working days available inside this window to complete the service.
            let mcfBanner: null | { tone: "info" | "warn" | "danger" | "success"; text: string } = null;
            let mcfDates: null | { start: Date; target: Date; remaining: number; passed: number; windowWD: number } = null;
            let simpleAlert: null | { tone: "info" | "warn" | "danger" | "success"; text: string } = null;
            const COUNTDOWN_CONFIG: Record<string, { offsetWD: number; windowWD: number }> = {
              mother_company_formation_bd: { offsetWD: 0, windowWD: 10 },
              usa_company_formation: { offsetWD: 0, windowWD: 10 },
              canada_company_formation: { offsetWD: 0, windowWD: 10 },
              saudi_company_structure_planning: { offsetWD: 0, windowWD: 10 },
              corporate_email_setup: { offsetWD: 0, windowWD: 10 },
              saudi_company_name_reservation: { offsetWD: 0, windowWD: 10 },
              // After 20 working days, 5 more working days to complete:
              cr_commercial_registration: { offsetWD: 20, windowWD: 5 },
              spl_national_address: { offsetWD: 20, windowWD: 5 },
              qiwa_setup: { offsetWD: 20, windowWD: 5 },
              gosi_registration: { offsetWD: 20, windowWD: 5 },
              vat_zatca_registration: { offsetWD: 20, windowWD: 5 },
              chamber_of_commerce_registration: { offsetWD: 20, windowWD: 5 },
            };
            const cdCfg = COUNTDOWN_CONFIG[def.key];
            if (cdCfg) {
              const ap = steps["all_papers_recieved"] as any;
              if (ap?.status === "done" && ap?.updated_at) {
                const apDay = new Date(ap.updated_at);
                apDay.setHours(0, 0, 0, 0);
                const isWorkingDay = (dt: Date) => {
                  const d = dt.getDay();
                  return d !== 5 && d !== 6;
                };
                // Window start = apDay advanced by offsetWD working days (0 offset ⇒ apDay itself).
                const start = new Date(apDay);
                let advanced = 0;
                while (advanced < cdCfg.offsetWD) {
                  start.setDate(start.getDate() + 1);
                  if (isWorkingDay(start)) advanced++;
                }
                // Target = start + windowWD working days.
                const targetDate = new Date(start);
                let added = 0;
                while (added < cdCfg.windowWD) {
                  targetDate.setDate(targetDate.getDate() + 1);
                  if (isWorkingDay(targetDate)) added++;
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const TOTAL_WD = cdCfg.windowWD;
                let passed = 0;
                if (today >= start) {
                  const cur = new Date(start);
                  while (cur <= today) {
                    if (isWorkingDay(cur)) passed++;
                    cur.setDate(cur.getDate() + 1);
                  }
                }
                let remaining: number;
                if (today <= targetDate) {
                  remaining = TOTAL_WD - Math.min(passed, TOTAL_WD);
                } else {
                  let over = 0;
                  const cur = new Date(targetDate);
                  while (cur < today) {
                    cur.setDate(cur.getDate() + 1);
                    if (isWorkingDay(cur)) over++;
                  }
                  remaining = -over;
                }
                mcfDates = { start, target: targetDate, remaining, passed: Math.min(passed, TOTAL_WD), windowWD: TOTAL_WD };
                const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
                const rangeStr = `${fmt(start)} - ${fmt(targetDate)}`;
                if (today < start) {
                  // Window hasn't opened yet — hide banner (only relevant for offset > 0).
                  mcfBanner = null;
                  mcfDates = null;
                } else if (s.status === "done") {
                  mcfBanner = { tone: "success", text: `✓ সম্পন্ন হয়েছে` };
                } else if (remaining > 0) {
                  mcfBanner = { tone: remaining <= 3 ? "warn" : "info", text: `${rangeStr} তারিখের মধ্যে শেষ করতে হবে — বাকি আছে ${remaining} দিন` };
                } else if (remaining === 0) {
                  mcfBanner = { tone: "warn", text: `${rangeStr} তারিখের মধ্যে শেষ করতে হবে — আজই শেষ দিন` };
                } else {
                  mcfBanner = { tone: "danger", text: `${rangeStr} তারিখের মধ্যে শেষ করার কথা ছিল — ${Math.abs(remaining)} দিন পার হয়ে গেছে` };
                }
              }
            }

            // Saudi Employee Hiring — must be done by the next Wednesday after CR (Commercial Registration) is done.
            if (def.key === "saudi_employee_hiring") {
              const cr = steps["cr_commercial_registration"] as any;
              if (cr?.status === "done" && cr?.updated_at) {
                const start = new Date(cr.updated_at);
                start.setHours(0, 0, 0, 0);
                // Next Wednesday strictly after start (if start is Wed, add 7).
                const target = new Date(start);
                const daysUntilWed = ((3 - target.getDay() + 7) % 7) || 7;
                target.setDate(target.getDate() + daysUntilWed);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const MS = 24 * 60 * 60 * 1000;
                const totalDays = Math.round((target.getTime() - start.getTime()) / MS);
                const passed = Math.max(0, Math.min(totalDays, Math.round((today.getTime() - start.getTime()) / MS)));
                const remaining = Math.round((target.getTime() - today.getTime()) / MS);
                mcfDates = { start, target, remaining, passed, windowWD: totalDays };
                const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
                const rangeStr = `${fmt(start)} - ${fmt(target)}`;
                if (s.status === "done") {
                  mcfBanner = { tone: "success", text: `✓ সম্পন্ন হয়েছে` };
                } else if (remaining > 0) {
                  mcfBanner = { tone: remaining <= 2 ? "warn" : "info", text: `আগামী বৃহস্পতিবার (${fmt(target)}) এর মধ্যে শেষ করতে হবে — বাকি আছে ${remaining} দিন` };
                } else if (remaining === 0) {
                  mcfBanner = { tone: "warn", text: `আজই বৃহস্পতিবার (${fmt(target)}) — আজকের মধ্যেই শেষ করতে হবে` };
                } else {
                  mcfBanner = { tone: "danger", text: `${rangeStr} — ${Math.abs(remaining)} দিন পার হয়ে গেছে` };
                }
              }
            }

            // Saudization Quota Allocation — must be done by the next Sunday after Saudi Employee Hiring is done.
            if (def.key === "saudization_quota_allocation") {
              const seh = steps["saudi_employee_hiring"] as any;
              if (seh?.status === "done" && seh?.updated_at) {
                const start = new Date(seh.updated_at);
                start.setHours(0, 0, 0, 0);
                const target = new Date(start);
                const daysUntilSun = ((0 - target.getDay() + 7) % 7) || 7;
                target.setDate(target.getDate() + daysUntilSun);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const MS = 24 * 60 * 60 * 1000;
                const totalDays = Math.round((target.getTime() - start.getTime()) / MS);
                const passed = Math.max(0, Math.min(totalDays, Math.round((today.getTime() - start.getTime()) / MS)));
                const remaining = Math.round((target.getTime() - today.getTime()) / MS);
                mcfDates = { start, target, remaining, passed, windowWD: totalDays };
                const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
                const rangeStr = `${fmt(start)} - ${fmt(target)}`;
                if (s.status === "done") {
                  mcfBanner = { tone: "success", text: `✓ সম্পন্ন হয়েছে` };
                } else if (remaining > 0) {
                  mcfBanner = { tone: remaining <= 2 ? "warn" : "info", text: `আগামী রবিবার (${fmt(target)}) এর মধ্যে শেষ করতে হবে — বাকি আছে ${remaining} দিন` };
                } else if (remaining === 0) {
                  mcfBanner = { tone: "warn", text: `আজই রবিবার (${fmt(target)}) — আজকের মধ্যেই শেষ করতে হবে` };
                } else {
                  mcfBanner = { tone: "danger", text: `${rangeStr} — ${Math.abs(remaining)} দিন পার হয়ে গেছে` };
                }
              }
            }




            // Visa Wakala & Visa Issuance — alert banner when Saudization Quota Allocation is done (no time shown)
            if ((def.key === "visa_wakala" || def.key === "visa_issuance") && s.status !== "done" && s.status !== "no_need") {
              const sqa = steps["saudization_quota_allocation"] as any;
              if (sqa?.status === "done") {
                simpleAlert = { tone: "warn", text: "⚠ Saudization Quota Allocation সম্পন্ন হয়েছে — এটি এখন সম্পন্ন করতে হবে" };
              }
            }

            // Live countdown for Investment License (MISA License) — deadline = MCF target + 1 day grace (24h)
            const isMisaCard = def.key === "misa_license" || def.key === "misa";
            let misaInfo: null | { target: Date; deadline: Date; msLeft: number; msToTarget: number; wdLeft: number; overdue: boolean; done: boolean; passed: number } = null;
            if (isMisaCard) {
              const ap = steps["all_papers_recieved"] as any;
              if (ap?.status === "done" && ap?.updated_at) {
                const start = new Date(ap.updated_at);
                start.setHours(0, 0, 0, 0);
                const isWD = (dt: Date) => { const d = dt.getDay(); return d !== 5 && d !== 6; };
                const target = new Date(start);
                let added = 0;
                while (added < 10) {
                  target.setDate(target.getDate() + 1);
                  if (isWD(target)) added++;
                }
                // Deadline = end of (target + 1 day) → 24h grace after 10 WD period ends
                const deadline = new Date(target);
                deadline.setDate(deadline.getDate() + 1);
                deadline.setHours(23, 59, 59, 999);
                const msLeft = deadline.getTime() - nowTick;
                const msToTarget = target.getTime() - nowTick;
                const today0 = new Date(nowTick); today0.setHours(0, 0, 0, 0);
                let passed = 0;
                if (today0 >= start) {
                  const cur = new Date(start);
                  while (cur <= today0) {
                    if (isWD(cur)) passed++;
                    cur.setDate(cur.getDate() + 1);
                  }
                }
                const wdLeft = Math.max(0, 10 - passed);
                const done = s.status === "applied" || s.status === "done";
                misaInfo = { target, deadline, msLeft, msToTarget, wdLeft, overdue: !done && msLeft <= 0, done, passed };
              }
            }
            const misaRed = misaInfo?.overdue;

            return (
              <Card key={def.key} className={cn("p-4 space-y-3", misaRed && "bg-destructive/15 border-destructive border-2 animate-pulse")}>
                {misaInfo && (misaInfo.msToTarget <= 0 || misaInfo.done) && (() => {
                  const { msLeft, msToTarget, wdLeft, deadline, overdue, done } = misaInfo;
                  const absMs = Math.abs(msLeft);
                  const totalMin = Math.floor(absMs / 60_000);
                  const hours = Math.floor((totalMin % (60 * 24)) / 60);
                  const mins = totalMin % 60;
                  const secs = Math.floor((absMs % 60000) / 1000);
                  const inGrace = msToTarget <= 0 && msLeft > 0; // last 24h grace window
                  const tone = done ? "success" : overdue ? "danger" : inGrace ? "warn" : "info";
                  const toneClass = {
                    success: "bg-success/15 border-success/50 text-success",
                    info: "bg-primary/10 border-primary/40 text-primary",
                    warn: "bg-orange-500/15 border-orange-500/60 text-orange-700 dark:text-orange-400",
                    danger: "bg-destructive/20 border-destructive text-destructive",
                  }[tone];
                  const fmtDL = `${String(deadline.getDate()).padStart(2,"0")}/${String(deadline.getMonth()+1).padStart(2,"0")}/${deadline.getFullYear()} ${String(deadline.getHours()).padStart(2,"0")}:${String(deadline.getMinutes()).padStart(2,"0")}`;
                  const overdueHrs = Math.floor(absMs / (60 * 60 * 1000));
                  const overdueMin = Math.floor((absMs % (60 * 60 * 1000)) / 60000);
                  const overdueSec = Math.floor((absMs % 60000) / 1000);
                  return (
                    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/10 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white">
                      {/* animated particles */}
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl animate-pulse" />
                        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-emerald-300/15 blur-2xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-teal-300/10 blur-3xl" />
                      </div>
                      {/* shimmer sweep */}
                      <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 animate-shimmer" />

                      <div className="relative flex flex-col gap-3 px-5 py-4">
                        {/* top row: icon + title + badge */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20 shadow-inner">
                              {!done && (
                                <span className={cn("absolute inset-0 rounded-xl opacity-50 animate-ping",
                                  overdue ? "bg-red-400/60" : inGrace ? "bg-amber-300/60" : "bg-emerald-300/60")} />
                              )}
                              <svg className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                {done
                                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-emerald-100/80 uppercase tracking-wider">MISA Applied Deadline</p>
                              <p className="text-sm font-bold tabular-nums tracking-tight">{fmtDL}</p>
                            </div>
                          </div>
                          {!done && msToTarget <= 0 && (
                            <span className={cn(
                              "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border shadow-md backdrop-blur-sm",
                              overdue ? "bg-red-500/90 border-red-300/50 text-white shadow-red-500/30" : "bg-amber-400/90 border-amber-200/50 text-amber-950 shadow-amber-500/30",
                            )}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", overdue ? "bg-red-200 animate-ping" : "bg-amber-200 animate-ping")} />
                              {overdue
                                ? `-${String(overdueHrs).padStart(2,"0")}:${String(overdueMin).padStart(2,"0")}:${String(overdueSec).padStart(2,"0")}`
                                : `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`}
                            </span>
                          )}
                          {done && (
                            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border bg-emerald-400/90 border-emerald-200/60 text-emerald-950 shadow-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-100" />
                              COMPLETE
                            </span>
                          )}
                        </div>

                        {/* countdown text — only show once first 10 WD are over */}
                        {(done || overdue || inGrace) && (
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-extrabold tabular-nums tracking-tight drop-shadow-sm">
                              {done
                                ? "✓ Applied / সম্পন্ন"
                                : overdue
                                  ? `⚠ ${overdueHrs}ঘ ${String(overdueMin).padStart(2,"0")}মি ${String(overdueSec).padStart(2,"0")}সে overdue — Status অবশ্যই "Applied" দিতে হবে`
                                  : `শেষ ২৪ ঘণ্টা — বাকি ${hours}ঘ ${String(mins).padStart(2,"0")}মি ${String(secs).padStart(2,"0")}সে`}
                            </p>
                          </div>
                        )}


                        {/* progress bar */}
                        {!done && (
                          <div className="relative h-2 w-full rounded-full bg-white/15 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000 relative",
                                overdue ? "bg-gradient-to-r from-red-400 to-red-600" : inGrace ? "bg-gradient-to-r from-amber-300 to-orange-500" : "bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-200"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, done ? 100 : overdue ? 100 : inGrace ? 85 + (msLeft / (24 * 60 * 60 * 1000)) * 15 : (misaInfo.passed / 10) * 100))}%` }}
                            >
                              <div className="absolute inset-y-0 right-0 w-8 bg-white/40 blur-[2px]" />
                            </div>
                          </div>
                        )}
                        {!done && (() => {
                  // Follow-ups unlock 3, 6, 9 working days AFTER the first 10-WD target
                  const isWD = (dt: Date) => { const d = dt.getDay(); return d !== 5 && d !== 6; };
                  const today0 = new Date(nowTick); today0.setHours(0, 0, 0, 0);
                  let passedAfter = 0;
                  if (today0 > misaInfo.target) {
                    const cur = new Date(misaInfo.target);
                    cur.setDate(cur.getDate() + 1);
                    while (cur <= today0) {
                      if (isWD(cur)) passedAfter++;
                      cur.setDate(cur.getDate() + 1);
                    }
                  }
                  const thresholds = [3, 6, 9];
                  const reached = thresholds.map(t => passedAfter >= t);
                  const activeIdx = reached.lastIndexOf(true);
                  const labels = ["1st Follow-up", "2nd Follow-up", "3rd Follow-up"];
                  const custom = def.followupMessages ?? [];
                  const defaults = [
                    `Hello, this is a follow-up regarding Investment License (MISA) for ${company.name}.`,
                    `Hello, this is our 2nd follow-up regarding Investment License (MISA) for ${company.name}.`,
                    `Hello, this is our 3rd follow-up regarding Investment License (MISA) for ${company.name}.`,
                  ];
                  const fill = (tpl: string) => tpl
                    .replace(/\{company\}/gi, company.name ?? "")
                    .replace(/\{cr\}/gi, (company as any).cr_number ?? "")
                    .replace(/\{isbi\}/gi, (company as any).isbi_code ?? "");
                  const msgs = [0,1,2].map(i => fill((custom[i] && custom[i].trim()) ? custom[i] : defaults[i]));
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-emerald-100/80 inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-emerald-200"><path d="M20.52 3.48A11.9 11.9 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.35-1.66a11.9 11.9 0 005.7 1.45h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.43-8.41zM12.06 21.4h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.77.99 1-3.67-.23-.38a9.5 9.5 0 01-1.46-5.02c0-5.25 4.27-9.52 9.52-9.52 2.54 0 4.93.99 6.73 2.79a9.44 9.44 0 012.78 6.73c0 5.25-4.27 9.51-9.37 9.61z"/></svg>
                        WhatsApp Follow-up:
                      </span>
                      {thresholds.map((t, i) => {
                        const isReached = reached[i];
                        const isActive = i === activeIdx;
                        const daysLeft = Math.max(0, t - passedAfter);
                        const disabled = !isReached;
                        const href = `https://wa.me/?text=${encodeURIComponent(msgs[i])}`;
                        const cls = cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border shadow-sm transition-all",
                          disabled
                            ? "bg-white/10 text-emerald-100/60 border-white/10 cursor-not-allowed opacity-70"
                            : isActive
                              ? "bg-emerald-400/90 text-emerald-950 border-emerald-300 hover:brightness-110"
                              : "bg-white/15 text-white border-white/20 hover:bg-white/25"
                        );
                        const inner = (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M20.52 3.48A11.9 11.9 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.35-1.66a11.9 11.9 0 005.7 1.45h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.43-8.41zM12.06 21.4h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.77.99 1-3.67-.23-.38a9.5 9.5 0 01-1.46-5.02c0-5.25 4.27-9.52 9.52-9.52 2.54 0 4.93.99 6.73 2.79a9.44 9.44 0 012.78 6.73c0 5.25-4.27 9.51-9.37 9.61z"/></svg>
                            {labels[i]}
                            {!isReached && <span className="opacity-70">· {daysLeft}d</span>}
                          </>
                        );
                        const title = !isReached
                          ? `Unlocks ${t} working days after first 10-WD target (${daysLeft} left)`
                          : `${labels[i]} — opens WhatsApp with prefilled message`;
                        return disabled ? (
                          <span key={i} className={cls} title={title}>{inner}</span>
                        ) : (
                          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls} title={title}>{inner}</a>
                        );
                      })}
                    </div>
                  );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                                {mcfBanner && (() => {
                  const tone = mcfBanner.tone;
                  const totalWd = (mcfDates?.passed ?? 0) + Math.max(0, mcfDates?.remaining ?? 0);
                  const pct = mcfDates
                    ? mcfDates.remaining < 0
                      ? 100
                      : totalWd > 0
                        ? Math.min(100, Math.round((mcfDates.passed / totalWd) * 100))
                        : 0
                    : 0;
                  const toneBg = {
                    success: "bg-success/15 border-success/50",
                    info: "bg-accent/15 border-accent/50",
                    warn: "bg-yellow-500/15 border-yellow-500/50",
                    danger: "bg-destructive/15 border-destructive/50",
                  }[tone];
                  const toneText = {
                    success: "text-success",
                    info: "text-accent",
                    warn: "text-yellow-700 dark:text-yellow-400",
                    danger: "text-destructive",
                  }[tone];
                  const toneBar = {
                    success: "from-success to-success",
                    info: "from-accent to-primary",
                    warn: "from-yellow-500 to-orange-600",
                    danger: "from-destructive to-red-800",
                  }[tone];
                  const fmtD = (dt: Date) => `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
                  const dateStr = mcfDates ? `${fmtD(mcfDates.start)} - ${fmtD(mcfDates.target)}` : "";
                  return (
                    <div className={cn(
                      "group relative overflow-hidden rounded-xl border shadow-sm bg-gradient-to-r to-transparent",
                      toneBg,
                      tone === "danger" && "animate-pulse",
                    )}>
                      {/* shimmer sweep */}
                      <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 animate-shimmer" />
                      <div className="relative flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70", toneText)}>
                            {tone !== "success" && (
                              <span className={cn("absolute inset-0 rounded-full opacity-40 animate-ping",
                                tone === "danger" ? "bg-destructive/40" : tone === "warn" ? "bg-yellow-400/40" : "bg-accent/40")} />
                            )}
                            <svg xmlns="http://www.w3.org/2000/svg" className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              {tone === "success"
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                            </svg>
                          </div>
                          {tone === "success" ? (
                            <p className={cn("text-sm font-semibold", toneText)}>{mcfBanner.text}</p>
                          ) : (
                            <p className="text-sm text-foreground/85 truncate">
                              <span className="font-semibold tabular-nums tracking-tight">{dateStr}</span>
                              <span className="opacity-70"> তারিখের মধ্যে শেষ করতে হবে</span>
                              <span className="mx-2 text-border">•</span>
                              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-background border border-border shadow-sm", toneText)}>
                                {mcfDates && mcfDates.remaining < 0
                                  ? `${Math.abs(mcfDates.remaining)} দিন overdue`
                                  : mcfDates && mcfDates.remaining === 0
                                    ? "আজই শেষ দিন"
                                    : <>বাকি <span className="tabular-nums">{mcfDates?.remaining}</span> দিন</>}
                              </span>
                            </p>
                          )}
                        </div>
                        {mcfDates && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-background/80 border border-border shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95",
                                  toneText,
                                )}
                                title="ক্যালেন্ডার দেখুন"
                              >
                                <CalendarIcon className="h-4 w-4 transition-transform group-hover:rotate-6" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <div className="p-3 border-b text-xs space-y-1">
                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">শুরু:</span><span className="font-medium tabular-nums">{mcfDates.start.toLocaleDateString("en-GB")}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">শেষ তারিখ:</span><span className="font-medium tabular-nums">{mcfDates.target.toLocaleDateString("en-GB")}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">পার হয়েছে:</span><span className="font-medium text-primary">{mcfDates.passed} working day</span></div>
                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">বাকি আছে:</span>
                                  <span className={cn("font-medium", mcfDates.remaining < 0 ? "text-destructive" : "text-success")}>
                                    {mcfDates.remaining < 0 ? `${Math.abs(mcfDates.remaining)} দিন overdue` : `${mcfDates.remaining} working day`}
                                  </span>
                                </div>
                                <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
                                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> শুরু</span>
                                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> শেষ তারিখ</span>
                                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500/60" /> ছুটি (শুক্র/শনি)</span>
                                </div>
                              </div>
                              <Calendar
                                mode="single"
                                defaultMonth={mcfDates.target}
                                selected={mcfDates.target}
                                modifiers={{
                                  startDay: mcfDates.start,
                                  targetDay: mcfDates.target,
                                  weekendOff: (d: Date) => (d.getDay() === 5 || d.getDay() === 6) && d >= mcfDates!.start && d <= mcfDates!.target,
                                  inRange: (d: Date) => d > mcfDates!.start && d < mcfDates!.target,
                                }}
                                modifiersClassNames={{
                                  startDay: "bg-primary text-primary-foreground rounded-md",
                                  targetDay: "bg-destructive text-destructive-foreground rounded-md",
                                  weekendOff: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                                  inRange: "bg-accent/30",
                                }}
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      {/* progress bar */}
                      <div className="relative h-[3px] bg-border/40">
                        <div
                          className={cn("h-full bg-gradient-to-r transition-all duration-700 relative", toneBar)}
                          style={{ width: `${pct}%` }}
                        >
                          <div className="absolute inset-y-0 right-0 w-6 bg-white/40 blur-[2px]" />
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {simpleAlert && (
                  <div className={cn(
                    "relative overflow-hidden rounded-xl border shadow-sm bg-gradient-to-r to-transparent",
                    simpleAlert.tone === "warn" && "bg-yellow-500/10 border-yellow-500/40",
                    simpleAlert.tone === "danger" && "bg-destructive/10 border-destructive/40 animate-pulse",
                    simpleAlert.tone === "info" && "bg-primary/10 border-primary/40",
                    simpleAlert.tone === "success" && "bg-success/10 border-success/40",
                  )}>
                    <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 animate-shimmer" />
                    <div className="relative flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70",
                        simpleAlert.tone === "warn" && "text-yellow-600 dark:text-yellow-400",
                        simpleAlert.tone === "danger" && "text-destructive",
                        simpleAlert.tone === "info" && "text-primary",
                        simpleAlert.tone === "success" && "text-success",
                      )}>
                        <span className={cn("absolute inset-0 rounded-full opacity-40 animate-ping",
                          simpleAlert.tone === "warn" ? "bg-yellow-400/40" : simpleAlert.tone === "danger" ? "bg-destructive/40" : "bg-primary/40")} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.646-1.196 1.024-2.03l-6.928-9.97a1.5 1.5 0 00-2.472 0l-6.928 9.97c-.622.834-.03 2.03 1.024 2.03z" />
                        </svg>
                      </div>
                      <p className={cn("text-sm font-semibold",
                        simpleAlert.tone === "warn" && "text-yellow-700 dark:text-yellow-400",
                        simpleAlert.tone === "danger" && "text-destructive",
                        simpleAlert.tone === "info" && "text-primary",
                        simpleAlert.tone === "success" && "text-success",
                      )}>{simpleAlert.text}</p>
                    </div>
                  </div>
                )}
                {def.key === "mother_company_formation_bd" && mcfDates && s.status !== "done" && (() => {
                  const thresholds = [3, 6, 9];
                  const passed = mcfDates.passed;
                  const reached = thresholds.map(t => passed >= t);
                  const activeIdx = reached.lastIndexOf(true);
                  const labels = ["1st Follow-up", "2nd Follow-up", "3rd Follow-up"];
                  const custom = def.followupMessages ?? [];
                  const defaults = [
                    `Hello, this is a follow-up regarding Mother Company Formation (Bangladesh) for ${company.name}.`,
                    `Hello, this is our 2nd follow-up regarding Mother Company Formation (Bangladesh) for ${company.name}.`,
                    `Hello, this is our 3rd follow-up regarding Mother Company Formation (Bangladesh) for ${company.name}.`,
                  ];
                  const fill = (tpl: string) => tpl
                    .replace(/\{company\}/gi, company.name ?? "")
                    .replace(/\{cr\}/gi, (company as any).cr_number ?? "")
                    .replace(/\{isbi\}/gi, (company as any).isbi_code ?? "");
                  const msgs = [0,1,2].map(i => fill((custom[i] && custom[i].trim()) ? custom[i] : defaults[i]));
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-success"><path d="M20.52 3.48A11.9 11.9 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.35-1.66a11.9 11.9 0 005.7 1.45h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.43-8.41zM12.06 21.4h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.77.99 1-3.67-.23-.38a9.5 9.5 0 01-1.46-5.02c0-5.25 4.27-9.52 9.52-9.52 2.54 0 4.93.99 6.73 2.79a9.44 9.44 0 012.78 6.73c0 5.25-4.27 9.51-9.37 9.61z"/></svg>
                        WhatsApp Follow-up:
                      </span>
                      {thresholds.map((t, i) => {
                        const isReached = reached[i];
                        const isActive = i === activeIdx;
                        const daysLeft = Math.max(0, t - passed);
                        const disabled = !isReached;
                        const href = `https://wa.me/?text=${encodeURIComponent(msgs[i])}`;
                        const cls = cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border shadow-sm transition-all",
                          disabled
                            ? "bg-muted/50 text-muted-foreground border-border cursor-not-allowed opacity-70"
                            : isActive
                              ? "bg-success text-success-foreground border-success hover:brightness-110"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        );
                        const inner = (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M20.52 3.48A11.9 11.9 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.35-1.66a11.9 11.9 0 005.7 1.45h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.43-8.41zM12.06 21.4h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.77.99 1-3.67-.23-.38a9.5 9.5 0 01-1.46-5.02c0-5.25 4.27-9.52 9.52-9.52 2.54 0 4.93.99 6.73 2.79a9.44 9.44 0 012.78 6.73c0 5.25-4.27 9.51-9.37 9.61z"/></svg>
                            {labels[i]}
                            {!isReached && <span className="opacity-70">· {daysLeft}d</span>}
                          </>
                        );
                        const title = !isReached
                          ? `Unlocks after ${t} working days (${daysLeft} left)`
                          : `${labels[i]} (after ${t} working days) — opens WhatsApp with prefilled message`;
                        return disabled ? (
                          <span key={i} className={cls} title={title}>{inner}</span>
                        ) : (
                          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls} title={title}>{inner}</a>
                        );
                      })}
                    </div>
                  );
                })()}
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
