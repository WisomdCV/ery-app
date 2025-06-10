// src/lib/apiAuthUtils.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Importamos las opciones de NextAuth

// Interfaz para la sesión que esperamos, incluyendo nuestros campos personalizados
interface AppSession {
  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
  };
  expires: string;
}

interface AuthResult {
  session: AppSession | null; // Devolveremos la sesión completa
  errorResponse: NextResponse | null;
}

/**
 * Verifica la sesión de NextAuth.js y la autorización del usuario para una API Route.
 * @param requiredRoles Un array opcional de roles requeridos para acceder al recurso.
 * @returns Un objeto AuthResult con la sesión del usuario o una respuesta de error.
 */
export async function verifyApiAuth(
  requiredRoles: string[] = []
): Promise<AuthResult> {
  // Obtener la sesión del servidor usando las opciones de NextAuth.
  // Esto lee la cookie segura automáticamente.
  const session = (await getServerSession(authOptions)) as AppSession | null;

  // 1. Verificar si hay una sesión activa
  if (!session || !session.user) {
    return {
      session: null,
      errorResponse: NextResponse.json({ message: 'No autenticado.' }, { status: 401 }),
    };
  }

  // 2. Verificar si se requieren roles específicos
  if (requiredRoles.length > 0) {
    const userRoles = session.user.roles || [];
    const userHasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!userHasRequiredRole) {
      return {
        session: null,
        errorResponse: NextResponse.json(
          { message: `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.` },
          { status: 403 }
        ),
      };
    }
  }

  // Autenticación y autorización (si se requirió) exitosas
  return { session, errorResponse: null };
}
