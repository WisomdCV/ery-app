// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod'; // Importar Zod

// 1. Definir el esquema de validación para el login
const loginSchema = z.object({
  email: z.string().email({ message: "Formato de correo electrónico inválido." }),
  password: z.string().min(1, { message: "La contraseña no puede estar vacía." }),
});

// Interfaz para los datos del usuario que recuperamos de la BD
interface UserFromDB extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  activo: boolean;
}

interface UserRole extends RowDataPacket {
  nombre_rol: string;
}

export async function POST(request: NextRequest) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  // 2. Validar el cuerpo de la solicitud contra el esquema de Zod
  const validation = loginSchema.safeParse(requestBody);

  if (!validation.success) {
    return NextResponse.json(
      { 
        message: "Datos de entrada inválidos.",
        errors: validation.error.flatten().fieldErrors 
      }, 
      { status: 400 }
    );
  }
  
  const { email, password } = validation.data;

  try {
    const userResults = await query<UserFromDB[]>(
      'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (userResults.length === 0) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    const user = userResults[0];

    if (!user.activo) {
        return NextResponse.json({ message: 'Esta cuenta ha sido desactivada.' }, { status: 403 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // El resto de la lógica sigue igual...
    const rolesResults = await query<UserRole[]>(
      `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
      [user.id]
    );
    const roles = rolesResults.map(role => role.nombre_rol);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está definido en las variables de entorno.');
      return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      roles: roles,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

    return NextResponse.json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        roles: roles,
      },
      token,
    }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; };
    console.error('Error en /api/auth/login:', typedError);
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: typedError.message }, { status: 500 });
  }
}
