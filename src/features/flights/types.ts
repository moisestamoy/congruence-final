export type MaxStops = 0 | 1 | 2;

export interface FlightQuery {
    origin: string;          // IATA, ej. MAD
    destination: string;     // IATA, ej. BCN
    departDate: string;      // YYYY-MM-DD o YYYY-MM (mes flexible)
    returnDate: string | null;
    maxStops: MaxStops;
    currency: string;        // EUR, USD, MXN…
    maxPrice: number | null;
}

export interface FlightOffer {
    id: string;
    origin: string;
    destination: string;
    originAirport: string | null;
    destinationAirport: string | null;
    airline: string | null;
    flightNumber: string | null;
    price: number;
    currency: string;
    departureAt: string | null;
    returnAt: string | null;
    stops: number;
    returnStops: number | null;
    durationMinutes: number;
    durationToMinutes: number | null;
    durationBackMinutes: number | null;
    bookingUrl: string | null;
}

export type FlightSearchResult =
    | { ok: true; flights: FlightOffer[]; totalFromProvider: number; fetchedAt: string }
    | { ok: false; code: 'not_configured' | 'validation' | 'provider_error' | 'auth' | 'network'; message: string };

export interface SavedSearch {
    id: string;
    name: string;
    query: FlightQuery;
    targetPrice: number | null;   // avísame cuando baje de…
    createdAt: number;
    lastCheckedAt: number | null;
    lastBestPrice: number | null;
    lastBestOfferId: string | null;
}

export interface DeepLink {
    provider: 'google' | 'skyscanner' | 'kayak' | 'kiwi';
    label: string;
    url: string;
    note?: string;
}
