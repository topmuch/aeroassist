"use client";

import { motion } from "framer-motion";
import {
  PlaneTakeoff,
  UtensilsCrossed,
  Crown,
  Car,
  ShoppingBag,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: PlaneTakeoff,
    title: "Infos Vols en Temps Réel",
    description:
      "Départs, arrivées, portes d'embarquement, retards et annulations — suivez votre vol en temps réel et recevez des notifications automatiques.",
    color: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurants & Boutiques",
    description:
      "Consultez les menus, horaires d'ouverture et pré-commandez vos repas directement depuis WhatsApp avant même d'arriver.",
    color: "from-amber-500 to-orange-500",
    shadowColor: "shadow-amber-500/20",
  },
  {
    icon: Crown,
    title: "Salons VIP & Hôtels",
    description:
      "Réservez instantanément votre accès aux salons VIP ou votre chambre d'hôtel à proximité de l'aéroport en quelques messages.",
    color: "from-purple-500 to-fuchsia-500",
    shadowColor: "shadow-purple-500/20",
  },
  {
    icon: Car,
    title: "Location & Transport",
    description:
      "Comparez et réservez des voitures, taxis, navettes ou transports en commun pour arriver et repartir sans stress.",
    color: "from-rose-500 to-pink-500",
    shadowColor: "shadow-rose-500/20",
  },
  {
    icon: ShoppingBag,
    title: "Duty-Free Shopping",
    description:
      "Parcourez le catalogue Duty-Free, pré-commandez vos articles et retirez-les à votre convenance avant le départ.",
    color: "from-cyan-500 to-emerald-500",
    shadowColor: "shadow-cyan-500/20",
  },
  {
    icon: Globe,
    title: "Support Multilingue",
    description:
      "Communiquez dans votre langue parmi les 15 langues disponibles. La traduction automatique assure une compréhension parfaite.",
    color: "from-teal-500 to-emerald-600",
    shadowColor: "shadow-teal-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function FeaturesSection() {
  return (
    <section id="services" className="relative py-24 sm:py-32 bg-background">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.04),_transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-700 mb-4">
            Nos Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Tout ce dont vous avez{" "}
            <span className="text-emerald-600">besoin</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Des services complets accessibles directement depuis WhatsApp,
            conçus pour rendre votre passage à l'aéroport aussi fluide que possible.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="group h-full border-transparent bg-card hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-default py-0 gap-0 overflow-hidden">
                {/* Icon bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${feature.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="pt-6">
                  <div
                    className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg ${feature.shadowColor}`}
                  >
                    <feature.icon className="size-6 text-white" />
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
