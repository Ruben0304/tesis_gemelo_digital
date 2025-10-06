import { NextResponse } from 'next/server';
import { generateHistoricalData, getCurrentSolarData, generateBatteryStatus } from '@/lib/mockData';
import { calculateSystemMetrics, calculateEnergyFlow } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solar
 * Returns current solar data, 24h historical data, metrics, and energy flow
 */
export async function GET() {
  try {
    // Generate realistic data
    const historicalData = generateHistoricalData('sunny');
    const currentData = historicalData[historicalData.length - 1];

    // Calculate battery status
    const batteryStatus = generateBatteryStatus(
      currentData.batteryLevel,
      currentData.production,
      currentData.consumption
    );

    // Calculate system metrics
    const metrics = calculateSystemMetrics(currentData, historicalData);

    // Calculate energy flow
    const energyFlow = calculateEnergyFlow(
      currentData.production,
      currentData.consumption,
      batteryStatus.charging,
      batteryStatus.powerFlow
    );

    return NextResponse.json({
      current: currentData,
      historical: historicalData,
      battery: batteryStatus,
      metrics,
      energyFlow,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating solar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch solar data' },
      { status: 500 }
    );
  }
}
