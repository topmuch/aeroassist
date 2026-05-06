"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar, { type ViewType } from "@/components/landing/navbar";
import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import HowItWorksSection from "@/components/landing/how-it-works-section";
import FaqSection from "@/components/landing/faq-section";
import CtaSection from "@/components/landing/cta-section";
import AeroAssistChat from "@/components/chat/aeroassist-chat";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { Plane, Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Plane className="size-8" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">AeroAssist</h2>
          <p className="text-sm text-muted-foreground mt-1">Chargement de l&apos;application...</p>
        </div>
        <Loader2 className="size-5 text-emerald-600 animate-spin" />
      </motion.div>
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("landing");
  const [mounted, setMounted] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  const handleAdminAuthenticated = useCallback(() => {
    setAdminAuthenticated(true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    setAdminAuthenticated(false);
    setCurrentView("landing");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {currentView !== "admin" && (
        <Navbar
          currentView={currentView}
          onViewChange={setCurrentView}
          adminAuthenticated={adminAuthenticated}
          onAdminAuthenticated={handleAdminAuthenticated}
          onAdminLogout={handleAdminLogout}
        />
      )}

      <AnimatePresence mode="wait">
        {currentView === "landing" && (
          <motion.main
            key="landing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="pt-16"
          >
            <HeroSection onViewChange={(v) => setCurrentView(v as ViewType)} />
            <FeaturesSection />
            <HowItWorksSection />
            <FaqSection />
            <CtaSection onViewChange={(v) => setCurrentView(v as ViewType)} />
          </motion.main>
        )}

        {currentView === "chat" && (
          <motion.main
            key="chat"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="pt-16"
          >
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/20 dark:from-[#060a13] dark:via-[#0a1020] dark:to-[#060a13]">
              <AeroAssistChat />
            </div>
          </motion.main>
        )}

        {currentView === "admin" && (
          <motion.main
            key="admin"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-screen overflow-hidden"
          >
            <AdminDashboard onLogout={handleAdminLogout} />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
