/**
 * OpenBSP Bridge - WhatsApp API Simulator
 *
 * Simulates the OpenBSP WhatsApp API for local development.
 * In production, serves as the actual bridge between OpenBSP and AeroAssist.
 *
 * Port: 3001
 *
 * Endpoints:
 *   GET  /health              - Health check with session info
 *   POST /api/sendMessage     - Send text message
 *   POST /api/sendFile        - Send media message
 *   GET  /api/qr              - QR code status (simulated)
 *   GET  /api/sessions        - List active sessions
 *   POST /api/simulate/incoming - Simulate incoming message → forwards to AeroAssist webhook
 */

// ── Configuration ────────────────────────────────────────────────────────────

const PORT = 3001;
const AEROASSIST_WEBHOOK_URL = process.env.AEROASSIST_WEBHOOK_URL || "http://localhost:3000/api/webhook/openbsp";
const INSTANCE_NAME = process.env.INSTANCE_NAME || "aeroassist-main";

// ── In-Memory Stores ─────────────────────────────────────────────────────────

interface Session {
  id: string;
  phone: string;
  name: string;
  status: "connected" | "connecting" | "disconnected";
  connectedAt: number;
  lastActivity: number;
}

interface SentMessage {
  messageId: string;
  chatId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  timestamp: number;
  direction: "outbound";
  status: "sent" | "delivered" | "read" | "failed";
}

interface IncomingMessage {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  pushName: string;
  message: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  timestamp: number;
  forwardedToAeroAssist: boolean;
  aeroAssistResponse?: {
    status: number;
    ok: boolean;
  };
}

// Default session (simulates a connected WhatsApp session)
const sessions: Session[] = [
  {
    id: "session_main_001",
    phone: "33612345678",
    name: "AeroAssist Main",
    status: "connected",
    connectedAt: Date.now() - 86400000, // 1 day ago
    lastActivity: Date.now(),
  },
];

const sentMessages: SentMessage[] = [];
const incomingMessages: IncomingMessage[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateMessageId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `wa_${seg(8)}_${seg(4)}`;
}

function generateMessageIdLong(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Powered-By": "OpenBSP-Bridge/1.0",
    },
  });
}

function log(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  console.log(`[${timestamp}] ${level}: ${message}${metaStr}`);
}

// ── Route Handlers ───────────────────────────────────────────────────────────

/** GET /health */
function handleHealth(): Response {
  const connectedSessions = sessions.filter((s) => s.status === "connected");
  return jsonResponse({
    status: "ok",
    service: "openbsp-bridge",
    version: "1.0.0",
    port: PORT,
    uptime: process.uptime(),
    timestamp: Date.now(),
    sessions: {
      total: sessions.length,
      connected: connectedSessions.length,
      details: connectedSessions.map((s) => ({
        id: s.id,
        phone: s.phone,
        name: s.name,
        connectedAt: s.connectedAt,
        lastActivity: s.lastActivity,
      })),
    },
    stats: {
      sentMessages: sentMessages.length,
      receivedMessages: incomingMessages.length,
    },
    aeroAssist: {
      webhookUrl: AEROASSIST_WEBHOOK_URL,
      instance: INSTANCE_NAME,
    },
  });
}

