import { NextResponse } from 'next/server';
import { generateWeatherData, buildProjectedSolarTimeline, generateBatteryProjection } from '@/lib/mockData';
import { generateHourlyPredictions, generateAlerts, generateRecommendations, applyBlackoutAdjustments } from '@/lib/predictions';
import { getSystemConfig } from '@/lib/systemConfig';
import { getBlackoutsForRange } from '@/lib/blackoutService';
import { addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/predictions
 * Returns hourly predictions, alerts, and recommendations
 */
export async function GET() {
  try {
    const systemConfig = await getSystemConfig();
    const now = new Date();
    const rangeEnd = addDays(now, 2);
    const blackouts = await getBlackoutsForRange(now, rangeEnd);
    const weatherData = await generateWeatherData(systemConfig.solar.capacityKw);

    // Generate 24-hour predictions
    const predictions = generateHourlyPredictions(weatherData.forecast, systemConfig);
    const adjustedPredictions = applyBlackoutAdjustments(predictions, blackouts);
    const projectedTimeline = buildProjectedSolarTimeline(
      adjustedPredictions,
      systemConfig.battery.capacityKwh,
      55,
      blackouts
    );
    const batteryProjection = generateBatteryProjection(
      projectedTimeline,
      adjustedPredictions,
      systemConfig.battery.capacityKwh
    );

    // Generate intelligent alerts
    const alerts = generateAlerts(
      adjustedPredictions,
      batteryProjection,
      weatherData.forecast,
      blackouts
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      adjustedPredictions,
      batteryProjection,
      systemConfig,
      blackouts
    );

    return NextResponse.json({
      predictions: adjustedPredictions,
      alerts,
      recommendations,
      battery: batteryProjection,
      timeline: projectedTimeline,
      weather: weatherData,
      timestamp: new Date().toISOString(),
      config: systemConfig,
      blackouts,
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
