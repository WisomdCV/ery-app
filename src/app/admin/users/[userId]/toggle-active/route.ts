// src/app/api/admin/users/[userId]/toggle-active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface ToggleActiveRequestBody {
  activo: boolean;
}

// Interfaz para los parámetros de la ruta dinámica
interface RouteContext {
  params: {
    userId: string;
  };
}

export async function PUT(request: NextRequest, context: RouteContext) { // Renombrado el segundo parámetro a 'context'
  const { user: adminUser, errorResponse: authError } = await verifyAuth(request, ['administrador']);

  if (authError) {
    return authError;
  }

  // Acceder a userId desde context.params
  const { userId } = context.params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    // Este es el error que estás viendo en Postman, lo que significa que userId no se está parseando correctamente.
    console.error(`ID de usuario inválido recibido en la ruta: ${userId}`);
    return NextResponse.json({ message: 'ID de usuario inválido en la ruta.' }, { status: 400 });
  }

  if (adminUser?.userId === numericUserId) {
    return NextResponse.json({ message: 'Un administrador no puede cambiar su propio estado activo a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as ToggleActiveRequestBody;
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json({ message: 'El campo "activo" debe ser un valor booleano en el cuerpo de la solicitud.' }, { status: 400 });
    }

    const result = await query<ResultSetHeader>(
      'UPDATE usuarios SET activo = ? WHERE id = ?',
      [activo, numericUserId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    return NextResponse.json(
      { message: `Estado del usuario ID ${numericUserId} actualizado a ${activo ? 'activo' : 'inactivo'}.` },
      { status: 200 }
    );

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error(`Error al actualizar estado activo del usuario ID ${numericUserId}:`, typedError);
    if (error instanceof SyntaxError) { // Error al parsear el JSON del body
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el estado del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
