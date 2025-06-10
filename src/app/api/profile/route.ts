// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Esquema de validación con Zod para los datos de actualización del perfil
const updateProfileSchema = z.object({
  nombre: z.string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, { message: "El nombre solo puede contener letras y espacios." })
    .optional(),
  contraseñaActual: z.string().optional(),
  nuevaContraseña: z.string()
    .min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." })
    .optional()
    .or(z.literal('')),
  confirmarNuevaContraseña: z.string().optional(),
})
.partial() // Hace que todos los campos sean opcionales
.refine(data => {
    // Si se proporciona una nueva contraseña, también se debe proporcionar la actual.
    if (data.nuevaContraseña && !data.contraseñaActual) {
        return false;
    }
    return true;
}, {
    message: "Se requiere la contraseña actual para establecer una nueva.",
    path: ["contraseñaActual"],
})
.refine(data => {
    // Si se proporciona una nueva contraseña, la confirmación debe coincidir.
    if (data.nuevaContraseña && data.nuevaContraseña !== data.confirmarNuevaContraseña) {
        return false;
    }
    return true;
}, {
    message: "La nueva contraseña y su confirmación no coinciden.",
    path: ["confirmarNuevaContraseña"],
})
.refine(data => {
    // Asegurarse de que al menos un campo se esté actualizando.
    return !!data.nombre || !!data.nuevaContraseña;
}, {
    message: "Se debe proporcionar un nombre o una nueva contraseña para actualizar.",
});


export async function PUT(request: NextRequest) {
  // 1. Proteger la ruta: solo para usuarios autenticados (no se requieren roles específicos)
  const { session, errorResponse: authError } = await verifyApiAuth();
  if (authError) { return authError; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  // 2. Validar el cuerpo de la solicitud con Zod
  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }
  
  const { nombre, contraseñaActual, nuevaContraseña } = validation.data;

  try {
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    // Lógica para cambio de contraseña
    if (nuevaContraseña && contraseñaActual) {
      // Obtener el hash de la contraseña actual del usuario desde la BD
      const userResult = await query<RowDataPacket[]>('SELECT password_hash FROM usuarios WHERE id = ?', [userId]);
      if (userResult.length === 0) {
        return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
      }
      const currentPasswordHash = userResult[0].password_hash;
      
      // Verificar si la contraseña actual proporcionada es correcta
      const isPasswordMatch = await bcrypt.compare(contraseñaActual, currentPasswordHash);
      if (!isPasswordMatch) {
        return NextResponse.json({ message: 'La contraseña actual es incorrecta.' }, { status: 403 }); // 403 Forbidden
      }

      // Si es correcta, hashear la nueva contraseña y añadirla a la actualización
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(nuevaContraseña, salt);
      updateFields.push('password_hash = ?');
      updateValues.push(newPasswordHash);
    }

    // Lógica para cambio de nombre
    if (nombre) {
      updateFields.push('nombre = ?');
      updateValues.push(nombre);
    }
    
    // Si no hay campos para actualizar (aunque Zod ya lo valida, es una doble verificación)
    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos válidos para actualizar.' }, { status: 400 });
    }

    // Construir y ejecutar la consulta UPDATE
    const sqlSetClause = updateFields.join(', ');
    updateValues.push(userId);

    await query<ResultSetHeader>(
      `UPDATE usuarios SET ${sqlSetClause} WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({ message: "Tu perfil ha sido actualizado exitosamente." });

  } catch (error) {
    console.error(`Error al actualizar el perfil del usuario ID ${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al actualizar el perfil.' }, { status: 500 });
  }
}
