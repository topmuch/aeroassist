"use client";

import { motion } from "framer-motion";
import { Plane, MessageCircle, ArrowRight, Cloud, Users, Clock, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const floatingElements = [
  { id: "plane-1", icon: Plane, x: "10%", y: "20%", delay: 0, duration: 8 },
  { id: "plane-2", icon: Plane, x: "85%", y: "15%", delay: 2, duration: 10 },
  { id: "plane-3", icon: Plane, x: "75%", y: "70%", delay: 4, duration: 9 },
  { id: "cloud-1", icon: Cloud, x: "15%", y: "65%", delay: 1, duration: 12 },
  { id: "cloud-2", icon: Cloud, x: "70%", y: "30%", delay: 3, duration: 11 },
  { id: "cloud-3", icon: Cloud, x: "40%", y: "10%", delay: 5, duration: 13 },
];

const stats = [
  { icon: Users, value: "10K+", label: "Voyageurs" },
  { icon: Clock, value: "24/7", label: "Disponible" },
  { icon: Globe, value: "15", label: "Langues" },
  { icon: Zap, value: "50+", label: "Services" },
];

export default function HeroSection() {
  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(20,184,166,0.1),_transparent_50%)]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Floating elements */}
      {floatingElements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute text-white/[0.06] pointer-events-none select-none"
          style={{ left: el.x, top: el.y }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, 0, -10, 0],
            rotate: [0, 10, 0, -5, 0],
          }}
          transition={{
            duration: el.duration,
            delay: el.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <el.icon className="size-12 md:size-16 lg:size-20" />
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center pt-24 pb-32">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300 backdrop-blur-sm">
            <MessageCircle className="size-3.5" />
            Propulsé par WhatsApp & IA
          </div>
        </motion.div>

        {/* Animated Plane */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8 flex justify-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/30"
          >
            <Plane className="size-10 text-white -rotate-45" />
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]"
        >
          Votre Assistant
          <span className="block mt-2 bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
            Aéroport Intelligent
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-emerald-100/70 leading-relaxed"
        >
          Simplifiez chaque étape de votre voyage grâce à notre assistant IA
          directement sur WhatsApp. Infos vols, restaurants, salons VIP,
          transport — tout en un seul message.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white text-base px-8 py-6 rounded-xl shadow-xl shadow-[#25D366]/25 hover:shadow-2xl hover:shadow-[#25D366]/40 transition-all"
          >
            <MessageCircle className="size-5" />
            Démarrer sur WhatsApp
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-emerald-500/30 bg-white/5 text-white hover:bg-white/10 hover:text-white text-base px-8 py-6 rounded-xl backdrop-blur-sm transition-all"
          >
            Explorer les Services
            <ArrowRight className="size-4" />
          </Button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-16 mx-auto max-w-3xl"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x divide-white/10">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                  className="flex flex-col items-center gap-1 px-4 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <stat.icon className="size-4 text-emerald-400" />
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      {stat.value}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-emerald-200/60">
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
