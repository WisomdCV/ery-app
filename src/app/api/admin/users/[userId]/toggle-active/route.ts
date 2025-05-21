// src/app/api/admin/users/[userId]/toggle-active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface ToggleActiveRequestBody {
  activo: boolean; // El nuevo estado deseado para 'activo'
}

// El primer parámetro 'request' es obligatorio, incluso si no se usa directamente en este GET de ejemplo.
// El segundo parámetro 'params' contendrá los parámetros de la ruta dinámica.
interface RouteParams {
  params: {
    userId: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user: adminUser, errorResponse: authError } = await verifyAuth(request, ['administrador']);

  if (authError) {
    return authError;
  }

  const { userId } = params;
  const numericUserId = parseInt(userId, 10);

  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
  }

  // No permitir que un administrador se desactive a sí mismo a través de esta ruta
  // Podrían tener otra forma de gestionar su propia cuenta si es necesario.
  if (adminUser?.userId === numericUserId) {
    return NextResponse.json({ message: 'Un administrador no puede cambiar su propio estado activo a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as ToggleActiveRequestBody;
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json({ message: 'El campo "activo" debe ser un valor booleano.' }, { status: 400 });
    }

    // Actualizar el estado 'activo' del usuario en la base de datos
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
    // Si el error es porque el JSON está malformado
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el estado del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