/** POST /api/sendMessage */
async function handleSendMessage(body: unknown): Promise<Response> {
  const data = body as Record<string, unknown>;

  // Validate required fields
  const chatId = data.chatId as string | undefined;
  const text = data.text as string | undefined;

  if (!chatId || !text) {
    return jsonResponse(
      {
        status: false,
        error: "Missing required fields: chatId and text are required",
      },
      400
    );
  }

  const messageId = generateMessageId();
  const timestamp = Math.floor(Date.now() / 1000);

  // Simulate sending: forward to AeroAssist for processing
  let processingStatus = "simulated";
  try {
    const forwardPayload = {
      event: "messages.upsert",
      instance: INSTANCE_NAME,
      data: {
        key: {
          remoteJid: chatId,
          fromMe: true,
          id: messageId,
        },
        message: {
          conversation: text,
        },
        messageTimestamp: timestamp,
        pushName: "AeroAssist Bot",
      },
    };

    // Fire-and-forget forwarding to AeroAssist
    fetch(AEROASSIST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardPayload),
    }).catch((err) => {
      log("WARN", "Failed to forward sent message to AeroAssist", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    processingStatus = "forwarded";
  } catch {
    processingStatus = "simulated";
  }

  // Store sent message
  const sentMessage: SentMessage = {
    messageId,
    chatId,
    content: text,
    timestamp,
    direction: "outbound",
    status: "sent",
  };
  sentMessages.push(sentMessage);

  log("INFO", "Message sent", {
    messageId,
    chatId,
    textLength: text.length,
    processingStatus,
  });

  return jsonResponse({
    status: true,
    messageId,
    chatId,
    timestamp,
  });
}

/** POST /api/sendFile */
async function handleSendFile(body: unknown): Promise<Response> {
  const data = body as Record<string, unknown>;

  const chatId = data.chatId as string | undefined;
  const url = data.url as string | undefined;
  const mediaType = (data.mediaType as string) || "image";
  const caption = data.caption as string | undefined;
  const fileName = data.fileName as string | undefined;
  const mimetype = data.mimetype as string | undefined;

  if (!chatId || !url) {
    return jsonResponse(
      {
        status: false,
        error: "Missing required fields: chatId and url are required",
      },
      400
    );
  }

  const messageId = generateMessageId();
  const timestamp = Math.floor(Date.now() / 1000);

  // Store sent message
  const sentMessage: SentMessage = {
    messageId,
    chatId,
    content: url,
    mediaUrl: url,
    mediaType,
    caption,
    timestamp,
    direction: "outbound",
    status: "sent",
  };
  sentMessages.push(sentMessage);

  log("INFO", "Media sent", {
    messageId,
    chatId,
    mediaType,
    caption: caption || undefined,
    fileName: fileName || undefined,
  });

  return jsonResponse({
    status: true,
    messageId,
    chatId,
    timestamp,
    media: {
      url,
      mediaType,
      caption,
      fileName,
      mimetype,
    },
  });
}

/** GET /api/qr */
function handleQr(): Response {
  // Simulated QR code status - in dev, always "connected"
  return jsonResponse({
    status: "connected",
    message: "WhatsApp session is connected (simulated)",
    qrCode: null, // null when connected; would contain base64 QR when not connected
    instance: INSTANCE_NAME,
    connectedAt: sessions[0]?.connectedAt || null,
    batteryLevel: 85 + Math.floor(Math.random() * 15), // Simulated battery
    pushName: "AeroAssist Bot",
  });
}

/** GET /api/sessions */
function handleSessions(): Response {
  return jsonResponse({
    status: true,
    sessions: sessions.map((s) => ({
      id: s.id,
      phone: s.phone,
      name: s.name,
      status: s.status,
      connectedAt: s.connectedAt,
      lastActivity: s.lastActivity,
      uptimeSeconds: Math.floor((Date.now() - s.connectedAt) / 1000),
    })),
    total: sessions.length,
  });
}

/** POST /api/simulate/incoming */
async function handleSimulateIncoming(body: unknown): Promise<Response> {
  const data = body as Record<string, unknown>;

  // Accept flexible input - could be a full OpenBSP payload or simplified fields
  const remoteJid = (data.remoteJid || data.chatId || "33612345678@s.whatsapp.net") as string;
  const pushName = (data.pushName || data.name || data.from || "Jean Dupont") as string;
  const text = data.text as string | undefined;
  const mediaType = data.mediaType as string | undefined;
  const mediaUrl = data.mediaUrl as string | undefined;
  const mediaCaption = data.caption as string | undefined;
  const fromMe = (data.fromMe as boolean) || false;

  if (!text && !mediaUrl) {
    return jsonResponse(
      {
        status: false,
        error: "Missing required field: text or mediaUrl is required",
      },
      400
    );
  }

  const messageId = generateMessageIdLong();
  const timestamp = Math.floor(Date.now() / 1000);

  // Build the OpenBSP-format webhook payload for AeroAssist
  let messagePayload: Record<string, unknown>;

  if (mediaType && mediaUrl) {
    // Media message
    messagePayload = {
      imageMessage: {
        url: mediaUrl,
        mimetype: data.mimetype || `image/${mediaType === "video" ? "mp4" : "jpeg"}`,
        caption: mediaCaption || text || "",
        fileName: data.fileName || null,
      },
    };
  } else {
    // Text message
    messagePayload = {
      conversation: text,
    };
  }

  const webhookPayload = {
    event: "messages.upsert",
    instance: INSTANCE_NAME,
    data: {
      key: {
        remoteJid: ensureJidFormat(remoteJid),
        fromMe,
        id: messageId,
      },
      message: messagePayload,
      messageTimestamp: timestamp,
      pushName,
    },
  };

  // Store incoming message
  const incomingMsg: IncomingMessage = {
    id: messageId,
    remoteJid: ensureJidFormat(remoteJid),
    fromMe,
    pushName,
    message: text || "[media]",
    mediaType,
    mediaUrl,
    mediaCaption,
    timestamp,
    forwardedToAeroAssist: false,
  };

  // Forward to AeroAssist webhook
  let forwardResult: { status: number; ok: boolean } | undefined;
  try {
    log("INFO", "Forwarding incoming message to AeroAssist", {
      to: AEROASSIST_WEBHOOK_URL,
      messageId,
      remoteJid,
    });

    const response = await fetch(AEROASSIST_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OpenBSP-Secret": process.env.AEROASSIST_WEBHOOK_SECRET || process.env.OPENBSP_WEBHOOK_SECRET || "aeroassist_secret_2024",
      },
      body: JSON.stringify(webhookPayload),
    });

    forwardResult = {
      status: response.status,
      ok: response.ok,
    };

    incomingMsg.forwardedToAeroAssist = response.ok;
    incomingMsg.aeroAssistResponse = forwardResult;

    log("INFO", "AeroAssist webhook response", {
      messageId,
      status: response.status,
      ok: response.ok,
    });

    // Try to read the response body for debugging
    const responseBody = await response.text().catch(() => "");
    if (responseBody) {
      log("INFO", "AeroAssist response body", {
        messageId,
        body: responseBody.slice(0, 500),
      });
    }
  } catch (err) {
    log("WARN", "Failed to forward to AeroAssist", {
      error: err instanceof Error ? err.message : String(err),
      messageId,
    });
    forwardResult = {
      status: 0,
      ok: false,
    };
    incomingMsg.forwardedToAeroAssist = false;
    incomingMsg.aeroAssistResponse = forwardResult;
  }

  incomingMessages.push(incomingMsg);

  return jsonResponse({
    status: true,
    messageId,
    forwarded: incomingMsg.forwardedToAeroAssist,
    aeroAssistStatus: forwardResult,
    payload: webhookPayload,
  });
}

