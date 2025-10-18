import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/userService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const user = await authenticateUser(payload);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
    const status = message.includes('Credenciales inválidas') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
