```typescript
// src/app/api/admin/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuthUtils';
import { query, DatabaseConnectionError } from '@/lib/db'; // Ensure DatabaseConnectionError is imported
import { RowDataPacket } from 'mysql2';

interface Role extends RowDataPacket {
  id_rol: number;
  nombre_rol: string;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request, ['administrador']);

    if (authResult.errorResponse) {
      return authResult.errorResponse; // Return unauthorized/forbidden response
    }

    const { user } = authResult; 
    console.log(`User ${user?.email} (ID: ${user?.userId}) attempting to access roles.`);

    // This part will likely fail if DB is not connected, but auth should be checked first
    const roles = await query<Role[]>('SELECT id_rol, nombre_rol FROM roles');
    return NextResponse.json({ roles });

  } catch (error: any) {
    console.error('Error in /api/admin/roles:', error);
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: 'Servicio no disponible temporalmente debido a problemas con la base de datos.', code: "DB_UNAVAILABLE" }, { status: 503 });
    }
    // This generic error might be hit if verifyAuth itself has an issue not caught as DatabaseConnectionError
    // or other unexpected errors in this route handler.
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: error.message }, { status: 500 });
  }
}
```
