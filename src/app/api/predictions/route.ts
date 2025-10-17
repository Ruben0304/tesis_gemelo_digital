import { NextResponse } from 'next/server';
import { generateWeatherData, buildProjectedSolarTimeline, generateBatteryProjection } from '@/lib/mockData';
import { generateHourlyPredictions, generateAlerts, generateRecommendations } from '@/lib/predictions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/predictions
 * Returns hourly predictions, alerts, and recommendations
 */
export async function GET() {
  try {
    const weatherData = generateWeatherData();

    // Generate 24-hour predictions
    const predictions = generateHourlyPredictions(weatherData.forecast);
    const projectedTimeline = buildProjectedSolarTimeline(predictions);
    const batteryProjection = generateBatteryProjection(projectedTimeline, predictions);

    // Generate intelligent alerts
    const alerts = generateAlerts(
      predictions,
      batteryProjection,
      weatherData.forecast
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      predictions,
      batteryProjection
    );

    return NextResponse.json({
      predictions,
      alerts,
      recommendations,
      battery: batteryProjection,
      timeline: projectedTimeline,
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
