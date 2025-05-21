// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';

// Interfaz para el cuerpo de la solicitud de login
interface LoginRequestBody {
  email: string;
  password: string;
}

// Interfaz para los datos del usuario que recuperamos de la BD
// Asegúrate de que coincida con las columnas que seleccionas
interface UserFromDB extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  activo: boolean;
  // Puedes añadir más campos si los necesitas en el token o para validaciones
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LoginRequestBody;
    const { email, password } = body;

    // Validación básica de entrada
    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    // Buscar usuario por email
    // Seleccionamos los campos necesarios, incluyendo el password_hash para la comparación
    // y 'activo' para verificar si la cuenta está habilitada.
    const userResults = await query<UserFromDB[]>(
      'SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (userResults.length === 0) {
      return NextResponse.json({ message: 'Credenciales inválidas. Usuario no encontrado.' }, { status: 401 }); // Unauthorized
    }

    const user = userResults[0];

    // Verificar si la cuenta está activa
    if (!user.activo) {
        return NextResponse.json({ message: 'Esta cuenta ha sido desactivada.' }, { status: 403 }); // Forbidden
    }

    // Comparar la contraseña proporcionada con el hash almacenado
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas. Contraseña incorrecta.' }, { status: 401 }); // Unauthorized
    }

    // Si las credenciales son correctas, generar un JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está definido en las variables de entorno.');
      return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
    }

    // El payload del token. Incluye información que quieras que esté disponible
    // de forma segura en el frontend o para verificar en otras API routes.
    // NO incluyas información sensible como la contraseña.
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      // Aquí podrías añadir roles/permisos si ya los estuvieras cargando
      // Ejemplo: roles: ['usuario'] (esto lo implementaremos más adelante)
    };

    // Generar el token. Define un tiempo de expiración.
    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '1h', // Por ejemplo, 1 hora. Puedes usar '7d', '30m', etc.
    });

    // Crear la respuesta
    const response = NextResponse.json({
      message: 'Inicio de sesión exitoso.',
      user: { // Devuelve solo la información no sensible del usuario
        id: user.id,
        email: user.email,
        nombre: user.nombre,
      },
      token, // Devuelve el token en el cuerpo de la respuesta
    }, { status: 200 });

    // Opcional: Configurar el token en una cookie HttpOnly para mayor seguridad (recomendado para web)
    // response.cookies.set('token', token, {
    //   httpOnly: true, // El cliente JavaScript no puede acceder a la cookie
    //   secure: process.env.NODE_ENV === 'production', // Solo enviar sobre HTTPS en producción
    //   sameSite: 'strict', // Mitiga ataques CSRF
    //   maxAge: 60 * 60, // 1 hora en segundos (debe coincidir con expiresIn o ser gestionado)
    //   path: '/', // Disponible en todo el sitio
    // });

    return response;

  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: error.message }, { status: 500 });
  }
}
