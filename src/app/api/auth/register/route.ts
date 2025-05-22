```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, DatabaseConnectionError } from '@/lib/db'; // Import DatabaseConnectionError
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterRequestBody {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  fecha_nacimiento?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
}

interface User extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  // password_hash should not be returned
}

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

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Formato de email inválido.' }, { status: 400 });
    }
    
    if (password.length < 6) {
        return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const existingUser = await query<User[]>('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
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

    const result = await query<ResultSetHeader>(sqlInsert, paramsInsert);

    if (result.affectedRows === 1 && result.insertId) {
      const newUser: Partial<User> = { // Use Partial<User> since password_hash is omitted
        id: result.insertId,
        nombre,
        email,
      };
      return NextResponse.json({ message: 'Usuario registrado exitosamente.', user: newUser }, { status: 201 });
    } else {
      console.error('Failed to insert user, result:', result);
      return NextResponse.json({ message: 'Error al registrar el usuario.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error en /api/auth/register:', error);
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: 'Servicio no disponible temporalmente debido a problemas con la base de datos.', code: "DB_UNAVAILABLE" }, { status: 503 });
    }
    // Catch specific MySQL error for duplicate entry if the initial check missed it (race condition, though unlikely with proper transactions)
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'El correo electrónico ya está registrado (error de BD).', code: 'EMAIL_EXISTS' }, { status: 409 });
    }
    // Generic error for other cases
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: error.message }, { status: 500 });
  }
}
```
