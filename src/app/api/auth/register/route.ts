// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2'; // Tipos específicos de mysql2

// Interfaz para el cuerpo de la solicitud (request body)
interface RegisterRequestBody {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  fecha_nacimiento?: string; // Formato YYYY-MM-DD
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
}

// Interfaz para el usuario existente (para la verificación)
interface ExistingUser extends RowDataPacket {
  id: number;
}

// Ya no se necesita 'InsertResult' si es idéntica a ResultSetHeader, se usa directamente.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RegisterRequestBody;
    const {
      nombre,
      apellido,
      email,
      password,
      fecha_nacimiento,
      telefono,
      direccion,
      ciudad,
      pais
    } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ message: 'Nombre, email y contraseña son requeridos.' }, { status: 400 });
    }
    if (password.length < 6) { // Ejemplo de validación adicional
        return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const existingUserResults = await query<ExistingUser[]>('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUserResults.length > 0) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 }); // 409 Conflict
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sqlInsert = `
      INSERT INTO usuarios (nombre, apellido, email, password_hash, fecha_nacimiento, telefono, direccion, ciudad, pais, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const paramsInsert = [
      nombre,
      apellido || null,
      email,
      password_hash,
      fecha_nacimiento || null,
      telefono || null,
      direccion || null,
      ciudad || null,
      pais || null,
      true // Por defecto, el usuario está activo
    ];

    // Corregido: Usar ResultSetHeader directamente para el tipo del resultado de la inserción
    const result = await query<ResultSetHeader>(sqlInsert, paramsInsert);

    if (result.affectedRows === 1 && result.insertId) {
      const newUser = {
        id: result.insertId,
        nombre,
        email,
        // No devuelvas el hash de la contraseña ni otros datos sensibles
      };
      return NextResponse.json({ message: 'Usuario registrado exitosamente.', user: newUser }, { status: 201 });
    } else {
      console.error('Failed to insert user, result:', result);
      return NextResponse.json({ message: 'Error al registrar el usuario.' }, { status: 500 });
    }

  } catch (error) { // Corregido: Usar 'unknown' para el tipo de error
    const typedError = error as { message?: string; code?: string; sqlState?: string }; // Asertar tipo para acceder a propiedades
    console.error('Error en /api/auth/register:', typedError);
    // Verifica si el error es por un campo UNIQUE duplicado (aunque ya lo chequeamos antes)
    // El código de error ER_DUP_ENTRY es específico de MySQL
    if (typedError.code === 'ER_DUP_ENTRY' || (typedError.message && typedError.message.includes('ER_DUP_ENTRY'))) {
        return NextResponse.json({ message: 'El correo electrónico ya está registrado (error de BD).' }, { status: 409 });
    }
    // Manejo de otros errores de base de datos o errores inesperados
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: typedError.message }, { status: 500 });
  }
}
