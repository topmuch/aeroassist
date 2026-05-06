'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Send, Bot, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface QuickAction {
  id: string
  label: string
  icon: string
  keywords: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'flights', label: 'Mes Vols', icon: '✈️', keywords: ['vol', 'flight', 'vols'] },
  { id: 'restaurants', label: 'Restaurants', icon: '🍽️', keywords: ['restaurant', 'manger', 'restauration'] },
  { id: 'dutyfree', label: 'Duty-Free', icon: '🛍️', keywords: ['duty', 'shop', 'boutique', 'magasin'] },
  { id: 'hotels', label: 'Hôtels', icon: '🏨', keywords: ['hôtel', 'hotel', 'hébergement'] },
  { id: 'transport', label: 'Transport', icon: '🚗', keywords: ['transport', 'voiture', 'taxi', 'bus', 'navette'] },
  { id: 'help', label: 'Aide', icon: '❓', keywords: ['aide', 'help', '?', 'information'] },
]

// ─── Fallback Response Generator (used when API is unavailable) ───────────────

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase()

  if (/vol|flight|vols|décollage|atterrissage|retard|annulé/.test(lower)) {
    return (
      `✈️ **Informations sur vos vols**

Voici l'état de vos vols aujourd'hui :

🔹 **AF 1234 — Paris CDG → New York JFK**
   • Terminal 2E | Porte K42
   • Départ prévu : 14h35
   • Statut : ✅ À l'heure

🔹 **AF 5678 — Paris ORY → Londres LHR**
   • Terminal 3 | Porte B12
   • Départ prévu : 16h10
   • Statut : ⚠️ Retard estimé 25 min

🔹 **AF 9012 — Marrakech RAK → Paris CDG**
   • Terminal 2A | Porte A08
   • Arrivée prévue : 18h45
   • Statut : ✅ En route

Souhaitez-vous recevoir une notification en cas de changement ? Je peux aussi vous guider vers votre porte d'embarquement. 🗺️`
    )
  }

  if (/restaurant|manger|restauration|déjeuner|dîner|café/.test(lower)) {
    return (
      `🍽️ **Recommandations Restaurants**

Voici les meilleures options disponibles à l'aéroport :

**🍽️ Restaurants Gastronomiques**
• **Le Chef's Table** — Terminal 2E, Hall L — À partir de 45€
• **Sushi Master** — Terminal 2F, Niveau Arrivées — 20-40€

**☕ Cafés & Bistros**
• **Café Parisien** — Terminal 1, Niveau Départs — 8-18€
• **Pret A Manger** — Toutes les zones transit — 6-12€

Voulez-vous une réservation ou des directions ? 📍`
    )
  }

  if (/duty|shop|boutique|magasin|acheter|shopping|parfum/.test(lower)) {
    return (
      `🛍️ **Boutiques Duty-Free**

Profitez de prix exclusifs sans taxes !

**💄 Beauté & Parfums** — Sephora (T2E & T2F), MAC (T2A)
**🍷 Spiritueux** — Nicolas (T2E), Fauchon (T2F)
**⌚ Montres** — Longines (T2E), Hermès (T2F)
**📱 Électronique** — Duty Free Tech (T2D) jusqu'à -20%

💡 *Présentez votre carte d'embarquement pour des réductions supplémentaires !*`
    )
  }

  if (/hôtel|hotel|hébergement|dormir|chambre/.test(lower)) {
    return (
      `🏨 **Hôtels & Hébergement**

**🌟 Hôtels à l'aéroport**
• **Hilton CDG** — Entre T2 et T3 — À partir de 140€/nuit — Navette 24h/24
• **Pullman CDG** — Terminal 2, Hall M — À partir de 160€/nuit
• **citizenM CDG** — Terminal 3 — À partir de 89€/nuit

**💤 Capsules** — YOTELAIR (T2E) à partir de 45€/4h

Puis-je vous aider à réserver ? 🛎️`
    )
  }

  if (/vip|salon|lounge|business|privé/.test(lower)) {
    return (
      `👑 **Salons VIP**

**🥂 Air France La Première** — T2E, Hall L (Accès billet Première)
**🌟 Air France Business** — T2E, Hall K & L (Billet Business / Flying Blue Gold+)
**🏛️ ADP Lounge** — T2E & 2F — Accès payant 40€/3h — Boissons, snacks, WiFi

Voulez-vous réserver un accès ? ✨`
    )
  }

  if (/transport|voiture|taxi|bus|navette|train|rer|parking/.test(lower)) {
    return (
      `🚗 **Options de Transport**

**🚕 Taxi** — Paris centre : 53-65€ (jour) / 65-78€ (nuit)
**🚌 RoissyBus** — Direct Opéra — 16,20€ — ~60 min
**🚆 RER B** — Paris centre — 11,45€ — ~35 min
**🅿️ Parking** — À partir de 24€/jour + navette gratuite

Où souhaitez-vous aller ? 🗺️`
    )
  }

  if (/aide|help|\?|information|comment/.test(lower)) {
    return (
      `❓ **Centre d'Aide AeroAssist**

✈️ Vols — 🍽️ Restaurants — 🛍️ Duty-Free — 🏨 Hôtels
🚗 Transport — 👑 Salons VIP — 📍 Navigation — 📋 Formalités

💡 Conseils : « Mon vol AF1234 est à quelle porte ? » | « Meilleur café du T2E ? » | « Comment aller au RER ? »

Comment puis-je vous aider ? 😊`
    )
  }

  return (
    `Merci pour votre message ! 🙏

Je suis AeroAssist, votre assistant intelligent pour les aéroports Paris CDG et Orly.

✈️ Suivre vos vols en temps réel | 🍽️ Trouver les meilleurs restaurants
🛍️ Comparer les boutiques duty-free | 🏨 Réserver un hôtel ou une capsule
🚗 Organiser votre transport | 👑 Accéder aux salons VIP

N'hésitez pas à me poser votre question directement ou utiliser les boutons ci-dessous ! 🇫🇷🇬🇧`
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-end gap-2 mb-4"
    >
      <Avatar className="size-8 shrink-0 bg-emerald-600">
        <AvatarFallback className="bg-emerald-600 text-white text-xs">
          <Plane className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-w-[75%]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block size-2 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && (
        <Avatar className="size-8 shrink-0 bg-emerald-600">
          <AvatarFallback className="bg-emerald-600 text-white text-xs">
            <Plane className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`
          relative max-w-[80%] sm:max-w-[70%] px-3.5 py-2.5 shadow-sm
          ${
            isUser
              ? 'bg-[#DCF8C6] dark:bg-emerald-900/70 text-gray-900 dark:text-emerald-50 rounded-2xl rounded-br-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md'
          }
        `}
      >
        <div className="text-[0.9rem] leading-relaxed whitespace-pre-line">
          {message.content.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <span key={i} className="font-semibold block mt-1.5 first:mt-0">
                  {line.replace(/\*\*/g, '')}
                </span>
              )
            }
            const parts = line.split(/(\*\*[^*]+\*\*)/g)
            return (
              <span key={i} className="block">
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <span key={j} className="font-semibold">
                        {part.replace(/\*\*/g, '')}
                      </span>
                    )
                  }
                  return <span key={j}>{part}</span>
                })}
              </span>
            )
          })}
        </div>

        <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[0.65rem] text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
          {isUser && (
            <svg className="size-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 16 11" fill="currentColor">
              <path d="M11.07 0.23c-0.29-0.22-0.67-0.29-1.02-0.17L3.57 2.5H0.75C0.34 2.5 0 2.84 0 3.25v4.5C0 8.16 0.34 8.5 0.75 8.5h2.82l6.48 2.44c0.12 0.05 0.24 0.07 0.37 0.07 0.23 0 0.45-0.07 0.64-0.23C11.77 10.49 12 10.12 12 9.72V1.28C12 0.88 11.77 0.51 11.07 0.23zM1 7.5V3.5h2v4H1zm10 2.22c0 0.11-0.06 0.2-0.16 0.26-0.1 0.07-0.21 0.08-0.32 0.04L4 8V4l6.52-2.02c0.11-0.04 0.22-0.02 0.32 0.04C11.44 2.08 11 2.17 11 2.28v7.44z" />
            </svg>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="size-8 shrink-0 bg-blue-600">
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  )
}

