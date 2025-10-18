import { NextResponse } from 'next/server';
import { createPanel, listPanels } from '@/lib/panelService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const panels = await listPanels();
    return NextResponse.json({ items: panels });
  } catch (error) {
    console.error('Error al listar paneles:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener los paneles.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const created = await createPanel(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error al crear panel:', error);
    const message = error instanceof Error ? error.message : 'Datos inválidos.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
