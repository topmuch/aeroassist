import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with secret header
    if (process.env.NODE_ENV === "production") {
      const secret = request.headers.get("x-seed-secret");
      if (secret !== process.env.SEED_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // Clean existing data (order matters for FK constraints)
    await db.analyticsEvent.deleteMany();
    await db.auditLog.deleteMany();
    await db.message.deleteMany();
    await db.reservation.deleteMany();
    await db.conversation.deleteMany();
    await db.flight.deleteMany();
    await db.knowledgeBaseEntry.deleteMany();
    await db.module.deleteMany();
    await db.systemConfig.deleteMany();
    await db.user.deleteMany();
    await db.whatsAppTemplate.deleteMany();
    await db.whatsAppContact.deleteMany();

    // ── 1. Seed Users ──────────────────────────────────────────
    const users = await Promise.all([
      db.user.create({
        data: {
          name: 'Marie Dupont',
          email: 'marie.dupont@email.fr',
          phone: '+33612345678',
          role: 'superadmin',
          language: 'fr',
          isVerified: true,
          isActive: true,
          lastLogin: new Date(),
        },
      }),
      db.user.create({
        data: {
          name: 'Jean-Pierre Martin',
          email: 'jp.martin@aeroport-cdg.fr',
          phone: '+33623456789',
          role: 'admin',
          language: 'fr',
          isVerified: true,
          isActive: true,
          lastLogin: new Date(Date.now() - 3600000),
        },
      }),
      db.user.create({
        data: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+447890123456',
          role: 'traveler',
          language: 'en',
          isVerified: true,
          isActive: true,
          lastLogin: new Date(Date.now() - 86400000),
        },
      }),
      db.user.create({
        data: {
          name: 'Carlos Rodriguez',
          email: 'carlos.rodriguez@email.es',
          phone: '+34612345678',
          role: 'traveler',
          language: 'es',
          isVerified: false,
          isActive: true,
        },
      }),
      db.user.create({
        data: {
          name: 'Aisha Benali',
          email: 'aisha.benali@email.fr',
          phone: '+33634567890',
          role: 'partner',
          language: 'fr',
          isVerified: true,
          isActive: true,
          lastLogin: new Date(Date.now() - 172800000),
        },
      }),
      db.user.create({
        data: {
          name: 'Thomas Weber',
          email: 'thomas.weber@email.de',
          phone: '+4915112345678',
          role: 'traveler',
          language: 'de',
          isVerified: true,
          isActive: false,
        },
      }),
      db.user.create({
        data: {
          name: 'Léa Fontaine',
          email: 'lea.fontaine@lounge-paris.fr',
          phone: '+33645678901',
          role: 'partner',
          language: 'fr',
          isVerified: true,
          isActive: true,
        },
      }),
    ]);

    // ── 2. Seed Flights ────────────────────────────────────────
    const now = new Date();
    const flightsData = [
      {
        flightNumber: 'AF1234', airline: 'Air France',
        departure: 'CDG', arrival: 'JFK',
        scheduledDep: new Date(now.getTime() + 2 * 3600000),
        scheduledArr: new Date(now.getTime() + (2 + 8.5) * 3600000),
        status: 'boarding', gate: 'A12', terminal: 'T2E',
      },
      {
        flightNumber: 'AF567', airline: 'Air France',
        departure: 'ORY', arrival: 'FCO',
        scheduledDep: new Date(now.getTime() + 4 * 3600000),
        scheduledArr: new Date(now.getTime() + (4 + 2) * 3600000),
        status: 'scheduled', gate: 'B05', terminal: 'T3',
      },
      {
        flightNumber: 'LH1234', airline: 'Lufthansa',
        departure: 'FRA', arrival: 'CDG',
        scheduledDep: new Date(now.getTime() - 2 * 3600000),
        scheduledArr: new Date(now.getTime() - (2 - 1.5) * 3600000),
        status: 'arrived', gate: 'C23', terminal: 'T1',
        actualArr: new Date(now.getTime() - 1.3 * 3600000),
      },
      {
        flightNumber: 'EK73', airline: 'Emirates',
        departure: 'CDG', arrival: 'DXB',
        scheduledDep: new Date(now.getTime() + 6 * 3600000),
        scheduledArr: new Date(now.getTime() + (6 + 7) * 3600000),
        status: 'scheduled', gate: 'A34', terminal: 'T2E',
      },
      {
        flightNumber: 'BA304', airline: 'British Airways',
        departure: 'LHR', arrival: 'CDG',
        scheduledDep: new Date(now.getTime() - 3 * 3600000),
        scheduledArr: new Date(now.getTime() - (3 - 1.25) * 3600000),
        status: 'arrived', gate: 'B17', terminal: 'T2A',
      },
      {
        flightNumber: 'U28543', airline: 'EasyJet',
        departure: 'CDG', arrival: 'BCN',
        scheduledDep: new Date(now.getTime() + 1 * 3600000),
        scheduledArr: new Date(now.getTime() + (1 + 2) * 3600000),
        status: 'delayed', gate: 'D08', terminal: 'T2D',
      },
      {
        flightNumber: 'FR2541', airline: 'Ryanair',
        departure: 'ORY', arrival: 'AGP',
        scheduledDep: new Date(now.getTime() + 3 * 3600000),
        scheduledArr: new Date(now.getTime() + (3 + 2.5) * 3600000),
        status: 'scheduled', gate: 'C12', terminal: 'T4',
      },
      {
        flightNumber: 'KL1245', airline: 'KLM Royal Dutch Airlines',
        departure: 'AMS', arrival: 'CDG',
        scheduledDep: new Date(now.getTime() - 1 * 3600000),
        scheduledArr: new Date(now.getTime() - (1 - 1.25) * 3600000),
        status: 'arrived', gate: 'A05', terminal: 'T2F',
      },
      {
        flightNumber: 'IB3412', airline: 'Iberia',
        departure: 'CDG', arrival: 'MAD',
        scheduledDep: new Date(now.getTime() - 0.5 * 3600000),
        scheduledArr: new Date(now.getTime() + 2 * 3600000),
        status: 'departed', gate: 'B22', terminal: 'T2D',
        actualDep: new Date(now.getTime() - 0.4 * 3600000),
      },
      {
        flightNumber: 'TK1821', airline: 'Turkish Airlines',
        departure: 'IST', arrival: 'CDG',
        scheduledDep: new Date(now.getTime() - 5 * 3600000),
        scheduledArr: new Date(now.getTime() - (5 - 3.5) * 3600000),
        status: 'cancelled', gate: null, terminal: 'T1',
      },
      {
        flightNumber: 'LX1053', airline: 'Swiss International',
        departure: 'CDG', arrival: 'ZRH',
        scheduledDep: new Date(now.getTime() + 5 * 3600000),
        scheduledArr: new Date(now.getTime() + (5 + 1.25) * 3600000),
        status: 'scheduled', gate: 'C31', terminal: 'T2E',
      },
      {
        flightNumber: 'AT553', airline: 'Royal Air Maroc',
        departure: 'CMN', arrival: 'CDG',
        scheduledDep: new Date(now.getTime() + 2 * 3600000),
        scheduledArr: new Date(now.getTime() + (2 + 3) * 3600000),
        status: 'boarding', gate: 'A19', terminal: 'T2C',
      },
      {
        flightNumber: 'QR084', airline: 'Qatar Airways',
        departure: 'CDG', arrival: 'DOH',
        scheduledDep: new Date(now.getTime() + 8 * 3600000),
        scheduledArr: new Date(now.getTime() + (8 + 6.5) * 3600000),
        status: 'scheduled', gate: 'A41', terminal: 'T1',
      },
      {
        flightNumber: 'TO3254', airline: 'Transavia',
        departure: 'ORY', arrival: 'LIS',
        scheduledDep: new Date(now.getTime() + 7 * 3600000),
        scheduledArr: new Date(now.getTime() + (7 + 2.5) * 3600000),
        status: 'scheduled', gate: 'D15', terminal: 'T3',
      },
    ];

    const flights = await db.flight.createMany({
      data: flightsData,
    });

    // ── 3. Seed Knowledge Base Entries ─────────────────────────
    const knowledgeEntries = await Promise.all([
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Comment vérifier le statut de mon vol',
          content: 'Vous pouvez vérifier le statut de votre vol en fournissant votre numéro de vol (ex: AF1234) à notre assistant. Vous recevrez des informations en temps réel sur les départs et arrivées, y compris les portes d\'embarquement, les terminaux et tout retard éventuel. Vous pouvez également consulter les écrans d\'information dans les terminaux CDG et ORY.',
          category: 'flights',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[0].id,
          version: 2,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Restaurants et cafés au Terminal 2E',
          content: 'Le Terminal 2E de CDG propose une variété de restaurants : Le Grand Comptoir (cuisine française), Pause Café (salades et sandwiches), Chez Flo (poissonnerie), Pink Mamma (italien), et nhiều autres. Les horaires varient entre 5h30 et 22h00 selon les établissements. Consultez notre assistant pour des recommandations personnalisées.',
          category: 'restaurants',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[1].id,
          version: 1,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Duty Free - Boutiques hors taxes',
          content: 'Les boutiques Duty Free sont disponibles dans les terminaux 1, 2A-2F et 2G de CDG, ainsi qu\'à Orly Sud et Ouest. Profitez de réductions sur parfums, cosmétiques, alcool, tabac, montres et accessoires de luxe. Les boutiques sont ouvertes de 6h00 à 21h30 (22h00 en été). Présentez votre carte d\'embarquement pour bénéficier des prix hors taxes.',
          category: 'shops',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[1].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Accès WiFi gratuit à l\'aéroport',
          content: 'Le WiFi gratuit est disponible dans tous les terminaux de CDG et ORY. Connectez-vous au réseau "WiFi PARIS AEROPORT", acceptez les conditions d\'utilisation et profitez d\'un accès illimité. Pour une connexion plus rapide, des forfaits premium sont disponibles à 3€/heure ou 8€/jour. Des bornes de recharge USB sont également disponibles près des portes d\'embarquement.',
          category: 'services',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[0].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Salon VIP - Accès et réservation',
          content: 'Les salons VIP sont accessibles aux voyageurs de classe Affaires, membres des programmes de fidélité, ou par achat d\'un accès. Le salon Air France à CDG T2E propose buffet, douche, zones de travail et Wi-Fi. Tarif : 45€ pour un accès, 75€ avec douche. Réservez via notre assistant WhatsApp pour un accès garanti.',
          category: 'services',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[4].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Transport entre CDG et Paris centre',
          content: 'Plusieurs options de transport : RER B (35 min, 11.80€), RoissyBus (60 min, 16.60€), taxi (45-60 min, tarif fixe 53€ rive droite / 58€ rive gauche), Uber/Bolt (40-70€ selon trafic), navette partagée (18-25€). Le RER B fonctionne de 4h56 à 23h40. La nuit, le Noctilien N140 assure la liaison.',
          category: 'transport',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[0].id,
          version: 3,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Bagages perdus - Procédure',
          content: 'En cas de bagage perdu : 1) Rendez-vous au comptoir PIR (Property Irregularity Report) dans le hall arrivées de votre terminal. 2) Présentez votre carte d\'embarquement et étiquette de bagage. 3) Remplissez le rapport PIR. 4) Recevez un numéro de dossier pour suivre en ligne. Délai de traitement : 5 jours ouvrés en moyenne. Compensation possible après 21 jours.',
          category: 'services',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[1].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Règles de sécurité et contrôles',
          content: 'Contrôle de sécurité : arrivez 2h30 avant le départ. Liquides : max 100ml par contenant dans un sac transparent 20x20cm. Appareils électroniques >15" : sortez-les des bagages. Aliments : autorisés mais peuvent nécessiter un contrôle supplémentaire. Objets interdits : couteaux, ciseaux >6cm, outils, produits inflammables. Portez des chaussures faciles à retirer.',
          category: 'general',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[0].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Services pour voyageurs à mobilité réduite',
          content: 'Un service d\'assistance PMR est disponible gratuitement sur réservation (48h minimum). Contactez votre compagnie aérienne ou appelez le 0 810 10 19 39. Points de rencontre dans chaque terminal. Fauteuils roulants, assistance à l\'embarquement, transfert entre terminaux. Chiens guides d\'aveugles acceptés en cabine.',
          category: 'services',
          status: 'validated',
          ownerId: users[1].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Parking à CDG - Tarifs et réservation',
          content: 'Parkings CDG : Eco (à partir de 8€/jour), Premium (13€/jour), Proximité (20€/jour), Kiss & Fly (10€ pour 10 min). Réservation en ligne recommandée (-15%). Navette gratuite entre parkings et terminaux. Parking couvert et surveillé 24h/24. Bornes de recharge électrique disponibles dans le parking Premium.',
          category: 'transport',
          status: 'published',
          publishedAt: new Date(),
          ownerId: users[0].id,
        },
      }),
      db.knowledgeBaseEntry.create({
        data: {
          title: 'Location de voitures - Comparatif',
          content: 'Les principales agences de location sont situées au Terminal 2 (Avis, Hertz, Europcar, Sixt, Enterprise) et au Terminal 1. Tarifs à partir de 35€/jour (économique) à 120€/jour (premium). Réservation recommandée. Navette gratuite vers le parc de location. Pensez au GPS et au siège auto si nécessaire.',
          category: 'transport',
          status: 'draft',
          ownerId: users[4].id,
        },
      }),
    ]);

    // ── 4. Seed Modules ────────────────────────────────────────
    const modules = await Promise.all([
      db.module.create({
        data: {
          name: 'Salon VIP',
          slug: 'vip_lounge',
          description: 'Gestion des réservations et accès aux salons VIP des aéroports parisiens',
          isActive: true,
          config: JSON.stringify({
            pricing: { single: 45, with_shower: 75, annual: 1200 },
            partner: 'AeroClub Paris',
            maxCapacity: 80,
            amenities: ['buffet', 'shower', 'wifi', 'workspace', 'spa'],
          }),
          partnerId: users[4].id,
        },
      }),
      db.module.create({
        data: {
          name: 'Marketplace',
          slug: 'marketplace',
          description: 'Marketplace pour les restaurants et services de l\'aéroport',
          isActive: true,
          config: JSON.stringify({
            categories: ['restaurants', 'cafes', 'bars', 'food_court'],
            commission: 0.12,
            deliveryAvailable: true,
            minOrderAmount: 10,
          }),
          partnerId: users[4].id,
        },
      }),
      db.module.create({
        data: {
          name: 'Duty Free Shopping',
          slug: 'duty_free',
          description: 'Boutiques hors taxes et promotions exclusives',
          isActive: false,
          config: JSON.stringify({
            categories: ['perfumes', 'cosmetics', 'alcohol', 'tobacco', 'watches', 'accessories'],
            discountRates: { gold: 0.15, platinum: 0.25 },
            preOrderAvailable: true,
          }),
          partnerId: users[6].id,
        },
      }),
      db.module.create({
        data: {
          name: 'Hôtels & Transferts',
          slug: 'hotels',
          description: 'Réservation d\'hôtels et transferts aéroport',
          isActive: false,
          config: JSON.stringify({
            hotelPartners: ['Novotel', 'ibis', 'Hilton', 'Marriott', 'CitizenM'],
            transferTypes: ['taxi', 'private', 'shuttle', 'limousine'],
            bookingWindow: { min: 2, max: 90, unit: 'days' },
          }),
        },
      }),
    ]);

    // ── 5. Seed Conversations & Messages ───────────────────────
    const conversations = await Promise.all([
      db.conversation.create({
        data: {
          whatsappId: 'wa_33789012345',
          userId: users[2].id,
          status: 'active',
          language: 'en',
          lastMessage: new Date(),
        },
      }),
      db.conversation.create({
        data: {
          whatsappId: 'wa_33634567890',
          userId: users[4].id,
          status: 'active',
          language: 'fr',
          lastMessage: new Date(Date.now() - 3600000),
        },
      }),
      db.conversation.create({
        data: {
          whatsappId: 'wa_34612345678',
          userId: users[3].id,
          status: 'closed',
          language: 'es',
          lastMessage: new Date(Date.now() - 86400000),
        },
      }),
      db.conversation.create({
        data: {
          whatsappId: 'wa_33612345678',
          userId: users[0].id,
          status: 'active',
          language: 'fr',
          lastMessage: new Date(Date.now() - 1800000),
        },
      }),
    ]);

    // Seed messages for each conversation
    const messagePairs: Array<{
      conversationId: string;
      userMsg: string;
      aiMsg: string;
      intent: string;
      ageHours: number;
    }> = [
      {
        conversationId: conversations[0].id,
        userMsg: 'Hi, can you tell me about my flight AF1234 to New York?',
        aiMsg: 'Hello! ✈️ Your flight AF1234 to New York JFK is currently **boarding** at gate A12, Terminal 2E. The scheduled departure time is 14:30. Please proceed to your gate. Have a wonderful flight! 🌟',
        intent: 'flight_status',
        ageHours: 0.5,
      },
      {
        conversationId: conversations[0].id,
        userMsg: 'Thanks! Where can I get something to eat near gate A12?',
        aiMsg: 'Near gate A12 in Terminal 2E, you have several great options: 🍽️ **Le Grand Comptoir** (French cuisine, 10 min walk), **Pause Café** (quick sandwiches & salads, 5 min walk), and **Pink Mamma** (Italian, 8 min walk). All are currently open. Bon appétit! 😊',
        intent: 'restaurant_recommendation',
        ageHours: 0.4,
      },
      {
        conversationId: conversations[1].id,
        userMsg: 'Bonjour, je voudrais réserver un accès au salon VIP pour demain.',
        aiMsg: 'Bonjour Aisha! 🛋️ Bien sûr, je peux vous aider à réserver un accès au salon VIP. Voici nos options :\n\n• **Accès standard** - 45€ (buffet, WiFi, zones de travail)\n• **Accès premium** - 75€ (tout inclus + douche et spa)\n\nQuelle date et combien de personnes souhaitez-vous réserver ?',
        intent: 'reservation',
        ageHours: 2,
      },
      {
        conversationId: conversations[1].id,
        userMsg: '2 personnes en accès premium pour demain à 10h, s\'il vous plaît.',
        aiMsg: 'Parfait ! Je vous prépare votre réservation :\n\n📋 **Réservation Salon VIP**\n• Date : Demain\n• Heure : 10h00\n• Personnes : 2\n• Formule : Premium (avec douche et spa)\n• Total : 150€ (2 × 75€)\n\nJe vous envoie la confirmation sous peu. Vous pouvez payer directement au salon ou en ligne. Acceptez-vous cette réservation ? ✅',
        intent: 'reservation',
        ageHours: 1.5,
      },
      {
        conversationId: conversations[2].id,
        userMsg: 'Hola, he perdido mi equipaje. ¿Qué puedo hacer?',
        aiMsg: '¡Hola Carlos! Lo siento mucho por el inconveniente. 🧳 Aquí están los pasos a seguir:\n\n1. **Dirígete al mostrador PIR** (Property Irregularity Report) en el hall de llegadas\n2. **Presenta** tu tarjeta de embarque y etiqueta de equipaje\n3. **Rellena** el informe PIR\n4. **Recibirás** un número para seguimiento en línea\n\nTiempo medio de resolución: 5 días laborables. ¿Necesitas más ayuda para encontrar el mostrador en tu terminal? 📍',
        intent: 'lost_baggage',
        ageHours: 24,
      },
      {
        conversationId: conversations[2].id,
        userMsg: 'Sí, estoy en la Terminal 2E, llegadas internacionales.',
        aiMsg: '¡Perfecto! En la **Terminal 2E - Llegadas Internacionales**, el mostrador PIR se encuentra:\n\n📍 **Zona B - Nivel de llegadas**, justo después del control de pasaportes, a la derecha.\n\nHorario: 6:00 - 22:00\n📞 Teléfono: 01 48 62 12 12\n\nSi el mostrador ya está cerrado, puedes hacer el reporte online en worldtracer.aero/luggage. ¡Espero que encuentren tu equipaje pronto! 🤞',
        intent: 'service_info',
        ageHours: 23.5,
      },
      {
        conversationId: conversations[3].id,
        userMsg: 'Comment aller de CDG à l\'Opéra le plus rapidement ?',
        aiMsg: 'Bonjour Marie ! 🚇 Voici les options les plus rapides de CDG à l\'Opéra :\n\n1. **RER B** → Station Châtelet → Ligne 7 vers Opéra (environ 50 min, 11.80€)\n2. **RoissyBus** → Opéra direct (environ 60 min, 16.60€) ⭐ *Recommandé*\n3. **Taxi** → Environ 45 min, tarif fixe **58€** (rive gauche)\n\nLe RoissyBus est le plus simple : pas de correspondance, il arrive directement place de l\'Opéra ! 🚌',
        intent: 'transport_info',
        ageHours: 0.5,
      },
    ];

    const messageCreates = messagePairs.flatMap((pair) => [
      db.message.create({
        data: {
          conversationId: pair.conversationId,
          direction: 'inbound',
          content: pair.userMsg,
          messageType: 'text',
          intent: pair.intent,
          confidence: 0.88,
          isRead: true,
          createdAt: new Date(Date.now() - pair.ageHours * 3600000 - 60000),
        },
      }),
      db.message.create({
        data: {
          conversationId: pair.conversationId,
          direction: 'outbound',
          content: pair.aiMsg,
          messageType: 'text',
          intent: pair.intent,
          confidence: 0.92,
          isRead: true,
          createdAt: new Date(Date.now() - pair.ageHours * 3600000),
        },
      }),
    ]);

    await Promise.all(messageCreates);

    // ── 6. Seed Reservations ───────────────────────────────────
    const reservations = await Promise.all([
      db.reservation.create({
        data: {
          userId: users[4].id,
          type: 'vip_lounge',
          status: 'confirmed',
          reference: 'VIP-2024-001',
          details: JSON.stringify({
            lounge: 'Salon Air France T2E',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: '10:00',
            guests: 2,
            package: 'premium_with_shower',
          }),
          totalAmount: 150,
          currency: 'EUR',
          paymentStatus: 'paid',
          paidAt: new Date(),
          conversationId: conversations[1].id,
        },
      }),
      db.reservation.create({
        data: {
          userId: users[2].id,
          type: 'hotel',
          status: 'confirmed',
          reference: 'HTL-2024-002',
          details: JSON.stringify({
            hotel: 'Novotel Paris CDG Terminal',
            checkIn: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            checkOut: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
            roomType: 'standard_double',
            guests: 2,
          }),
          totalAmount: 129,
          currency: 'EUR',
          paymentStatus: 'pending',
          conversationId: conversations[0].id,
        },
      }),
      db.reservation.create({
        data: {
          userId: users[3].id,
          type: 'car_rental',
          status: 'pending',
          reference: 'CAR-2024-003',
          details: JSON.stringify({
            company: 'Europcar',
            category: 'economique',
            pickupDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            pickupTime: '14:00',
            duration: 5,
            addons: ['GPS', 'siege_auto'],
          }),
          totalAmount: 245,
          currency: 'EUR',
          paymentStatus: 'pending',
          conversationId: conversations[2].id,
        },
      }),
      db.reservation.create({
        data: {
          userId: users[5].id,
          type: 'duty_free',
          status: 'completed',
          reference: 'DF-2024-004',
          details: JSON.stringify({
            items: [
              { name: 'Chanel N°5 100ml', price: 89.90 },
              { name: 'Macallan 12 ans', price: 54.50 },
            ],
            terminal: 'T2E',
            pickupPoint: 'Duty Free Gate A42',
          }),
          totalAmount: 144.4,
          currency: 'EUR',
          paymentStatus: 'paid',
          paidAt: new Date(Date.now() - 86400000),
        },
      }),
      db.reservation.create({
        data: {
          userId: users[0].id,
          type: 'vip_lounge',
          status: 'completed',
          reference: 'VIP-2024-005',
          details: JSON.stringify({
            lounge: 'Salon KLM T2F',
            date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
            time: '08:30',
            guests: 1,
            package: 'standard',
          }),
          totalAmount: 45,
          currency: 'EUR',
          paymentStatus: 'paid',
          paidAt: new Date(Date.now() - 3 * 86400000),
        },
      }),
    ]);

    // ── 7. Seed Analytics Events ───────────────────────────────
    const eventTypes = [
      'message_sent',
      'message_received',
      'intent_detected',
      'reservation_created',
      'escalation',
    ];
    const analyticsEvents = [];
    const epochNow = Date.now();

    // Generate events for the last 14 days
    for (let day = 13; day >= 0; day--) {
      const dayTimestamp = epochNow - day * 86400000;
      const eventsPerDay = 8 + Math.floor(Math.random() * 15);
      for (let i = 0; i < eventsPerDay; i++) {
        const eventType =
          eventTypes[Math.floor(Math.random() * (eventTypes.length - 1))]; // less escalations
        const randomOffset = Math.floor(Math.random() * 86400000);

        analyticsEvents.push({
          eventType,
          metadata: eventType === 'intent_detected'
            ? JSON.stringify({ intent: ['flight_status', 'restaurant_recommendation', 'transport_info', 'general_inquiry', 'reservation', 'service_info'][Math.floor(Math.random() * 6)] })
            : eventType === 'reservation_created'
              ? JSON.stringify({ type: ['vip_lounge', 'hotel', 'car_rental', 'duty_free'][Math.floor(Math.random() * 4)] })
              : null,
          createdAt: new Date(dayTimestamp + randomOffset),
        });
      }

      // Add some escalation events (fewer)
      if (Math.random() > 0.6) {
        analyticsEvents.push({
          eventType: 'escalation',
          metadata: JSON.stringify({
            reason: ['complex_query', 'complaint', 'lost_baggage'][Math.floor(Math.random() * 3)],
          }),
          createdAt: new Date(dayTimestamp + Math.floor(Math.random() * 43200000)),
        });
      }
    }

    // Batch insert in chunks to avoid SQLite limits
    const chunkSize = 100;
    for (let i = 0; i < analyticsEvents.length; i += chunkSize) {
      const chunk = analyticsEvents.slice(i, i + chunkSize);
      await db.analyticsEvent.createMany({ data: chunk });
    }

    // ── 8. Seed System Config ──────────────────────────────────
    await Promise.all([
      db.systemConfig.create({
        data: { key: 'bot_name', value: 'AeroAssist', type: 'string' },
      }),
      db.systemConfig.create({
        data: { key: 'default_language', value: 'fr', type: 'string' },
      }),
      db.systemConfig.create({
        data: { key: 'max_conversation_age_hours', value: '72', type: 'number' },
      }),
      db.systemConfig.create({
        data: { key: 'auto_close_enabled', value: 'true', type: 'boolean' },
      }),
      db.systemConfig.create({
        data: {
          key: 'supported_languages',
          value: JSON.stringify(['fr', 'en', 'es', 'de', 'it', 'pt', 'ar']),
          type: 'json',
        },
      }),
      db.systemConfig.create({
        data: { key: 'escalation_timeout_minutes', value: '5', type: 'number' },
      }),
    ]);

    // ── 9. Seed Audit Logs ─────────────────────────────────────
    await Promise.all([
      db.auditLog.create({
        data: {
          userId: users[0].id,
          action: 'user.create',
          resource: 'User',
          details: JSON.stringify({ targetName: 'Thomas Weber' }),
        },
      }),
      db.auditLog.create({
        data: {
          userId: users[1].id,
          action: 'knowledge.publish',
          resource: 'KnowledgeBaseEntry',
          details: JSON.stringify({ title: 'WiFi gratuit à l\'aéroport', category: 'services' }),
        },
      }),
      db.auditLog.create({
        data: {
          userId: users[0].id,
          action: 'module.activate',
          resource: 'Module',
          details: JSON.stringify({ name: 'Salon VIP', slug: 'vip_lounge' }),
        },
      }),
      db.auditLog.create({
        data: {
          userId: users[0].id,
          action: 'system.seed',
          resource: 'System',
          details: JSON.stringify({ description: 'Database seeded with demo data' }),
        },
      }),
    ]);

    // ── 10. Seed WhatsApp Templates ────────────────────────────
    const whatsappTemplates = await Promise.all([
      db.whatsAppTemplate.create({
        data: {
          name: 'flight_status_update',
          displayName: '✈️ Mise à jour de vol',
          category: 'UTILITY',
          language: 'fr',
          status: 'approved',
          bodyText: '✈️ *AeroAssist — Mise à jour de vol*\n\nVol : {{1}}\nCompagnie : {{2}}\nDépart : {{3}} → {{4}}\nHeure prévue : {{5}}\nPorte : {{6}}\nTerminal : {{7}}\nStatut : {{8}}\n\n_Retrouvez plus d\'infos en envoyant le numéro de vol._',
          components: JSON.stringify([
            { type: 'body', parameters: [{ type: 'text', text: 'AF1234' }] },
          ]),
        },
      }),
      db.whatsAppTemplate.create({
        data: {
          name: 'booking_confirmation',
          displayName: '📋 Confirmation de réservation',
          category: 'UTILITY',
          language: 'fr',
          status: 'approved',
          bodyText: '📋 *Confirmation de réservation*\n\nRéf : {{1}}\nType : {{2}}\nDate : {{3}}\nDétails : {{4}}\nMontant : {{5}}€\n\n✅ Réservation confirmée !\n_Contactez-nous pour toute modification._',
          components: JSON.stringify([
            { type: 'body', parameters: [{ type: 'text', text: 'VIP-2024-001' }] },
          ]),
        },
      }),
      db.whatsAppTemplate.create({
        data: {
          name: 'payment_receipt',
          displayName: '🧾 Reçu de paiement',
          category: 'AUTHENTICATION',
          language: 'fr',
          status: 'approved',
          bodyText: '🧾 *Reçu de paiement*\n\nRéf : {{1}}\nMontant : {{2}}€\nDate : {{3}}\nMode : {{4}}\nStatut : *Payé* ✅\n\n_Merci pour votre confiance !_',
          components: JSON.stringify([
            { type: 'body', parameters: [{ type: 'text', text: 'PAY-001' }] },
          ]),
        },
      }),
      db.whatsAppTemplate.create({
        data: {
          name: 'welcome_message',
          displayName: '👋 Message de bienvenue',
          category: 'MARKETING',
          language: 'fr',
          status: 'approved',
          bodyText: '👋 *Bienvenue sur AeroAssist !*\n\nVotre assistant aéroport pour CDG et ORY.\n\nComment puis-je vous aider ?\n\n1️⃣ Statut de vol\n2️⃣ Restaurants\n3️⃣ Boutiques\n4️⃣ Transports\n5️⃣ Réservations\n\n_Tapez votre question ou un numéro !_',
          components: JSON.stringify([]),
        },
      }),
      db.whatsAppTemplate.create({
        data: {
          name: 'delay_notification',
          displayName: '⏰ Notification de retard',
          category: 'UTILITY',
          language: 'fr',
          status: 'submitted',
          bodyText: '⏰ *Notification de retard*\n\nVol : {{1}}\nRetard estimé : {{2}}\nNouvelle heure : {{3}}\nPorte : {{4}}\n\n_Nous vous tiendrons informé de toute évolution._',
          components: JSON.stringify([
            { type: 'body', parameters: [{ type: 'text', text: 'U28543' }] },
          ]),
        },
      }),
      db.whatsAppTemplate.create({
        data: {
          name: 'boarding_reminder',
          displayName: '🚶 Rappel d\'embarquement',
          category: 'UTILITY',
          language: 'fr',
          status: 'approved',
          bodyText: '🚶 *Rappel d\'embarquement*\n\nVol : {{1}}\nPorte : {{2}}\nTerminal : {{3}}\nEmbarquement à : {{4}}\n\n⚠️ *Rendez-vous à la porte dès maintenant !*\n_Pensez à votre carte d\'embarquement et pièce d\'identité._',
          components: JSON.stringify([
            { type: 'body', parameters: [{ type: 'text', text: 'AF1234' }] },
          ]),
        },
      }),
    ]);

    // ── 11. Seed WhatsApp Contacts ─────────────────────────────
    const whatsappContacts = await Promise.all([
      db.whatsAppContact.create({
        data: {
          phoneNumber: '+33612345678',
          pushName: 'Marie Dupont',
          language: 'fr',
          isOptIn: true,
          messageCount: 12,
          lastSeenAt: new Date(),
        },
      }),
      db.whatsAppContact.create({
        data: {
          phoneNumber: '+447890123456',
          pushName: 'Sarah Johnson',
          language: 'en',
          isOptIn: true,
          messageCount: 8,
          lastSeenAt: new Date(Date.now() - 1800000),
        },
      }),
      db.whatsAppContact.create({
        data: {
          phoneNumber: '+33634567890',
          pushName: 'Aisha Benali',
          language: 'fr',
          isOptIn: true,
          messageCount: 5,
          lastSeenAt: new Date(Date.now() - 3600000),
        },
      }),
      db.whatsAppContact.create({
        data: {
          phoneNumber: '+34612345678',
          pushName: 'Carlos Rodriguez',
          language: 'es',
          isOptIn: true,
          messageCount: 3,
          lastSeenAt: new Date(Date.now() - 86400000),
        },
      }),
      db.whatsAppContact.create({
        data: {
          phoneNumber: '+33698765432',
          pushName: 'Spam Bot',
          language: 'fr',
          isOptIn: false,
          isBlacklisted: true,
          messageCount: 45,
          lastSeenAt: new Date(Date.now() - 172800000),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with demo data',
      summary: {
        users: users.length,
        flights: flights.count,
        knowledgeEntries: knowledgeEntries.length,
        modules: modules.length,
        conversations: conversations.length,
        messages: messagePairs.length * 2,
        reservations: reservations.length,
        analyticsEvents: analyticsEvents.length,
        systemConfigs: 6,
        auditLogs: 4,
        whatsappTemplates: whatsappTemplates.length,
        whatsappContacts: whatsappContacts.length,
      },
    });
  } catch (error) {
    console.error('[Seed API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to seed database',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
