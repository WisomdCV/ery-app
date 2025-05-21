// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Interfaz para los datos del usuario que devolveremos
interface UserDetailsData { // No necesita extender RowDataPacket si construimos el objeto explícitamente
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date; // Aseguramos que sea tipo Date
  roles: string[]; // Array con los nombres de los roles del usuario
}

// Interfaz para el resultado de la consulta de usuario desde la BD
interface UserFromDB extends RowDataPacket {
    id: number;
    nombre: string;
    apellido: string | null;
    email: string;
    activo: number | boolean; // MySQL puede devolver 0/1 para BOOLEAN/TINYINT
    fecha_creacion: string | Date; // MySQL puede devolver string para DATETIME/TIMESTAMP
}

interface UserRoleFromDB extends RowDataPacket {
  nombre_rol: string;
}

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { user: adminUser, errorResponse: authError } = await verifyAuth(request, ['administrador']);

  if (authError) {
    return authError;
  }

  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  console.log(`Administrador ${adminUser?.email} (ID: ${adminUser?.userId}) está solicitando detalles del usuario ID: ${numericUserId}.`);

  try {
    // Obtener datos básicos del usuario
    const userResults = await query<UserFromDB[]>( // Usar UserFromDB para el resultado de la query
      'SELECT id, nombre, apellido, email, activo, fecha_creacion FROM usuarios WHERE id = ?',
      [numericUserId]
    );

    if (userResults.length === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    const rawUserData = userResults[0];

    // Obtener los roles del usuario
    const rolesResults = await query<UserRoleFromDB[]>(
      `SELECT r.nombre_rol
       FROM roles r
       JOIN usuario_roles ur ON r.id = ur.rol_id
       WHERE ur.usuario_id = ?`,
      [numericUserId]
    );

    const roles = rolesResults.map(role => role.nombre_rol);

    // Construir el objeto userDetails explícitamente
    const userDetails: UserDetailsData = {
      id: rawUserData.id,
      nombre: rawUserData.nombre,
      apellido: rawUserData.apellido,
      email: rawUserData.email,
      activo: Boolean(rawUserData.activo), // Convertir 0/1 a true/false
      fecha_creacion: new Date(rawUserData.fecha_creacion), // Convertir string de fecha a objeto Date
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
