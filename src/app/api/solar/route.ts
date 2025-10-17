import { NextResponse } from 'next/server';
import {
  generateWeatherData,
  buildProjectedSolarTimeline,
  generateBatteryProjection,
} from '@/lib/mockData';
import { calculateSystemMetrics, calculateEnergyFlow } from '@/lib/calculations';
import { generateHourlyPredictions } from '@/lib/predictions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solar
 * Returns projected solar data, 24h forecast timeline, metrics, and energy flow estimates
 */
export async function GET() {
  try {
    const weatherData = generateWeatherData();
    const predictions = generateHourlyPredictions(weatherData.forecast);
    const projectedTimeline = buildProjectedSolarTimeline(predictions);

    if (projectedTimeline.length === 0) {
      throw new Error('No projected data available');
    }

    const currentProjection = projectedTimeline[0];
    const batteryProjection = generateBatteryProjection(projectedTimeline, predictions);

    const metrics = calculateSystemMetrics(currentProjection, projectedTimeline);
    const energyFlow = calculateEnergyFlow(
      currentProjection.production,
      currentProjection.consumption,
      batteryProjection.charging,
      batteryProjection.powerFlow
    );

    return NextResponse.json({
      current: currentProjection,
      historical: projectedTimeline,
      battery: batteryProjection,
      metrics,
      energyFlow,
      timestamp: new Date().toISOString(),
      mode: 'predictive',
    });
  } catch (error) {
    console.error('Error generating solar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch solar data' },
      { status: 500 }
    );
  }
}
