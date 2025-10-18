import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/userService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const user = await registerUser(payload);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    const message = error instanceof Error ? error.message : 'No se pudo registrar el usuario.';
    const status = message.includes('Ya existe un usuario') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
