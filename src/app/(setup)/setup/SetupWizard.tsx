"use client";

import { useState } from "react";
import axios from "axios";
import {
  CheckCircle2, Loader2, ShieldCheck, Database, Users,
  ArrowRight, Store, ExternalLink, Eye, EyeOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type StepId = "welcome" | "admin" | "seed" | "done";

interface SeedResult {
  collection: string;
  inserted:   number;
  deleted:    number;
  durationMs: number;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome"    },
  { id: "admin",   label: "Admin"      },
  { id: "seed",    label: "Demo data"  },
  { id: "done",    label: "Done"       },
];

function StepIndicator({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const past   = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors",
                  active ? "bg-[#FCA311] text-white shadow-lg shadow-amber-400/30"
                  : past  ? "bg-green-500 text-white"
                           : "bg-white/10 text-white/40",
                ].join(" ")}
              >
                {past ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? "text-white" : past ? "text-green-400" : "text-white/40"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${past ? "bg-green-500" : "bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl w-full max-w-lg">
      {children}
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FCA311] flex items-center justify-center shadow-lg shadow-amber-400/20">
          <Store className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Prakash Supermarket</h1>
          <p className="text-sm text-white/60">Multi-vendor grocery marketplace</p>
        </div>
      </div>

      <p className="text-sm text-white/70 leading-relaxed">
        Welcome to the install wizard. This guided setup will help you create your admin
        account and optionally seed demo data so you can explore the platform immediately.
      </p>

      <div className="space-y-2.5">
        {[
          { icon: ShieldCheck, text: "Create your admin account"         },
          { icon: Database,    text: "Seed realistic demo data (optional)" },
          { icon: Users,       text: "Explore with 3 pre-built demo logins" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-white/80">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-[#FCA311]" />
            </div>
            {text}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-[#FCA311] hover:brightness-105 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        Get started
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Step 2: Create admin ──────────────────────────────────────────────────────

interface AdminStepProps {
  onNext: () => void;
}

function AdminStep({ onNext }: AdminStepProps) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [skipped,  setSkipped]  = useState(false);

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post("/api/admin/setup", { name, email, password });
      onNext();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Setup failed."
        : "Something went wrong.";
      // 409 = admin already exists — treat as success
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        onNext();
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (skipped) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
        <p className="text-white/80 text-sm">
          Skipped — using existing admin account.
        </p>
        <button onClick={onNext} className="w-full py-3 bg-[#FCA311] text-white font-bold rounded-xl text-sm">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Create admin account</h2>
        <p className="text-sm text-white/60">This will be the super-admin for the platform.</p>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="w-full px-3.5 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/40 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@yourstore.com"
            className="w-full px-3.5 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/40 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-3 bg-[#FCA311] hover:brightness-105 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Creating…" : "Create admin account"}
      </button>

      <button
        onClick={() => setSkipped(true)}
        className="w-full py-2 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
      >
        Skip — admin account already exists
      </button>
    </div>
  );
}

// ── Step 3: Seed demo data ─────────────────────────────────────────────────────

function SeedStep({ onNext }: { onNext: () => void }) {
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState<SeedResult[] | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<{ success: boolean; results: SeedResult[] }>(
        "/api/seed/master"
      );
      setResults(data.results);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Seeding failed."
        : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (results) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
          <h2 className="text-xl font-black text-white">Demo data seeded!</h2>
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl bg-white/5 p-3 border border-white/10">
          {results.map((r) => (
            <div key={r.collection} className="flex items-center justify-between text-xs text-white/70">
              <span className="capitalize font-medium">{r.collection}</span>
              <span className="text-green-400 font-semibold">+{r.inserted}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onNext}
          className="w-full py-3 bg-[#FCA311] hover:brightness-105 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Continue to finish
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Seed demo data</h2>
        <p className="text-sm text-white/60 leading-relaxed">
          Populate the platform with realistic products, categories, orders, vendors, reviews,
          and offers — so you can explore every feature immediately.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
        {[
          ["Categories",  "20+ departments"],
          ["Products",    "200+ items"],
          ["Vendors",     "15 sellers"],
          ["Orders",      "50+ orders"],
          ["Reviews",     "300+ reviews"],
          ["Offers",      "15 promo codes"],
        ].map(([label, detail]) => (
          <div key={label} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FCA311]" />
            <span className="font-medium">{label}</span>
            <span className="text-white/40 ml-auto">{detail}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full py-3 bg-[#FCA311] hover:brightness-105 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Seeding data…" : "Seed demo data"}
      </button>

      <button
        onClick={onNext}
        className="w-full py-2 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
      >
        Skip — I&apos;ll add data manually
      </button>
    </div>
  );
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────

function DoneStep() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
        <CheckCircle2 className="h-9 w-9 text-white" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">You&apos;re all set!</h2>
        <p className="text-sm text-white/60 leading-relaxed">
          Prakash Supermarket is installed and ready. Sign in as admin to start managing
          your marketplace.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-left">
        <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Quick access</p>
        {[
          { label: "Admin login",   href: "/login",  note: "Manage the platform"   },
          { label: "Storefront",    href: "/",       note: "Customer-facing shop"  },
          { label: "Vendor portal", href: "/vendor", note: "Seller dashboard"      },
        ].map(({ label, href, note }) => (
          <a
            key={href}
            href={href}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-white/40">{note}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-white/30 group-hover:text-[#FCA311] transition-colors" />
          </a>
        ))}
      </div>

      <a
        href="/login"
        className="w-full py-3 bg-[#FCA311] hover:brightness-105 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <Store className="h-4 w-4" />
        Go to admin login
      </a>
    </div>
  );
}

// ── Root wizard ────────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const [step, setStep] = useState<StepId>("welcome");

  return (
    <div className="w-full max-w-lg">
      <StepIndicator current={step} />
      <Card>
        {step === "welcome" && <WelcomeStep onNext={() => setStep("admin")} />}
        {step === "admin"   && <AdminStep   onNext={() => setStep("seed")} />}
        {step === "seed"    && <SeedStep    onNext={() => setStep("done")} />}
        {step === "done"    && <DoneStep />}
      </Card>
    </div>
  );
}
