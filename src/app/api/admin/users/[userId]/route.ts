// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// --- Interfaces (sin cambios) ---
interface UserDetailsData {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
  roles: string[];
}
interface UserFromDB extends RowDataPacket {
    id: number;
    nombre: string;
    apellido: string | null;
    email: string;
    activo: number | boolean;
    fecha_creacion: string | Date;
}
interface UserRoleFromDB extends RowDataPacket {
  nombre_rol: string;
}
interface RouteContext {
  params: {
    userId: string;
  };
}
// ---

// Esquema de validación con Zod para el método PUT
const adminUpdateUserSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, "El nombre solo puede contener letras y espacios.").optional(),
  apellido: z.string().regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, "El apellido solo puede contener letras y espacios.").optional(),
  email: z.string().email("Formato de correo electrónico inválido.").optional(),
  password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
}).partial().refine(data => Object.keys(data).length > 0, {
  message: "Se debe proporcionar al menos un campo para actualizar."
});


// --- FUNCIÓN GET (sin cambios) ---
export async function GET(request: NextRequest, context: RouteContext) {
  const { session, errorResponse: authError } = await verifyApiAuth(['administrador']);
  if (authError) { return authError; }
  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }
  try {
    const userResults = await query<UserFromDB[]>('SELECT id, nombre, apellido, email, activo, fecha_creacion FROM usuarios WHERE id = ?', [numericUserId]);
    if (userResults.length === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }
    const rawUserData = userResults[0];
    const rolesResults = await query<UserRoleFromDB[]>(`SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`, [numericUserId]);
    const roles = rolesResults.map(role => role.nombre_rol);
    const userDetails: UserDetailsData = {
      id: rawUserData.id,
      nombre: rawUserData.nombre,
      apellido: rawUserData.apellido,
      email: rawUserData.email,
      activo: Boolean(rawUserData.activo),
      fecha_creacion: new Date(rawUserData.fecha_creacion),
      roles: roles,
    };
    return NextResponse.json({ user: userDetails });
  } catch (error) {
    console.error(`Error al obtener detalles del usuario ID ${numericUserId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}


// --- NUEVA FUNCIÓN PUT para Administradores ---
export async function PUT(request: NextRequest, context: RouteContext) {
  // 1. Proteger la ruta: accesible ÚNICAMENTE para administradores
  const { session, errorResponse: authError } = await verifyApiAuth(['administrador']);
  if (authError) {
    return authError;
  }

  const { userId: targetUserIdString } = context.params;
  const targetUserId = parseInt(targetUserIdString, 10);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ message: 'ID de usuario a editar es inválido.' }, { status: 400 });
  }

  // 2. Validar el cuerpo de la solicitud con Zod
  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = adminUpdateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, apellido, email, password } = validation.data;

  try {
    // 3. Construir la consulta UPDATE dinámicamente
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (apellido !== undefined) { updateFields.push('apellido = ?'); updateValues.push(apellido || null); }
    if (email) {
      const emailExists = await query<RowDataPacket[]>('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, targetUserId]);
      if (emailExists.length > 0) {
        return NextResponse.json({ message: 'El nuevo correo electrónico ya está en uso por otro usuario.' }, { status: 409 });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updateFields.push('password_hash = ?');
      updateValues.push(password_hash);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    const sqlSetClause = updateFields.join(', ');
    updateValues.push(targetUserId);

    const result = await query<ResultSetHeader>(
      `UPDATE usuarios SET ${sqlSetClause} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: `Usuario con ID ${targetUserId} no encontrado.` }, { status: 404 });
    }

    return NextResponse.json({ message: `Los detalles del usuario ID ${targetUserId} han sido actualizados por el administrador.` });

  } catch (error) {
    const typedError = error as { message?: string; code?: string };
    console.error(`Error al actualizar detalles del usuario ID ${targetUserId}:`, typedError);
    if (typedError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'El correo electrónico ya está en uso.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
