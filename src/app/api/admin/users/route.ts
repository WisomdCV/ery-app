```typescript
// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils'; // Nuestra función de ayuda para autenticación/autorización
import { query, DatabaseConnectionError } from '@/lib/db'; // Nuestra utilidad de base de datos
import { RowDataPacket } from 'mysql2';

// Interfaz para los datos del usuario que devolveremos (excluyendo datos sensibles)
interface UserListData extends RowDataPacket {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean;
  fecha_creacion: Date;
  // Podríamos añadir los roles del usuario aquí también si es necesario
}

export async function GET(request: NextRequest) {
  try {
    // Proteger esta ruta: solo para administradores
    const authResult = await verifyAuth(request, ['administrador']);
    if (authResult.errorResponse) {
      return authResult.errorResponse; // Si hay error de autenticación/autorización, devolverlo
    }
    const adminUser = authResult.user; // El usuario autenticado si la verificación fue exitosa

    // Si llegamos aquí, el usuario está autenticado y tiene el rol 'administrador'
    console.log(`Administrador ${adminUser?.email} (ID: ${adminUser?.userId}) está solicitando la lista de usuarios.`);

    // Consultar todos los usuarios. Excluir el password_hash y otros datos sensibles.
    // También podemos obtener los roles de cada usuario si es necesario con un JOIN.
    // Por ahora, una lista simple de usuarios.
    const users = await query<UserListData[]>(
      `SELECT id, nombre, apellido, email, activo, fecha_creacion 
       FROM usuarios 
       ORDER BY fecha_creacion DESC` // Opcional: ordenar por fecha de creación o nombre
    );

    return NextResponse.json({ users }, { status: 200 });

  } catch (error: any) {
    console.error('Error en /api/admin/users:', error);
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: 'Servicio no disponible temporalmente debido a problemas con la base de datos.', code: "DB_UNAVAILABLE" }, { status: 503 });
    }
    // Handle other errors that might not be DatabaseConnectionError but still need a generic server error response
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener la lista de usuarios.', errorDetails: error.message },
      { status: 500 }
    );
  }
}

// Aquí podrías añadir una función POST para que un administrador cree usuarios,
// pero la dejaremos para más adelante si es necesario.
// export async function POST(request: NextRequest) {
//   const { user: adminUser, errorResponse } = await verifyAuth(request, ['administrador']);
//   if (errorResponse) {
//     return errorResponse;
//   }
//   // ... lógica para crear un nuevo usuario por un administrador ...
//   return NextResponse.json({ message: "Usuario creado por administrador" });
// }
```