// ─── Quick Action Buttons ────────────────────────────────────────────────────

interface QuickActionsProps {
  onAction: (action: QuickAction) => void
  disabled: boolean
}

function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex items-end gap-2 mb-3"
    >
      <Avatar className="size-8 shrink-0 bg-emerald-600">
        <AvatarFallback className="bg-emerald-600 text-white text-xs">
          <Plane className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex gap-2 flex-wrap max-w-[80%] sm:max-w-[70%]">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const now = new Date()
    const secondMsgTime = new Date(now.getTime() + 500)
    return [
      {
        id: generateId(),
        content: '✈️ Bienvenue sur AeroAssist ! Je suis votre assistant aéroport intelligent propulsé par Groq.',
        sender: 'assistant',
        timestamp: now,
      },
      {
        id: generateId(),
        content: "Comment puis-je vous aider aujourd'hui ?",
        sender: 'assistant',
        timestamp: secondMsgTime,
      },
    ]
  })
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [useApi, setUseApi] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return

      const userMessage: ChatMessage = {
        id: generateId(),
        content: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setShowQuickActions(false)
      setIsTyping(true)

      if (useApi) {
        // Call real Groq API via backend
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            conversationId: conversationId,
            language: 'fr',
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.reply) {
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId)
              }
              const assistantMessage: ChatMessage = {
                id: generateId(),
                content: data.reply,
                sender: 'assistant',
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, assistantMessage])
            } else {
              // API error - use fallback
              setUseApi(false)
              const fallback = generateFallbackResponse(text.trim())
              const assistantMessage: ChatMessage = {
                id: generateId(),
                content: fallback,
                sender: 'assistant',
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, assistantMessage])
            }
            setIsTyping(false)
          })
          .catch(() => {
            // Network error - use fallback
            setUseApi(false)
            const fallback = generateFallbackResponse(text.trim())
            const assistantMessage: ChatMessage = {
              id: generateId(),
              content: fallback,
              sender: 'assistant',
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            setIsTyping(false)
          })
      } else {
        // Fallback local responses
        const typingDelay = 1000 + Math.random() * 1000
        setTimeout(() => {
          const response = generateFallbackResponse(text.trim())
          const assistantMessage: ChatMessage = {
            id: generateId(),
            content: response,
            sender: 'assistant',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
          setIsTyping(false)
        }, typingDelay)
      }
    },
    [isTyping, conversationId, useApi]
  )

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      handleSend(action.label)
    },
    [handleSend]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleSend(inputValue)
    },
    [handleSend, inputValue]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend(inputValue)
      }
    },
    [handleSend, inputValue]
  )

  return (
    <div className="w-full max-w-md mx-auto flex flex-col bg-gray-50 dark:bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-emerald-600 dark:bg-emerald-800 text-white shadow-md">
        <Avatar className="size-10 border-2 border-white/30">
          <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
            <Plane className="size-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[0.95rem] tracking-tight">AeroAssist</h1>
            <Bot className="size-3.5 opacity-80" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-green-300" />
            </span>
            <span className="text-xs text-emerald-100">
              En ligne · {useApi ? 'Groq IA' : 'Mode hors ligne'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-60">
          <div className="w-1 h-1.5 rounded-full bg-white" />
          <div className="w-1 h-2.5 rounded-full bg-white" />
          <div className="w-1 h-3.5 rounded-full bg-white" />
          <div className="w-1 h-[1.125rem] rounded-full bg-white" />
        </div>
      </header>

      {/* Chat Area */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div ref={scrollRef} className="h-[500px] overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 py-4 space-y-0">
              <div className="flex items-center justify-center mb-4">
                <span className="text-[0.7rem] text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-3 py-1 rounded-full shadow-sm">
                  Aujourd&apos;hui
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>

              {showQuickActions && messages.length === 2 && (
                <QuickActions onAction={handleQuickAction} disabled={isTyping} />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      >
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          placeholder={isTyping ? 'AeroAssist écrit...' : 'Écrivez un message...'}
          className="flex-1 h-10 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 dark:focus-visible:ring-emerald-500/30"
          autoComplete="off"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          size="icon"
          className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-md disabled:opacity-40 transition-all duration-150 active:scale-90"
          aria-label="Envoyer"
        >
          <Send className="size-5 -rotate-0" />
        </Button>
      </form>
    </div>
  )
}