/** GET /api/messages - list all messages (sent + received) */
function handleMessages(): Response {
  return jsonResponse({
    sent: sentMessages.slice(-50), // Last 50 sent messages
    received: incomingMessages.slice(-50), // Last 50 received messages
    stats: {
      totalSent: sentMessages.length,
      totalReceived: incomingMessages.length,
      totalForwarded: incomingMessages.filter((m) => m.forwardedToAeroAssist).length,
    },
  });
}

/** GET /api/contacts - list known contacts from messages */
function handleContacts(): Response {
  const contactMap = new Map<string, { phone: string; name: string; lastSeen: number; messageCount: number }>();

  for (const msg of incomingMessages) {
    const phone = msg.remoteJid.split("@")[0];
    if (!contactMap.has(phone)) {
      contactMap.set(phone, {
        phone,
        name: msg.pushName,
        lastSeen: msg.timestamp,
        messageCount: 0,
      });
    }
    const entry = contactMap.get(phone)!;
    entry.lastSeen = Math.max(entry.lastSeen, msg.timestamp);
    entry.messageCount++;
  }

  for (const msg of sentMessages) {
    const phone = msg.chatId.split("@")[0];
    if (!contactMap.has(phone)) {
      contactMap.set(phone, {
        phone,
        name: phone,
        lastSeen: msg.timestamp,
        messageCount: 0,
      });
    }
    const entry = contactMap.get(phone)!;
    entry.lastSeen = Math.max(entry.lastSeen, msg.timestamp);
    entry.messageCount++;
  }

  return jsonResponse({
    status: true,
    contacts: Array.from(contactMap.values()).sort((a, b) => b.lastSeen - a.lastSeen),
    total: contactMap.size,
  });
}

