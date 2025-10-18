import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { deleteBattery, getBatteryById, updateBattery } from '@/lib/batteryService';

interface RouteContext {
  params: { id: string };
}

function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Identificador de batería no válido.' },
        { status: 400 }
      );
    }

    const battery = await getBatteryById(id);
    if (!battery) {
      return NextResponse.json({ error: 'Batería no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(battery);
  } catch (error) {
    console.error('Error al obtener batería:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la batería solicitada.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Identificador de batería no válido.' },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const updated = await updateBattery(id, payload);

    if (!updated) {
      return NextResponse.json({ error: 'Batería no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar batería:', error);
    const message = error instanceof Error ? error.message : 'Datos inválidos.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Identificador de batería no válido.' },
        { status: 400 }
      );
    }

    const removed = await deleteBattery(id);
    if (!removed) {
      return NextResponse.json({ error: 'Batería no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error al eliminar batería:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar la batería.' },
      { status: 500 }
    );
  }
}
