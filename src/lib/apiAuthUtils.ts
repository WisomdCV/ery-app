// src/lib/apiAuthUtils.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  userId: number;
  email: string;
  nombre: string;
  roles: string[];
}

interface AuthResult {
  user: DecodedToken | null;
  errorResponse: NextResponse | null;
}

/**
 * Verifica la autenticación y autorización de una solicitud API.
 * @param request La NextRequest entrante.
 * @param requiredRoles Un array opcional de roles requeridos para acceder al recurso.
 * Si se provee, el usuario debe tener al menos uno de estos roles.
 * Si se omite o es un array vacío, solo se verifica la autenticación.
 * @returns Un objeto AuthResult con el usuario decodificado o una respuesta de error.
 */
export async function verifyAuth(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      user: null,
      errorResponse: NextResponse.json({ message: 'Token de autorización no proporcionado.' }, { status: 401 }),
    };
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer' || !tokenParts[1]) {
    return {
      user: null,
      errorResponse: NextResponse.json({ message: 'Formato de token inválido. Se esperaba "Bearer <token>".' }, { status: 401 }),
    };
  }

  const token = tokenParts[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET no está definido en las variables de entorno.');
    return {
      user: null,
      errorResponse: NextResponse.json({ message: 'Error de configuración del servidor (JWT Secret).' }, { status: 500 }),
    };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    // Verificar si se requieren roles específicos
    if (requiredRoles.length > 0) {
      const userHasRequiredRole = decoded.roles && decoded.roles.some(userRole => requiredRoles.includes(userRole));
      if (!userHasRequiredRole) {
        return {
          user: null,
          errorResponse: NextResponse.json(
            { message: `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.` },
            { status: 403 }
          ),
        };
      }
    }

    // Autenticación y autorización (si se requirió) exitosas
    return { user: decoded, errorResponse: null };

  } catch (error) {
    let errorMessage = 'Token inválido o expirado.';
    let statusCode = 401; // No autorizado por token inválido

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'El token ha expirado.';
      statusCode = 401; // O 403 si prefieres para expirado
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Token inválido.';
    } else {
      // Otros errores inesperados durante la verificación del token
      console.error('Error inesperado al verificar el token:', error);
      errorMessage = 'Error al procesar el token.';
      statusCode = 500; // Error interno del servidor
    }
    return { user: null, errorResponse: NextResponse.json({ message: errorMessage }, { status: statusCode }) };
  }
}
