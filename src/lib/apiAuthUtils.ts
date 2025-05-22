```typescript
// src/lib/apiAuthUtils.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { query, DatabaseConnectionError } from '@/lib/db'; // Ensure DatabaseConnectionError is imported

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
      errorResponse: NextResponse.json({ message: 'Token no proporcionado' }, { status: 401 }),
    };
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer' || !tokenParts[1]) {
    return {
      user: null,
      errorResponse: NextResponse.json({ message: 'Formato de token inválido.' }, { status: 401 }),
    };
  }

  const token = tokenParts[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET no está definido en las variables de entorno.');
    // Return a 500 error as this is a server configuration issue.
    return {
      user: null,
      errorResponse: NextResponse.json({ message: 'Error de configuración del servidor (JWT Secret).' }, { status: 500 }),
    };
  }

  let decoded: DecodedToken;
  try {
    decoded = jwt.verify(token, jwtSecret) as DecodedToken;
  } catch (error) {
    let errorMessage = 'Token inválido.';
    let statusCode = 401; // Unauthorized

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'El token ha expirado.';
    } else if (error instanceof jwt.JsonWebTokenError) {
      // message is already 'Token inválido.'
    } else {
      // Catch any other unexpected errors during token verification
      console.error('Error inesperado al verificar el token:', error);
      errorMessage = 'Error al procesar el token.';
      statusCode = 500; // Internal Server Error
    }
    return { user: null, errorResponse: NextResponse.json({ message: errorMessage }, { status: statusCode }) };
  }

  // If we reach here, the token is valid. Now check roles if required.
  // This part assumes roles are embedded in the token. If roles were fetched from DB,
  // DatabaseConnectionError would need to be handled here or propagated.
  if (requiredRoles.length > 0) {
    const userRoles = decoded.roles || []; // Ensure roles is an array
    const hasRequiredRole = userRoles.some(userRole => requiredRoles.includes(userRole));
    if (!hasRequiredRole) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { message: `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.` },
          { status: 403 }
        ),
      };
    }
  }

  return { user: decoded, errorResponse: null };
}
```
