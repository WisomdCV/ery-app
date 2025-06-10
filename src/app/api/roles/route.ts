// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Interfaz para los datos del rol que devolveremos
interface RoleData extends RowDataPacket {
  id: number;
  nombre_rol: string;
  descripcion: string | null;
}

export async function GET(request: NextRequest) {
  // 2. Proteger la ruta con la nueva función. Ya no se pasa 'request'.
  const { session, errorResponse } = await verifyApiAuth(['administrador']);

  if (errorResponse) {
    return errorResponse; // Si hay error de autenticación/autorización, devolverlo
  }

  // 3. Acceder a la información del admin a través del objeto 'session'
  console.log(`Administrador ${session?.user?.email} (ID: ${session?.user?.id}) está solicitando la lista de todos los roles.`);

  try {
    // La consulta a la base de datos sigue siendo la misma
    const roles = await query<RoleData[]>(
      `SELECT id, nombre_rol, descripcion FROM roles ORDER BY nombre_rol ASC`
    );

    return NextResponse.json({ roles }, { status: 200 });

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error al obtener la lista de roles:', typedError);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de roles.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
