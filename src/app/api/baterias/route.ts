import { NextResponse } from 'next/server';
import { createBattery, listBatteries } from '@/lib/batteryService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batteries = await listBatteries();
    return NextResponse.json({ items: batteries });
  } catch (error) {
    console.error('Error al listar baterías:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las baterías.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const created = await createBattery(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error al crear batería:', error);
    const message = error instanceof Error ? error.message : 'Datos inválidos.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
