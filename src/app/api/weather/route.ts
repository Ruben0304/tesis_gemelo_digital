import { NextResponse } from 'next/server';
import { generateWeatherData } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weather
 * Returns current weather data and 7-day forecast
 */
export async function GET() {
  try {
    const weatherData = generateWeatherData();

    return NextResponse.json({
      ...weatherData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating weather data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
