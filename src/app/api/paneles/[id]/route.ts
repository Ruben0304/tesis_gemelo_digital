import { NextResponse } from 'next/server';
import { deletePanel, getPanelById, updatePanel } from '@/lib/panelService';
import { ObjectId } from 'mongodb';

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
        { error: 'Identificador de panel no válido.' },
        { status: 400 }
      );
    }

    const panel = await getPanelById(id);
    if (!panel) {
      return NextResponse.json({ error: 'Panel no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(panel);
  } catch (error) {
    console.error('Error al obtener panel:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el panel solicitado.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Identificador de panel no válido.' },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const updated = await updatePanel(id, payload);

    if (!updated) {
      return NextResponse.json({ error: 'Panel no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar panel:', error);
    const message = error instanceof Error ? error.message : 'Datos inválidos.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Identificador de panel no válido.' },
        { status: 400 }
      );
    }

    const removed = await deletePanel(id);
    if (!removed) {
      return NextResponse.json({ error: 'Panel no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error al eliminar panel:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el panel.' },
      { status: 500 }
    );
  }
}
