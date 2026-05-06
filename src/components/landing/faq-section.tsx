"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Comment fonctionne AeroAssist ?",
    answer:
      "AeroAssist est un assistant intelligent accessible directement via WhatsApp. Il suffit de scanner un QR code dans l'un des terminaux de l'aéroport ou de cliquer sur notre lien de contact. Vous pouvez ensuite poser vos questions en langage naturel, et notre IA vous guide en temps réel pour tous vos besoins : informations de vol, réservation de restaurants, salons VIP, transport et bien plus encore. Aucune application supplémentaire n'est nécessaire.",
  },
  {
    question: "AeroAssist est-il gratuit ?",
    answer:
      "L'utilisation de base d'AeroAssist est entièrement gratuite. Vous pouvez consulter les informations de vol, poser vos questions et recevoir des recommandations sans aucun frais. Certaines prestations premium comme l'accès aux salons VIP, la réservation d'hôtels ou les commandes Duty-Free sont facturées au tarif normal du prestataire — AeroAssist ne prélève aucun supplément.",
  },
  {
    question: "Quelles langues sont supportées ?",
    answer:
      "AeroAssist supporte actuellement 15 langues : français, anglais, espagnol, allemand, italien, portugais, néerlandais, arabe, chinois (mandarin), japonais, coréen, russe, hindi, turc et polonais. Notre système de traduction automatique permet une communication fluide quelle que soit votre langue maternelle, et vous pouvez changer de langue à tout moment en cours de conversation.",
  },
  {
    question: "Comment réserver un salon VIP ?",
    answer:
      "Il vous suffit de demander à AeroAssist « Je souhaite réserver un salon VIP ». L'assistant vous présentera les salons disponibles dans votre terminal avec leurs tarifs, aménités et disponibilités en temps réel. Vous pouvez filtrer par budget, durée d'accès ou équipements souhaités (douche, WiFi, buffet, etc.). La réservation est confirmée en un seul message et votre accès est délivré sous forme de QR code.",
  },
  {
    question: "Puis-je suivre mon vol en temps réel ?",
    answer:
      "Oui, AeroAssist vous permet de suivre n'importe quel vol en temps réel. Communiquez simplement votre numéro de vol (par exemple « AF1234 ») et vous recevrez instantanément les informations de départ ou d'arrivée, la porte d'embarquement, le terminal, le statut du vol (à l'heure, retardé, embarquement) et la position de l'avion sur une carte. Vous pouvez également activer les notifications automatiques pour recevoir des alertes en cas de changement.",
  },
  {
    question: "Comment fonctionne le Duty-Free pré-commandé ?",
    answer:
      "Avec AeroAssist, vous pouvez parcourir le catalogue Duty-Free complet directement dans WhatsApp. Demandez « Montre-moi le catalogue Duty-Free » et naviguez par catégorie (parfums, cosmétiques, alcool, tabac, accessoires). Une fois votre sélection effectuée, validez votre commande et payez en ligne. Vos articles seront prêts à être retirés à votre convenance au point de collecte dédié avant votre embarquement — finie la file d'attente !",
  },
  {
    question: "Mes données personnelles sont-elles sécurisées ?",
    answer:
      "Absolument. La protection de vos données est notre priorité absolue. AeroAssist est conforme au Règlement Général sur la Protection des Données (RGPD). Vos données de conversation sont chiffrées de bout en bout via WhatsApp. Nous ne partageons aucune information personnelle avec des tiers sans votre consentement explicite. Vous pouvez demander la suppression de toutes vos données à tout moment en envoyant « Supprimer mes données » à l'assistant. Notre politique de confidentialité complète est disponible sur demande.",
  },
  {
    question: "Comment contacter un agent humain ?",
    answer:
      "Si l'assistant IA ne peut pas résoudre votre problème, vous pouvez à tout moment demander à parler à un agent humain en tapant « Je souhaite parler à un agent » ou « Transférer à un conseiller ». Un agent du service client sera alors joint à votre conversation WhatsApp dans un délai moyen de 2 minutes, disponible 24h/24 et 7j/7. Le contexte de votre conversation avec l'IA sera transmis à l'agent pour une prise en charge rapide et efficace.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.04),_transparent_70%)]" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-700 mb-4">
            Assistance
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Questions{" "}
            <span className="text-emerald-600">Fréquentes</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Retrouvez les réponses aux questions les plus courantes sur
            AeroAssist et ses fonctionnalités.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border-border/60"
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline hover:text-emerald-700 transition-colors py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
