import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Zap, Save, Plus, Trash2 } from "lucide-react";
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
}
interface Step {
  id?: string; step_key: string; status: string;
  note: string | null; username: string | null; password: string | null;
}
interface CrActivity { id: string; code: string; label: string }
interface Manager { id: string; name: string; manager_type: string; iqama: string | null; birthdate: string | null }

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
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [c, b, s, a, m] = await Promise.all([
        supabase.from("companies").select("*").eq("id", id).maybeSingle(),
        supabase.from("branches").select("id,name").order("name"),
        supabase.from("company_steps").select("*").eq("company_id", id),
        supabase.from("cr_activities").select("*").eq("company_id", id).order("created_at"),
        supabase.from("company_managers").select("*").eq("company_id", id).order("created_at"),
      ]);
      if (c.data) setCompany(c.data as Company);
      if (b.data) setBranches(b.data as Branch[]);
      if (a.data) setActivities(a.data as CrActivity[]);
      if (m.data) setManagers(m.data as Manager[]);
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

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!company) return <p className="text-muted-foreground">Company not found. <Link to="/" className="underline">Back</Link></p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
      </div>

      {/* Header */}
      <Card className={cn("p-6", progress.overdue && "border-destructive/40 ring-1 ring-destructive/30")}>
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{branches.find(b => b.id === company.branch_id)?.name ?? "—"}</Badge>
          <Badge className="bg-primary/10 text-primary border border-primary/20 capitalize">{company.type}</Badge>
          <Badge className="bg-accent/15 text-accent border border-accent/30">
            {progress.percent}% ({progress.done}/{progress.total})
          </Badge>
          {progress.overdue && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
              <Zap className="h-3 w-3 mr-1" /> TAKE ACTION
            </Badge>
          )}
        </div>

        {progress.overdue && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            <span className="font-semibold">{progress.days} দিন হয়ে গেছে</span> — {Math.abs(progress.remaining)} দিন অতিরিক্ত
          </div>
        )}

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
    </div>
  );
}
