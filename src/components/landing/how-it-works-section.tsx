"use client";

import { motion } from "framer-motion";
import { QrCode, MessageSquareText, PartyPopper } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: QrCode,
    title: "Scannez le QR Code",
    description:
      "Repérez les QR codes AeroAssist dans les terminaux, sur les écrans d'information ou sur nos affiches. Scannez simplement avec votre téléphone pour lancer la conversation WhatsApp.",
  },
  {
    number: "02",
    icon: MessageSquareText,
    title: "Discutez avec l'IA",
    description:
      "Posez votre question en langage naturel dans la langue de votre choix. Notre assistant intelligent comprend le contexte de votre vol et vous guide personnellement.",
  },
  {
    number: "03",
    icon: PartyPopper,
    title: "Profitez de vos services",
    description:
      "Recevez des réponses instantanées, réservez vos services et suivez vos commandes en temps réel. Tout se gère directement dans votre conversation WhatsApp.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="relative py-24 sm:py-32 bg-muted/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(20,184,166,0.05),_transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-teal-700 mb-4">
            Simplicité
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Comment ça{" "}
            <span className="text-teal-600">marche</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Trois étapes simples pour accéder à tous les services de l'aéroport
            sans télécharger aucune application supplémentaire.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative grid gap-8 md:grid-cols-3 md:gap-12"
        >
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[72px] left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-[2px] bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-300 opacity-30" />

          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="relative flex flex-col items-center text-center"
            >
              {/* Numbered circle */}
              <div className="relative mb-6">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20">
                  <step.icon className="size-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-emerald-500 shadow-sm">
                  <span className="text-xs font-bold text-emerald-600">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Content */}
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
