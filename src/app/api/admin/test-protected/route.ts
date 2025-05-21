// src/app/api/admin/test-protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils'; // Importar nuestra función de ayuda

export async function GET(request: NextRequest) {
  // Proteger esta ruta: solo para administradores
  const { user, errorResponse } = await verifyAuth(request, ['administrador']);

  if (errorResponse) {
    return errorResponse; // Si hay error de autenticación/autorización, devolverlo
  }


  return NextResponse.json({
    message: `Hola, Administrador ${user?.nombre}! Has accedido a una ruta protegida.`,
    userId: user?.userId,
    userRoles: user?.roles,
  });
}

// Podrías añadir POST, PUT, DELETE, etc., y protegerlos de la misma manera.