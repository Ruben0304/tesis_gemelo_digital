import { NextResponse } from 'next/server';
import { getWeatherWithFallback } from '@/lib/openMeteo';
import { getSystemConfig } from '@/lib/systemConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weather
 * Returns current weather data and 7-day forecast from Open-Meteo API
 * Falls back to mock data if API is unavailable
 */
export async function GET() {
  try {
    const systemConfig = await getSystemConfig();

    // Obtener datos meteorológicos reales de Open-Meteo con fallback a mock
    const weatherData = await getWeatherWithFallback(
      systemConfig.location.lat,
      systemConfig.location.lon,
      systemConfig.solar.capacityKw,
      systemConfig.location.name
    );

    return NextResponse.json({
      ...weatherData,
      timestamp: new Date().toISOString(),
      config: systemConfig,
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
