// src/app/api/habits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket, OkPacket } from 'mysql2';
import { z } from 'zod';

// Esquema de Zod para la validación al crear un nuevo hábito
const createHabitSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido.").max(255),
  descripcion: z.string().optional().nullable(),
  tipo: z.enum(['SI_NO', 'MEDIBLE_NUMERICO', 'MAL_HABITO'], {
    errorMap: () => ({ message: "Tipo de hábito inválido." })
  }),
  meta_objetivo: z.number().optional().nullable(),
}).refine(data => {
    // Si el tipo es medible, la meta es requerida.
    if (data.tipo === 'MEDIBLE_NUMERICO') {
        return data.meta_objetivo != null && data.meta_objetivo > 0;
    }
    return true;
}, {
    message: "Para un hábito medible, se requiere una meta objetivo mayor a 0.",
    path: ["meta_objetivo"],
});


// Interfaz para un hábito devuelto por la API
interface Habit extends RowDataPacket {
  id: number;
  usuario_id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: Date;
}

// --- GET /api/habits ---
export async function GET(request: NextRequest) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) {
    return errorResponse;
  }

  const userId = session?.user?.id;

  // CORRECCIÓN: Verificar si tenemos un userId válido antes de continuar
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  console.log(`Usuario ID: ${userId} está solicitando su lista de hábitos.`);

  try {
    // Ahora, 'userId' aquí está garantizado que es un número.
    const habits = await query<Habit[]>(
      `SELECT * FROM habitos WHERE usuario_id = ? ORDER BY fecha_creacion DESC`,
      [userId]
    );

    return NextResponse.json({ habits });

  } catch (error) {
    console.error("Error al obtener la lista de hábitos:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}


// --- POST /api/habits ---
export async function POST(request: NextRequest) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) {
    return errorResponse;
  }
  const userId = session?.user?.id;

  // CORRECCIÓN: Verificar si tenemos un userId válido antes de continuar
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }
  
  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = createHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, descripcion, tipo, meta_objetivo } = validation.data;
  console.log(`Usuario ID: ${userId} está creando un nuevo hábito: "${nombre}"`);

  try {
    const sqlInsert = `
      INSERT INTO habitos (usuario_id, nombre, descripcion, tipo, meta_objetivo)
      VALUES (?, ?, ?, ?, ?)
    `;
    // Ahora, 'userId' aquí está garantizado que es un número.
    const paramsInsert = [userId, nombre, descripcion || null, tipo, meta_objetivo || null];
    const result = await query<OkPacket>(sqlInsert, paramsInsert);

    if (result.affectedRows === 1) {
      const newHabitId = result.insertId;
      const newHabit = {
        id: newHabitId,
        usuario_id: userId,
        nombre,
        descripcion: descripcion || null,
        tipo,
        meta_objetivo: meta_objetivo || null,
      };
      return NextResponse.json({ message: "Hábito creado exitosamente.", habit: newHabit }, { status: 201 });
    }

    return NextResponse.json({ message: "No se pudo crear el hábito." }, { status: 500 });

  } catch (error) {
    console.error("Error al crear el hábito:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
