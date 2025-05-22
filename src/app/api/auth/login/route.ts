```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, DatabaseConnectionError } from '@/lib/db'; // Import DatabaseConnectionError
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';

// Interfaz para el cuerpo de la solicitud de login
interface LoginRequestBody {
  email: string;
  password: string;
}

// Interfaz para los datos del usuario que recuperamos de la BD
interface UserFromDB extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  activo: boolean;
}

// Interfaz para los roles recuperados de la BD
interface UserRole extends RowDataPacket {
  nombre_rol: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LoginRequestBody;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    const userResults = await query<UserFromDB[]>(
      'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (userResults.length === 0) {
      return NextResponse.json({ message: 'Credenciales inválidas. Usuario no encontrado.' }, { status: 401 });
    }

    const user = userResults[0];

    if (!user.activo) {
        return NextResponse.json({ message: 'Esta cuenta ha sido desactivada.' }, { status: 403 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas. Contraseña incorrecta.' }, { status: 401 });
    }

    // Obtener los roles del usuario
    const rolesResults = await query<UserRole[]>(
      `SELECT r.nombre_rol
       FROM roles r
       JOIN usuario_roles ur ON r.id = ur.rol_id
       WHERE ur.usuario_id = ?`,
      [user.id]
    );

    const roles = rolesResults.map(role => role.nombre_rol);

    // Si las credenciales son correctas, generar un JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está definido en las variables de entorno.');
      return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      roles: roles, // Incluir los roles en el payload del token
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '1h', // Por ejemplo, 1 hora
    });

    const response = NextResponse.json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles: roles, // También devolver los roles en la respuesta del usuario si es útil para el frontend inmediatamente
      },
      token,
    }, { status: 200 });

    return response;

  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: 'Servicio no disponible temporalmente debido a problemas con la base de datos.', code: "DB_UNAVAILABLE" }, { status: 503 });
    }
    // Manejo de otros errores de base de datos o errores inesperados
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: error.message }, { status: 500 });
  }
}
```
