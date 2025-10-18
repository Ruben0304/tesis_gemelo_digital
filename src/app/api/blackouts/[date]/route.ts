import { NextResponse } from 'next/server';
import { deleteBlackout, getBlackoutByDate, saveBlackoutSchedule } from '@/lib/blackoutService';

export const dynamic = 'force-dynamic';

function decodeDateParam(params: { date: string }): string {
  try {
    return decodeURIComponent(params.date);
  } catch (error) {
    console.warn('No se pudo decodificar el parámetro de fecha:', error);
    return params.date;
  }
}

export async function GET(
  _request: Request,
  context: { params: { date: string } }
) {
  try {
    const dateParam = decodeDateParam(context.params);
    const schedule = await getBlackoutByDate(dateParam);
    if (!schedule) {
      return NextResponse.json({ error: 'No existe programación para ese día.' }, { status: 404 });
    }
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error al obtener apagón:', error);
    const message = error instanceof Error ? error.message : 'No se pudo consultar el apagón.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  context: { params: { date: string } }
) {
  try {
    const dateParam = decodeDateParam(context.params);
    const payload = await request.json();
    const schedule = await saveBlackoutSchedule({
      ...payload,
      date: payload?.date ?? dateParam,
    });
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error al actualizar apagón:', error);
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el apagón.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { date: string } }
) {
  try {
    const dateParam = decodeDateParam(context.params);
    const deleted = await deleteBlackout(dateParam);
    if (!deleted) {
      return NextResponse.json({ error: 'No había programación para eliminar.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar apagón:', error);
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el apagón.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
