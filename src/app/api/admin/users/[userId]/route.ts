// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// --- Interfaces (se mantienen igual que tu versión) ---
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

export async function GET(request: NextRequest, context: RouteContext) {
  // 2. Proteger la ruta con la nueva función. Ya no se pasa 'request'.
  const { session, errorResponse: authError } = await verifyApiAuth(['administrador']);

  if (authError) {
    return authError;
  }

  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  // 3. Acceder a la información del admin a través del objeto 'session'
  console.log(`Administrador ${session?.user?.email} (ID: ${session?.user?.id}) está solicitando detalles del usuario ID: ${numericUserId}.`);

  try {
    const userResults = await query<UserFromDB[]>(
      'SELECT id, nombre, apellido, email, activo, fecha_creacion FROM usuarios WHERE id = ?',
      [numericUserId]
    );

    if (userResults.length === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    const rawUserData = userResults[0];

    const rolesResults = await query<UserRoleFromDB[]>(
      `SELECT r.nombre_rol
       FROM roles r
       JOIN usuario_roles ur ON r.id = ur.rol_id
       WHERE ur.usuario_id = ?`,
      [numericUserId]
    );

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

    return NextResponse.json({ user: userDetails }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error(`Error al obtener detalles del usuario ID ${numericUserId}:`, typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los detalles del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
