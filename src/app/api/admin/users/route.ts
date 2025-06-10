// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Interfaz actualizada para incluir los roles de cada usuario en la lista
interface UserListData extends RowDataPacket {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
  roles: string; // Se devolverán los roles como un string concatenado: "rol1,rol2"
}

export async function GET(request: NextRequest) {
  // 1. Proteger la ruta: ahora accesible para 'administrador' y 'moderador_contenido'
  const { session, errorResponse } = await verifyApiAuth(['administrador', 'moderador_contenido']);

  if (errorResponse) {
    return errorResponse;
  }

  // Obtenemos el rol principal del usuario que hace la solicitud.
  // En este caso, asumimos que un administrador no es también un moderador.
  // Si un usuario pudiera tener ambos, necesitaríamos una lógica de prioridad.
  const requesterRoles = session?.user?.roles || [];
  const isRequesterAdmin = requesterRoles.includes('administrador');

  console.log(`Usuario ${session?.user?.email} (Roles: ${requesterRoles.join(', ')}) está solicitando la lista de usuarios.`);

  try {
    let usersQuery: string;
    let queryParams: (string | number)[] = [];

    // 2. Construir la consulta SQL dinámicamente según el rol del solicitante
    if (isRequesterAdmin) {
      // Los administradores ven a TODOS los usuarios y sus roles.
      // Usamos GROUP_CONCAT para obtener todos los roles de un usuario en una sola cadena.
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion, 
               GROUP_CONCAT(r.nombre_rol SEPARATOR ', ') as roles
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        GROUP BY u.id
        ORDER BY u.fecha_creacion DESC
      `;
    } else {
      // Los moderadores solo ven a los usuarios que tienen ÚNICAMENTE el rol 'usuario_estandar'.
      // Se excluyen los administradores y otros moderadores.
      usersQuery = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion, 'usuario_estandar' as roles
        FROM usuarios u
        WHERE u.id NOT IN (
          SELECT ur.usuario_id 
          FROM usuario_roles ur
          JOIN roles r ON ur.rol_id = r.id
          WHERE r.nombre_rol IN ('administrador', 'moderador_contenido')
        )
        ORDER BY u.fecha_creacion DESC
      `;
    }

    const users = await query<UserListData[]>(usersQuery, queryParams);

    return NextResponse.json({ users }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error al obtener la lista de usuarios:', typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de usuarios.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
