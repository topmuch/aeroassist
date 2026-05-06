"use client";

import { motion } from "framer-motion";
import { Plane, MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onViewChange: (view: string) => void;
}

export default function CTASection({ onViewChange }: CTASectionProps) {
  return (
    <section id="cta" className="relative overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-gray-950 to-emerald-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,211,102,0.08),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main CTA content */}
        <div className="flex flex-col items-center py-20 sm:py-28 text-center">
          {/* WhatsApp icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/15 border border-[#25D366]/20">
              <MessageCircle className="size-8 text-[#25D366]" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-3xl"
          >
            Prêt à simplifier{" "}
            <span className="text-[#25D366]">votre voyage</span> ?
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 max-w-xl text-lg text-gray-300/70"
          >
            AeroAssist est votre assistant intelligent pour tous vos besoins aéroportuaires.
            Commencez maintenant en scannant le QR code.
          </motion.p>

          {/* CTA + QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-8"
          >
            {/* QR Code Visual */}
            <div className="relative">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-2xl shadow-black/30">
                <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                  <div className="text-center">
                    <QrCode className="size-12 text-gray-400 mx-auto mb-1" />
                    <span className="text-[10px] font-medium text-gray-500">
                      Scan me
                    </span>
                  </div>
                </div>
              </div>
              {/* Pulse ring */}
              <div className="absolute -inset-3 rounded-2xl border-2 border-[#25D366]/20 animate-pulse" />
            </div>

            {/* Button group */}
            <div className="flex flex-col items-center sm:items-start gap-4">
              <Button
                size="lg"
                onClick={() => onViewChange("chat")}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-base px-10 py-7 rounded-xl shadow-xl shadow-[#25D366]/25 hover:shadow-2xl hover:shadow-[#25D366]/40 transition-all"
              >
                <MessageCircle className="size-5" />
                Démarrer sur WhatsApp
              </Button>
              <p className="text-xs text-gray-400 max-w-[240px]">
                Aucune application à installer. Fonctionne directement
                avec WhatsApp sur votre téléphone.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white">
                <Plane className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-white">
                Aero<span className="text-emerald-400">Assist</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
                Mentions légales
              </button>
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
                Politique de confidentialité
              </button>
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
                Conditions d&apos;utilisation
              </button>
            </div>

            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} AeroAssist. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
