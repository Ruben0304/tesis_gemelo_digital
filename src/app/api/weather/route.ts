import { NextResponse } from 'next/server';
import { generateWeatherData } from '@/lib/mockData';
import { getSystemConfig } from '@/lib/systemConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weather
 * Returns current weather data and 7-day forecast
 */
export async function GET() {
  try {
    const systemConfig = await getSystemConfig();
    const weatherData = await generateWeatherData(systemConfig.solar.capacityKw);

    return NextResponse.json({
      ...weatherData,
      timestamp: new Date().toISOString(),
      config: systemConfig,
    });
  } catch (error) {
    console.error('Error generating weather data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