// ── Utility: ensure JID format ──────────────────────────────────────────────

function ensureJidFormat(jid: string): string {
  // If already in @s.whatsapp.net format, return as-is
  if (jid.includes("@")) return jid;
  // Otherwise append the suffix
  return `${jid}@s.whatsapp.net`;
}

// ── Router ───────────────────────────────────────────────────────────────────

async function router(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  log("INFO", `${method} ${pathname}`, {
    userAgent: request.headers.get("user-agent")?.slice(0, 60),
  });

  try {
    // ── Health ──
    if (method === "GET" && pathname === "/health") {
      return handleHealth();
    }

    // ── QR Code Status ──
    if (method === "GET" && pathname === "/api/qr") {
      return handleQr();
    }

    // ── Sessions ──
    if (method === "GET" && pathname === "/api/sessions") {
      return handleSessions();
    }

    // ── Send Message ──
    if (method === "POST" && pathname === "/api/sendMessage") {
      const body = await request.json().catch(() => null);
      if (!body) return jsonResponse({ status: false, error: "Invalid JSON body" }, 400);
      return handleSendMessage(body);
    }

    // ── Send File ──
    if (method === "POST" && pathname === "/api/sendFile") {
      const body = await request.json().catch(() => null);
      if (!body) return jsonResponse({ status: false, error: "Invalid JSON body" }, 400);
      return handleSendFile(body);
    }

    // ── Simulate Incoming ──
    if (method === "POST" && pathname === "/api/simulate/incoming") {
      const body = await request.json().catch(() => null);
      if (!body) return jsonResponse({ status: false, error: "Invalid JSON body" }, 400);
      return handleSimulateIncoming(body);
    }

    // ── Messages List ──
    if (method === "GET" && pathname === "/api/messages") {
      return handleMessages();
    }

    // ── Contacts List ──
    if (method === "GET" && pathname === "/api/contacts") {
      return handleContacts();
    }

    // ── 404 ──
    return jsonResponse(
      {
        status: false,
        error: "Not Found",
        availableEndpoints: [
          "GET  /health",
          "GET  /api/qr",
          "GET  /api/sessions",
          "GET  /api/messages",
          "GET  /api/contacts",
          "POST /api/sendMessage",
          "POST /api/sendFile",
          "POST /api/simulate/incoming",
        ],
      },
      404
    );
  } catch (error) {
    log("ERROR", "Unhandled error", {
      path: pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      {
        status: false,
        error: "Internal Server Error",
      },
      500
    );
  }
}

// ── Server Startup ───────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  fetch: router,
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🌉 OpenBSP Bridge - WhatsApp API               ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Status:    ✅ Running                                     ║
║  Port:      ${PORT}                                          ║
║  Instance:  ${INSTANCE_NAME}                          ║
║  PID:       ${process.pid}                                     ║
║                                                           ║
║  Endpoints:                                               ║
║    GET  /health                 → Health check            ║
║    GET  /api/qr                 → QR code status          ║
║    GET  /api/sessions           → List sessions           ║
║    GET  /api/messages           → Message history         ║
║    GET  /api/contacts           → Known contacts          ║
║    POST /api/sendMessage        → Send text message       ║
║    POST /api/sendFile           → Send media message      ║
║    POST /api/simulate/incoming  → Simulate incoming msg   ║
║                                                           ║
║  AeroAssist Webhook:                                      ║
║    ${AEROASSIST_WEBHOOK_URL}   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
