"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plane, Menu, MessageCircle, Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ViewType = "landing" | "chat" | "admin";

interface NavbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const mainNavLinks: { label: string; view: ViewType; icon: React.ElementType }[] = [
  { label: "Accueil", view: "landing", icon: Home },
  { label: "Chat WhatsApp", view: "chat", icon: MessageCircle },
  { label: "Administration", view: "admin", icon: Shield },
];

const sectionLinks = [
  { label: "Accueil", href: "#accueil" },
  { label: "Services", href: "#services" },
  { label: "Comment ça marche", href: "#comment-ca-marche" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar({ currentView, onViewChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentView]);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border"
          : currentView !== "landing"
          ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => onViewChange("landing")}
          className="flex items-center gap-2 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-600/25 transition-shadow group-hover:shadow-lg group-hover:shadow-emerald-600/40">
            <Plane className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Aero<span className="text-emerald-600">Assist</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {currentView === "landing" ? (
            <>
              {sectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:text-foreground hover:bg-accent"
                >
                  {link.label}
                </a>
              ))}
            </>
          ) : (
            <>
              {mainNavLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.view}
                    onClick={() => onViewChange(link.view)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                      currentView === link.view
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {currentView === "landing" ? (
            <Button
              onClick={() => onViewChange("chat")}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/25 hover:shadow-lg hover:shadow-[#25D366]/40 transition-all"
            >
              <MessageCircle className="size-4 mr-2" />
              Accès WhatsApp
            </Button>
          ) : currentView === "chat" ? (
            <Button
              onClick={() => onViewChange("admin")}
              variant="outline"
              className="shadow-sm"
            >
              <Shield className="size-4 mr-2" />
              Administration
            </Button>
          ) : (
            <Button
              onClick={() => onViewChange("chat")}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/25"
            >
              <MessageCircle className="size-4 mr-2" />
              Chat WhatsApp
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Plane className="size-4" />
                  </div>
                  AeroAssist
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 mt-4">
                {/* Main navigation */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Navigation
                </p>
                {mainNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <SheetClose asChild key={link.view}>
                      <button
                        onClick={() => onViewChange(link.view)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                          currentView === link.view
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="size-5" />
                        {link.label}
                      </button>
                    </SheetClose>
                  );
                })}

                {/* Landing page sections */}
                {currentView === "landing" && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                      Sections
                    </p>
                    {sectionLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <a
                          href={link.href}
                          className="flex items-center rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    ))}
                  </>
                )}

                <div className="mt-4 pt-4 border-t">
                  <SheetClose asChild>
                    <Button
                      onClick={() => onViewChange("chat")}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"
                    >
                      <MessageCircle className="size-4 mr-2" />
                      Accès WhatsApp
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
