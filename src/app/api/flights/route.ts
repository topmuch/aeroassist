import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const flightQuerySchema = z.object({
  type: z.enum(['departures', 'arrivals']).optional(),
  status: z
    .enum(['scheduled', 'delayed', 'cancelled', 'boarding', 'departed', 'arrived'])
    .optional(),
  search: z.string().optional(),
});

// Realistic mock flight data generator
function generateMockFlights() {
  const airlines = [
    { name: 'Air France', code: 'AF' },
    { name: 'Lufthansa', code: 'LH' },
    { name: 'Emirates', code: 'EK' },
    { name: 'British Airways', code: 'BA' },
    { name: 'EasyJet', code: 'U2' },
    { name: 'Ryanair', code: 'FR' },
    { name: 'KLM Royal Dutch Airlines', code: 'KL' },
    { name: 'Iberia', code: 'IB' },
    { name: 'Turkish Airlines', code: 'TK' },
    { name: 'Swiss International', code: 'LX' },
    { name: 'Alitalia', code: 'AZ' },
    { name: 'Delta Air Lines', code: 'DL' },
    { name: 'United Airlines', code: 'UA' },
    { name: 'Cathay Pacific', code: 'CX' },
    { name: 'Qatar Airways', code: 'QR' },
    { name: 'Porter Airlines', code: 'PD' },
    { name: 'Transavia', code: 'TO' },
    { name: 'Vueling', code: 'VY' },
    { name: 'Royal Air Maroc', code: 'AT' },
    { name: 'Ethiopian Airlines', code: 'ET' },
  ];

  const destinations = [
    { code: 'JFK', city: 'New York', country: 'États-Unis' },
    { code: 'LAX', city: 'Los Angeles', country: 'États-Unis' },
    { code: 'LHR', city: 'Londres Heathrow', country: 'Royaume-Uni' },
    { code: 'FRA', city: 'Francfort', country: 'Allemagne' },
    { code: 'MUC', city: 'Munich', country: 'Allemagne' },
    { code: 'FCO', city: 'Rome Fiumicino', country: 'Italie' },
    { code: 'MAD', city: 'Madrid Barajas', country: 'Espagne' },
    { code: 'AMS', city: 'Amsterdam Schiphol', country: 'Pays-Bas' },
    { code: 'DXB', city: 'Dubai', country: 'Émirats Arabes Unis' },
    { code: 'IST', city: 'Istanbul', country: 'Turquie' },
    { code: 'NRT', city: 'Tokyo Narita', country: 'Japon' },
    { code: 'HKG', city: 'Hong Kong', country: 'Chine' },
    { code: 'DOH', city: 'Doha', country: 'Qatar' },
    { code: 'YYZ', city: 'Toronto Pearson', country: 'Canada' },
    { code: 'CMN', city: 'Casablanca', country: 'Maroc' },
    { code: 'ADD', city: 'Addis-Abeba', country: 'Éthiopie' },
    { code: 'ZRH', city: 'Zurich', country: 'Suisse' },
    { code: 'BCN', city: 'Barcelone', country: 'Espagne' },
    { code: 'AGP', city: 'Malaga', country: 'Espagne' },
    { code: 'LIS', city: 'Lisbonne', country: 'Portugal' },
    { code: 'TLS', city: 'Toulouse', country: 'France' },
    { code: 'MRS', city: 'Marseille', country: 'France' },
    { code: 'NCE', city: 'Nice', country: 'France' },
    { code: 'LYS', city: 'Lyon', country: 'France' },
  ];

  const statuses: Array<{
    status: string;
    delay: number | null;
    early: number | null;
  }> = [
    { status: 'scheduled', delay: null, early: null },
    { status: 'boarding', delay: null, early: null },
    { status: 'delayed', delay: 30 + Math.floor(Math.random() * 90), early: null },
    { status: 'delayed', delay: 15 + Math.floor(Math.random() * 60), early: null },
    { status: 'cancelled', delay: null, early: null },
    { status: 'departed', delay: null, early: Math.floor(Math.random() * 15) },
    { status: 'arrived', delay: null, early: Math.floor(Math.random() * 20) },
  ];

  const now = new Date();
  const flights = [];

  for (let i = 0; i < 30; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNum = `${airline.code}${100 + Math.floor(Math.random() * 900)}`;
    const dest = destinations[Math.floor(Math.random() * destinations.length)];
    const statusObj = statuses[Math.floor(Math.random() * statuses.length)];
    const isDeparture = Math.random() > 0.5;
    const airport = Math.random() > 0.5 ? 'CDG' : 'ORY';
    const terminal = airport === 'CDG' ? `T${Math.floor(Math.random() * 3) + 1}` : `T${Math.floor(Math.random() * 4) + 1}`;
    const gate = `${terminal[1]}${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`;

    const hourOffset = -4 + Math.floor(Math.random() * 8);
    const scheduledTime = new Date(now.getTime() + hourOffset * 60 * 60 * 1000);

    let scheduledDep: Date;
    let scheduledArr: Date;
    let departure: string;
    let arrival: string;

    if (isDeparture) {
      departure = airport;
      arrival = dest.code;
      scheduledDep = scheduledTime;
      scheduledArr = new Date(scheduledTime.getTime() + (60 + Math.floor(Math.random() * 480)) * 60 * 1000);
    } else {
      departure = dest.code;
      arrival = airport;
      scheduledArr = scheduledTime;
      scheduledDep = new Date(scheduledTime.getTime() - (60 + Math.floor(Math.random() * 480)) * 60 * 1000);
    }

    let actualDep: Date | null = null;
    let actualArr: Date | null = null;

    if (statusObj.status === 'departed') {
      actualDep = new Date(
        scheduledDep.getTime() + (statusObj.early ? -statusObj.early * 60000 : 0)
      );
    } else if (statusObj.status === 'arrived') {
      actualArr = new Date(
        scheduledArr.getTime() + (statusObj.early ? -statusObj.early * 60000 : 0)
      );
      actualDep = new Date(scheduledDep.getTime());
    }

    flights.push({
      id: `flight_mock_${i}`,
      flightNumber: flightNum,
      airline: airline.name,
      departure,
      arrival,
      scheduledDep,
      scheduledArr,
      actualDep,
      actualArr,
      status: statusObj.status,
      gate,
      terminal,
    });
  }

  return flights;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const parsed = flightQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type, status, search } = parsed.data;

    // Try to get flights from DB first
    const dbFlights = await db.flight.findMany({
      where: {
        ...(status && { status }),
        ...(search && { flightNumber: { contains: search.toUpperCase() } }),
      },
      orderBy: { scheduledDep: 'asc' },
    });

    // If DB has flights, filter and return them
    if (dbFlights.length > 0) {
      const filtered = dbFlights.filter((f) => {
        if (type === 'departures') {
          return ['CDG', 'ORY'].includes(f.departure);
        }
        if (type === 'arrivals') {
          return ['CDG', 'ORY'].includes(f.arrival);
        }
        return true;
      });

      return NextResponse.json({
        success: true,
        data: filtered,
        count: filtered.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback to mock data
    let mockFlights = generateMockFlights();

    if (type === 'departures') {
      mockFlights = mockFlights.filter((f) => ['CDG', 'ORY'].includes(f.departure));
    } else if (type === 'arrivals') {
      mockFlights = mockFlights.filter((f) => ['CDG', 'ORY'].includes(f.arrival));
    }

    if (status) {
      mockFlights = mockFlights.filter((f) => f.status === status);
    }

    if (search) {
      const searchUpper = search.toUpperCase();
      mockFlights = mockFlights.filter(
        (f) =>
          f.flightNumber.includes(searchUpper) ||
          f.airline.toUpperCase().includes(searchUpper) ||
          f.departure.includes(searchUpper) ||
          f.arrival.includes(searchUpper)
      );
    }

    return NextResponse.json({
      success: true,
      data: mockFlights,
      count: mockFlights.length,
      timestamp: new Date().toISOString(),
      source: 'mock',
    });
  } catch (error) {
    console.error('[Flights API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}
