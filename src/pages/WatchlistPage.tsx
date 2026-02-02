/*
  Supabase table used by this page:

  create table if not exists public.watchlist_targets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    person_name text not null,
    company text not null,
    role text,
    status text not null default 'not_contacted',
    next_action_date date,
    notes text,
    created_at timestamptz not null default now()
  );

  alter table public.watchlist_targets enable row level security;

  create policy "Users can manage their own watchlist targets"
    on public.watchlist_targets for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
*/

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { WatchlistTarget } from "../types";
import Card from "../components/ui/Card";
import { toast } from "sonner";

interface WatchlistPageProps {
  inputCls: string;
  selectCls: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "follow_up_sent", label: "Follow-up Sent" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_BADGE_CLS: Record<string, string> = {
  not_contacted: "bg-white/10 text-white/90",
  contacted: "bg-blue-500/20 text-blue-200",
  scheduled: "bg-purple-500/20 text-purple-200",
  completed: "bg-green-500/20 text-green-200",
  follow_up_sent: "bg-cyan-500/20 text-cyan-200",
};

export default function WatchlistPage({ inputCls, selectCls }: WatchlistPageProps) {
  /* ── state ─────────────────────────────────────────────── */
  const [targets, setTargets] = useState<WatchlistTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const [personName, setPersonName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("not_contacted");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── helpers ────────────────────────────────────────────── */
  const resetForm = () => {
    setPersonName("");
    setCompany("");
    setRole("");
    setStatus("not_contacted");
    setNextActionDate("");
    setNotes("");
    setEditingId(null);
  };

  /* ── CRUD ──────────────────────────────────────────────── */
  const loadTargets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist_targets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load watchlist: " + error.message);
    } else {
      setTargets(data as WatchlistTarget[]);
    }
    setLoading(false);
  }, []);

  const addTarget = async () => {
    if (!personName.trim() || !company.trim()) {
      toast.error("Person name and company are required.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("watchlist_targets").insert({
      owner_id: user.id,
      person_name: personName.trim(),
      company: company.trim(),
      role: role.trim() || null,
      status,
      next_action_date: nextActionDate || null,
      notes: notes.trim() || null,
    });

    if (error) {
      toast.error("Failed to add target: " + error.message);
    } else {
      toast.success("Target added!");
      resetForm();
      await loadTargets();
    }
    setSaving(false);
  };

  const updateTarget = async () => {
    if (!editingId) return;
    if (!personName.trim() || !company.trim()) {
      toast.error("Person name and company are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("watchlist_targets")
      .update({
        person_name: personName.trim(),
        company: company.trim(),
        role: role.trim() || null,
        status,
        next_action_date: nextActionDate || null,
        notes: notes.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Failed to update target: " + error.message);
    } else {
      toast.success("Target updated!");
      resetForm();
      await loadTargets();
    }
    setSaving(false);
  };

  const deleteTarget = async (id: string) => {
    if (!window.confirm("Delete this watchlist target?")) return;

    const { error } = await supabase
      .from("watchlist_targets")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete target: " + error.message);
    } else {
      toast.success("Target deleted.");
      if (editingId === id) resetForm();
      await loadTargets();
    }
  };

  const startEdit = (t: WatchlistTarget) => {
    setEditingId(t.id);
    setPersonName(t.person_name);
    setCompany(t.company);
    setRole(t.role ?? "");
    setStatus(t.status);
    setNextActionDate(t.next_action_date ?? "");
    setNotes(t.notes ?? "");
  };

  const cancelEdit = () => resetForm();

  /* ── load on mount ─────────────────────────────────────── */
  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  /* ── render ────────────────────────────────────────────── */
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
      {/* ── Left column: form ──────────────────────────────── */}
      <div className="lg:col-span-1">
        <Card
          title={editingId ? "Edit Target" : "Add Target"}
          subtitle="Track people you want to network with."
        >
          <div className="grid gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Person Name</div>
              <input
                className={inputCls}
                placeholder="e.g. Jane Smith"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Company</div>
              <input
                className={inputCls}
                placeholder="e.g. Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Role / Title (optional)</div>
              <input
                className={inputCls}
                placeholder="e.g. Engineering Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Status</div>
                <select
                  className={selectCls}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Next Action Date</div>
                <input
                  className={inputCls}
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Notes (optional)</div>
              <textarea
                className={inputCls + " min-h-[72px] resize-y"}
                placeholder="Any context, talking points, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={editingId ? updateTarget : addTarget}
                disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add Target"}
              </button>
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Right column: target list ─────────────────────── */}
      <div className="lg:col-span-2">
        <Card
          title="Watchlist"
          subtitle={loading ? "Loading..." : `${targets.length} target(s)`}
          right={
            <button
              onClick={loadTargets}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Refresh
            </button>
          }
        >
          <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr_0.8fr] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wide text-white/60">
              <div>Name</div>
              <div>Company</div>
              <div>Role</div>
              <div>Status</div>
              <div>Next Action</div>
              <div>Actions</div>
            </div>
            <div className="h-px w-full bg-white/10" />

            {loading ? (
              <div className="px-4 py-4 text-sm text-white/70">Loading...</div>
            ) : targets.length === 0 ? (
              <div className="px-4 py-4 text-sm text-white/70">No watchlist targets yet.</div>
            ) : (
              targets.map((t) => (
                <div key={t.id}>
                  <div className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr_0.8fr] items-center gap-3 px-4 py-3 hover:bg-white/[0.04]">
                    <div className="truncate font-semibold text-white" title={t.person_name}>
                      {t.person_name}
                    </div>
                    <div className="truncate text-sm text-white/85" title={t.company}>
                      {t.company}
                    </div>
                    <div className="truncate text-sm text-white/85" title={t.role ?? ""}>
                      {t.role ?? "\u2014"}
                    </div>
                    <div className="text-sm">
                      <span
                        className={`inline-block rounded-lg px-2 py-1 text-xs font-medium ${STATUS_BADGE_CLS[t.status] ?? "bg-white/10 text-white/90"}`}
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>
                    <div className="text-sm text-white/80">
                      {t.next_action_date ?? "\u2014"}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-xs font-semibold text-white/70 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTarget(t.id)}
                        className="text-xs font-semibold text-rose-300/70 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="h-px w-full bg-white/10" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
