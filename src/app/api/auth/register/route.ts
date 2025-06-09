// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

// Esquema de validación con Zod (sin cambios)
const registerSchema = z.object({
  nombre: z.string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .max(100, { message: "El nombre no puede exceder los 100 caracteres." })
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, { message: "El nombre solo puede contener letras y espacios." }),
  apellido: z.string()
    .max(100)
    .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]*$/, { message: "El apellido solo puede contener letras y espacios." })
    .optional()
    .or(z.literal('')),
  email: z.string().email({ message: "Formato de correo electrónico inválido." }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
  fecha_nacimiento: z.string().optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(255).optional().or(z.literal('')),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  pais: z.string().max(100).optional().or(z.literal('')),
});

// Interfaces
interface ExistingUser extends RowDataPacket {
  id: number;
}
// Nueva interfaz para obtener el ID de un rol
interface RoleId extends RowDataPacket {
    id: number;
}

export async function POST(request: NextRequest) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 });
  }

  const validation = registerSchema.safeParse(requestBody);

  if (!validation.success) {
    return NextResponse.json(
      { 
        message: "Datos de entrada inválidos.",
        errors: validation.error.flatten().fieldErrors 
      }, 
      { status: 400 }
    );
  }

  const { nombre, apellido, email, password, fecha_nacimiento, telefono, direccion, ciudad, pais } = validation.data;

  try {
    const existingUserResults = await query<ExistingUser[]>('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUserResults.length > 0) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sqlInsert = `
      INSERT INTO usuarios (nombre, apellido, email, password_hash, fecha_nacimiento, telefono, direccion, ciudad, pais, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const paramsInsert = [
        nombre, 
        apellido || null, 
        email, 
        password_hash, 
        fecha_nacimiento || null, 
        telefono || null, 
        direccion || null, 
        ciudad || null, 
        pais || null, 
        true
    ];

    const result = await query<ResultSetHeader>(sqlInsert, paramsInsert);

    if (result.affectedRows === 1 && result.insertId) {
      const newUserId = result.insertId;
      console.log(`Nuevo usuario creado con Email. ID: ${newUserId}`);

      // --- INICIO: LÓGICA DE ASIGNACIÓN DE ROL POR DEFECTO ---
      try {
        // 1. Buscar el ID del rol 'usuario_estandar'
        const roleResults = await query<RoleId[]>("SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1");
        
        if (roleResults.length > 0) {
          const standardRoleId = roleResults[0].id;
          // 2. Insertar la asignación en la tabla usuario_roles
          await query("INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)", [newUserId, standardRoleId]);
          console.log(`Rol 'usuario_estandar' asignado al nuevo usuario ID: ${newUserId}`);
        } else {
          // Esto es importante loguearlo por si el rol no existiera en la BD
          console.warn("ADVERTENCIA: No se encontró el rol 'usuario_estandar'. El nuevo usuario no tendrá roles por defecto.");
        }
      } catch (roleError) {
        // Loguear el error pero no impedir el registro si solo falla la asignación de rol
        console.error(`Error al asignar rol por defecto al usuario ID ${newUserId}:`, roleError);
      }
      // --- FIN: LÓGICA DE ASIGNACIÓN DE ROL POR DEFECTO ---

      const newUser = {
        id: newUserId,
        nombre,
        email,
      };
      return NextResponse.json({ message: 'Usuario registrado exitosamente.', user: newUser }, { status: 201 });
    } else {
      console.error('Fallo al insertar usuario, resultado:', result);
      return NextResponse.json({ message: 'Error al registrar el usuario.' }, { status: 500 });
    }

  } catch (error) {
    const typedError = error as { message?: string; code?: string; };
    console.error('Error en /api/auth/register:', typedError);
    if (typedError.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'El correo electrónico ya está registrado (error de BD).' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.', errorDetails: typedError.message }, { status: 500 });
  }
}
