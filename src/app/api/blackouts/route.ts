import { NextResponse } from 'next/server';
import { listBlackouts, saveBlackoutSchedule } from '@/lib/blackoutService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
      return NextResponse.json(
        { error: 'El parámetro limit debe ser un número positivo.' },
        { status: 400 }
      );
    }

    const items = await listBlackouts({ from, to, limit });
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error al listar apagones:', error);
    const message = error instanceof Error ? error.message : 'No se pudieron obtener los apagones.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const schedule = await saveBlackoutSchedule(payload);
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error al guardar apagón:', error);
    const message = error instanceof Error ? error.message : 'No se pudo registrar el apagón.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
