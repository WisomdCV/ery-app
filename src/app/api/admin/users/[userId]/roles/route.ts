// src/app/api/admin/users/[userId]/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils'; // 1. Usar la nueva utilidad de NextAuth.js
import { query } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface UpdateUserRolesRequestBody {
  roleIds: number[]; // Array de IDs de los nuevos roles para el usuario
}

interface RouteContext {
  params: {
    userId: string;
  };
}

interface RoleCheck extends RowDataPacket {
  id: number;
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

  // 3. Usar el ID del admin desde la sesión para la comprobación
  if (session?.user?.id === numericUserId) {
    return NextResponse.json({ message: 'Un administrador no puede modificar sus propios roles a través de esta interfaz.' }, { status: 403 });
  }

  try {
    const body = await request.json() as UpdateUserRolesRequestBody;
    const { roleIds } = body;

    if (!Array.isArray(roleIds) || !roleIds.every(id => typeof id === 'number' && Number.isInteger(id))) {
      return NextResponse.json({ message: 'El campo "roleIds" debe ser un array de números enteros (IDs de roles).' }, { status: 400 });
    }

    const userExists = await query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id = ?', [numericUserId]);
    if (userExists.length === 0) {
        return NextResponse.json({ message: `Usuario con ID ${numericUserId} no encontrado.` }, { status: 404 });
    }

    if (roleIds.length > 0) {
      const placeholders = roleIds.map(() => '?').join(',');
      const existingRoles = await query<RoleCheck[]>(`SELECT id FROM roles WHERE id IN (${placeholders})`, roleIds);
      if (existingRoles.length !== roleIds.length) {
        const foundRoleIds = existingRoles.map(r => r.id);
        const notFoundRoleIds = roleIds.filter(id => !foundRoleIds.includes(id));
        return NextResponse.json({ message: `Los siguientes IDs de rol no son válidos o no existen: ${notFoundRoleIds.join(', ')}.` }, { status: 400 });
      }
    }

    // Lógica de actualización de roles
    await query<ResultSetHeader>('DELETE FROM usuario_roles WHERE usuario_id = ?', [numericUserId]);

    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        await query<ResultSetHeader>(
          'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)',
          [numericUserId, roleId]
        );
      }
    }

    return NextResponse.json(
      { message: `Roles del usuario ID ${numericUserId} actualizados correctamente.` },
      { status: 200 }
    );

  } catch (error) {
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error(`Error al actualizar roles del usuario ID ${numericUserId}:`, typedError);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Cuerpo de la solicitud JSON malformado.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar los roles del usuario.', errorDetails: typedError.message },
      { status: 500 }
    );
  }
}
