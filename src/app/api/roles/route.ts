// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils'; // Nuestra función de ayuda para autenticación/autorización
import { query } from '@/lib/db'; // Nuestra utilidad de base de datos
import { RowDataPacket } from 'mysql2';

// Interfaz para los datos del rol que devolveremos
interface RoleData extends RowDataPacket {
  id: number;
  nombre_rol: string;
  descripcion: string | null;
  // fecha_creacion: Date; // Opcional, si quieres devolverla
}

export async function GET(request: NextRequest) {
  // Proteger esta ruta: solo para administradores,
  // ya que la lista de roles se usará en contextos administrativos.
  const { user: adminUser, errorResponse } = await verifyAuth(request, ['administrador']);

  if (errorResponse) {
    return errorResponse; // Si hay error de autenticación/autorización, devolverlo
  }

  console.log(`Administrador ${adminUser?.email} (ID: ${adminUser?.userId}) está solicitando la lista de todos los roles.`);

  try {
    // Consultar todos los roles
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
