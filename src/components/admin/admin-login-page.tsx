"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Zap,
  BarChart3,
  Globe,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Config ──────────────────────────────────────────────────────────
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";

interface AdminLoginPageProps {
  onBack: () => void;
  onLogin: () => void;
}

// ─── Floating Particles ──────────────────────────────────────────────
function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 8,
        opacity: Math.random() * 0.4 + 0.1,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.5, p.opacity * 1.2, p.opacity],
            scale: [1, 1.3, 0.8, 1.1, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated Grid Lines ─────────────────────────────────────────────
function GridOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ─── Radar Sweep ─────────────────────────────────────────────────────
function RadarSweep() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {/* Outer ring pulse */}
      <motion.div
        className="absolute -top-[300px] -left-[300px] w-[600px] h-[600px] rounded-full border border-emerald-500/10"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-[200px] -left-[200px] w-[400px] h-[400px] rounded-full border border-emerald-400/10"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      {/* Sweep line */}
      <motion.div
        className="absolute -top-[250px] -left-[1px] w-[0.5px] h-[500px] origin-bottom"
        style={{
          background: "linear-gradient(to top, rgba(16,185,129,0.3), transparent)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── Flight Path Animation ───────────────────────────────────────────
function FlightPath() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Path 1 */}
      <motion.div
        className="absolute top-[15%] left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.2), rgba(52,211,153,0.4), rgba(16,185,129,0.2), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      />
      {/* Path 2 */}
      <motion.div
        className="absolute top-[40%] left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.15), rgba(45,212,191,0.3), rgba(20,184,166,0.15), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 0.8 }}
      />
      {/* Path 3 */}
      <motion.div
        className="absolute bottom-[30%] left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.1), rgba(34,211,238,0.25), rgba(6,182,212,0.1), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 1.1 }}
      />
      {/* Moving plane dot on path 1 */}
      <motion.div
        className="absolute top-[15%] w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
        initial={{ left: "-2%" }}
        animate={{ left: "102%" }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 2 }}
      />
      {/* Moving plane dot on path 2 */}
      <motion.div
        className="absolute top-[40%] w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.7)]"
        initial={{ left: "102%" }}
        animate={{ left: "-2%" }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 3 }}
      />
    </div>
  );
}

