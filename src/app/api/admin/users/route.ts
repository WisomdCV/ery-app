// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Interfaz para los datos del usuario que devolveremos
interface UserListData extends RowDataPacket {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
}

export async function GET(request: NextRequest) {
  // 2. Proteger la ruta con la nueva función. Ya no se pasa 'request'.
  // Esta función lee la sesión directamente desde la cookie en el servidor.
  const { session, errorResponse } = await verifyApiAuth(['administrador']);

  if (errorResponse) {
    return errorResponse; // Si hay error de autenticación/autorización, devolverlo
  }

  // Si llegamos aquí, el usuario está autenticado y tiene el rol 'administrador'
  // La información del usuario ahora está en el objeto 'session.user'
  console.log(`Administrador ${session?.user?.email} (ID: ${session?.user?.id}) está solicitando la lista de usuarios.`);

  try {
    // La consulta a la base de datos sigue siendo la misma
    const users = await query<UserListData[]>(
      `SELECT id, nombre, apellido, email, activo, fecha_creacion 
       FROM usuarios 
       ORDER BY fecha_creacion DESC`
    );

    return NextResponse.json({ users }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error al obtener la lista de usuarios para el administrador:', typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de usuarios.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
