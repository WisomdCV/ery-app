// src/app/api/habits/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket, OkPacket } from 'mysql2';
import { z } from 'zod';

// Esquema de Zod para la validación del registro de un hábito
const logHabitSchema = z.object({
  habito_id: z.number().int().positive("El ID del hábito debe ser válido."),
  fecha_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),
  valor_booleano: z.boolean().optional(),
  valor_numerico: z.number().optional(),
  notas: z.string().optional().nullable(),
}).refine(data => {
    // Asegurar que al menos uno de los valores (booleano o numérico) esté presente
    return data.valor_booleano !== undefined || data.valor_numerico !== undefined;
}, {
    message: "Se debe proporcionar un valor booleano o numérico para el registro.",
    path: ["valor_booleano"], // Asignar el error a uno de los campos
});

interface HabitInfo extends RowDataPacket {
  usuario_id: number;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

interface ExistingLog extends RowDataPacket {
  id: number;
}

export async function POST(request: NextRequest) {
  // 1. Proteger la ruta: solo para usuarios autenticados
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  // 2. Validar el cuerpo de la solicitud con Zod
  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }
  
  const validation = logHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { habito_id, fecha_registro, valor_booleano, valor_numerico, notas } = validation.data;

  try {
    // 3. Verificación de Seguridad: Asegurarse de que el hábito pertenezca al usuario que hace la solicitud
    const habitCheck = await query<HabitInfo[]>('SELECT usuario_id, tipo FROM habitos WHERE id = ?', [habito_id]);
    if (habitCheck.length === 0) {
      return NextResponse.json({ message: `Hábito con ID ${habito_id} no encontrado.` }, { status: 404 });
    }
    if (habitCheck[0].usuario_id !== userId) {
      return NextResponse.json({ message: 'Acceso denegado. No tienes permiso para registrar en este hábito.' }, { status: 403 });
    }
    const habitType = habitCheck[0].tipo;
    
    // Validar que el tipo de valor coincida con el tipo de hábito
    if (habitType === 'SI_NO' && typeof valor_booleano !== 'boolean') {
        return NextResponse.json({ message: 'Este hábito requiere un valor booleano (true/false).' }, { status: 400 });
    }
    if (habitType === 'MEDIBLE_NUMERICO' && typeof valor_numerico !== 'number') {
        return NextResponse.json({ message: 'Este hábito requiere un valor numérico.' }, { status: 400 });
    }
    if (habitType === 'MAL_HABITO' && typeof valor_booleano !== 'boolean') {
        return NextResponse.json({ message: 'Para un mal hábito, se debe registrar un valor booleano.' }, { status: 400 });
    }

    // 4. Lógica "UPSERT": Actualizar si existe, insertar si no.
    const existingLog = await query<ExistingLog[]>('SELECT id FROM registros_habitos WHERE habito_id = ? AND fecha_registro = ?', [habito_id, fecha_registro]);

    if (existingLog.length > 0) {
      // Si ya existe un registro para este hábito en esta fecha, lo actualizamos.
      const logId = existingLog[0].id;
      console.log(`Actualizando registro existente (ID: ${logId}) para el hábito ID: ${habito_id}`);
      
      // CORRECCIÓN: Usar el operador "nullish coalescing" (??) para convertir `undefined` a `null`
      await query<OkPacket>(
        'UPDATE registros_habitos SET valor_booleano = ?, valor_numerico = ?, notas = ? WHERE id = ?',
        [valor_booleano ?? null, valor_numerico ?? null, notas ?? null, logId]
      );
      return NextResponse.json({ message: "Registro de hábito actualizado exitosamente." });
    } else {
      // Si no existe, creamos un nuevo registro.
      console.log(`Creando nuevo registro para el hábito ID: ${habito_id} en la fecha: ${fecha_registro}`);
      
      // CORRECCIÓN: Usar el operador "nullish coalescing" (??) aquí también
      const result = await query<OkPacket>(
        'INSERT INTO registros_habitos (habito_id, fecha_registro, valor_booleano, valor_numerico, notas) VALUES (?, ?, ?, ?, ?)',
        [habito_id, fecha_registro, valor_booleano ?? null, valor_numerico ?? null, notas ?? null]
      );
      return NextResponse.json({ message: "Progreso del hábito registrado exitosamente.", logId: result.insertId }, { status: 201 });
    }
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    if (typedError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'Error: Ya existe un registro para este hábito en esta fecha.' }, { status: 409 });
    }
    console.error("Error al registrar el progreso del hábito:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
