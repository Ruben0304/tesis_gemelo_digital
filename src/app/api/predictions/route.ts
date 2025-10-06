import { NextResponse } from 'next/server';
import { generateWeatherData, getCurrentSolarData } from '@/lib/mockData';
import { generateHourlyPredictions, generateAlerts, generateRecommendations } from '@/lib/predictions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/predictions
 * Returns hourly predictions, alerts, and recommendations
 */
export async function GET() {
  try {
    const weatherData = generateWeatherData();
    const currentData = getCurrentSolarData();

    // Generate 24-hour predictions
    const predictions = generateHourlyPredictions(weatherData.forecast);

    // Generate intelligent alerts
    const alerts = generateAlerts(
      predictions,
      currentData.batteryLevel,
      weatherData.forecast
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      predictions,
      currentData.batteryLevel,
      currentData.production,
      currentData.consumption
    );

    return NextResponse.json({
      predictions,
      alerts,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