// ─── PIN Dots Display ────────────────────────────────────────────────
function PinDots({ value, error }: { value: string; error: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "w-4 h-4 rounded-full border-2 transition-all duration-300",
            i < value.length
              ? error
                ? "bg-red-500 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                : "bg-emerald-400 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : error
                ? "border-red-500/30"
                : "border-white/20"
          )}
          animate={
            i === value.length
              ? { scale: [1, 1.3, 1] }
              : i < value.length
                ? { scale: [0.8, 1.1, 1] }
                : {}
          }
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Feature Highlights ──────────────────────────────────────────────
function FeatureHighlights() {
  const features = [
    { icon: BarChart3, label: "Analytics temps réel" },
    { icon: Globe, label: "Gestion vols" },
    { icon: MessageCircle, label: "Console WhatsApp" },
    { icon: Zap, label: "IA Config" },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      {features.map((f, i) => (
        <motion.div
          key={f.label}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.4 + i * 0.1, duration: 0.4 }}
        >
          <f.icon className="size-4 text-emerald-400/70" />
          <span className="text-xs text-white/50 font-medium">{f.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Glowing Ring Effect ─────────────────────────────────────────────
function GlowingRing({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  const color = isError ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)";
  const colorSubtle = isError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)";

  return (
    <div className="relative p-[1px] rounded-2xl" style={{
      background: `linear-gradient(135deg, ${color}, ${colorSubtle}, transparent, ${colorSubtle}, ${color})`,
      backgroundSize: "300% 300%",
    }}>
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${color}, ${colorSubtle}, transparent, ${colorSubtle}, ${color})`,
          backgroundSize: "300% 300%",
        }}
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative rounded-2xl">{children}</div>
    </div>
  );
}

// ─── Success Animation ───────────────────────────────────────────────
function SuccessOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#070c16]/95 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="relative">
          <motion.div
            className="absolute -inset-4 rounded-full bg-emerald-500/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <CheckCircle2 className="size-20 text-emerald-400" strokeWidth={1.5} />
        </div>
      </motion.div>
      <motion.p
        className="mt-6 text-lg font-semibold text-white tracking-wide"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Authentification réussie
      </motion.p>
      <motion.p
        className="mt-2 text-sm text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Chargement du tableau de bord...
      </motion.p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── MAIN LOGIN PAGE ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export default function AdminLoginPage({ onBack, onLogin }: AdminLoginPageProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input after mount animation
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    if (pin === ADMIN_PIN) {
      setError(false);
      setLoginSuccess(true);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      // Clear after shake
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 600);
    }
  }, [pin]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") onBack();
    },
    [handleSubmit, onBack]
  );

  return (
    <motion.div
      className="fixed inset-0 z-[60] overflow-hidden bg-[#070c16]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Background Image ───────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/login-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#070c16]/90 via-[#0a1628]/85 to-[#070c16]/95" />

      {/* ── Animated Effects ───────────────────────────────────── */}
      <GridOverlay />
      <Particles />
      <RadarSweep />
      <FlightPath />

      {/* ── Decorative Glow Orbs ───────────────────────────────── */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/[0.03] blur-[150px] pointer-events-none" />
      <motion.div
        className="absolute top-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-emerald-400/[0.02] blur-[80px] pointer-events-none"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Success Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {loginSuccess && <SuccessOverlay onDone={onLogin} />}
      </AnimatePresence>

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Retour</span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
            <Plane className="size-4 text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-white/70 tracking-wider">
            AERO<span className="text-emerald-400">ASSIST</span>
          </span>
        </div>
        <div className="w-20" /> {/* spacer for centering */}
      </motion.div>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4" style={{ minHeight: "calc(100vh - 80px)" }}>
        <div className="w-full max-w-md">

          {/* ── Shield Icon ──────────────────────────────────────── */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <motion.div
                className="absolute -inset-3 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent, rgba(16,185,129,0.2), transparent, rgba(20,184,166,0.15), transparent)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 backdrop-blur-sm">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Shield className="size-9 text-emerald-400" strokeWidth={1.5} />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ── Title ────────────────────────────────────────────── */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Espace Administration
            </h1>
            <p className="mt-2 text-sm text-white/40 max-w-xs mx-auto leading-relaxed">
              Accédez au tableau de bord de gestion aéroportuaire
            </p>
          </motion.div>

          {/* ── Login Card ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.7, type: "spring", stiffness: 100 }}
          >
            <GlowingRing isError={error && pin.length > 0}>
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] p-8 shadow-2xl">
                {/* Lock Icon */}
                <motion.div
                  className="flex items-center justify-center mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    <Lock className="size-3.5 text-emerald-400/60" />
                    <span className="text-xs text-white/40 font-medium tracking-wider uppercase">
                      Connexion sécurisée
                    </span>
                    <Fingerprint className="size-3.5 text-emerald-400/60" />
                  </div>
                </motion.div>

                {/* PIN Dots */}
                <PinDots value={pin} error={error} />

                {/* Hidden Input */}
                <input
                  ref={inputRef}
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPin(val);
                    setError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  className="sr-only"
                  autoComplete="off"
                  autoFocus
                />

                {/* Numpad */}
                <motion.div
                  className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <motion.button
                      key={num}
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
                      whileTap={{ scale: 0.92 }}
                      className={cn(
                        "h-14 rounded-xl text-xl font-semibold text-white/80 transition-all duration-200",
                        "bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/20",
                        "active:bg-emerald-500/10 active:border-emerald-500/30"
                      )}
                      onClick={() => {
                        if (pin.length < 6) {
                          setPin((prev) => prev + num);
                          setError(false);
                        }
                      }}
                    >
                      {num}
                    </motion.button>
                  ))}
                  {/* Bottom row: empty, 0, delete */}
                  <div className="h-14" />
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.92 }}
                    className="h-14 rounded-xl text-xl font-semibold text-white/80 bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/20 transition-all"
                    onClick={() => {
                      if (pin.length < 6) {
                        setPin((prev) => prev + "0");
                        setError(false);
                      }
                    }}
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.92 }}
                    className="h-14 rounded-xl flex items-center justify-center text-white/40 bg-white/[0.04] border border-white/[0.06] hover:border-white/10 transition-all"
                    onClick={() => {
                      setPin((prev) => prev.slice(0, -1));
                      setError(false);
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                      <line x1="18" y1="9" x2="12" y2="15" />
                      <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                  </motion.button>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="flex items-center justify-center gap-2 mt-4"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                    >
                      <XCircle className="size-4 text-red-400" />
                      <span className="text-sm text-red-400 font-medium">
                        Code d&apos;accès incorrect
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions Row */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
                  >
                    {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {showPin ? "Masquer" : "Afficher"}
                  </button>
                  <motion.div
                    animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={pin.length < 4}
                      className={cn(
                        "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
                        "text-white border-0 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30",
                        "transition-all duration-300 disabled:opacity-30 disabled:shadow-none",
                        "flex items-center gap-2 px-6"
                      )}
                    >
                      Accéder
                      <ChevronRight className="size-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </GlowingRing>
          </motion.div>

          {/* ── Feature Highlights ─────────────────────────────── */}
          <div className="mt-8">
            <FeatureHighlights />
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <p className="text-xs text-white/20">
              AeroAssist v2.0 — Aéroports de Paris CDG & ORY
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/30">Système opérationnel</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
