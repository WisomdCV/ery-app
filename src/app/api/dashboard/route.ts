// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// --- Interfaces ---
interface HabitFromDB extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: Date;
}

interface HabitLogFromDB extends RowDataPacket {
  habito_id: number;
  fecha_registro: Date;
  valor_booleano: boolean | null;
}

// Interfaz para el objeto final que devolverá la API
interface HabitWithStats extends HabitFromDB {
  racha_actual: number;
}

// --- Función Principal del Endpoint ---
export async function GET(request: NextRequest) {
  // 1. Proteger la ruta: solo para usuarios autenticados
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario.' }, { status: 401 });
  }

  try {
    // 2. Obtener todos los hábitos del usuario
    const habits = await query<HabitFromDB[]>(
      `SELECT * FROM habitos WHERE usuario_id = ?`,
      [userId]
    );

    if (habits.length === 0) {
      return NextResponse.json({ habits_con_estadisticas: [] });
    }

    // 3. Obtener todos los registros de progreso para los hábitos de este usuario
    const habitIds = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');
    const logs = await query<HabitLogFromDB[]>(
      `SELECT habito_id, fecha_registro, valor_booleano FROM registros_habitos WHERE habito_id IN (${placeholders}) ORDER BY fecha_registro DESC`,
      habitIds
    );
    
    // Agrupar los logs por habito_id para un acceso más rápido
    const logsByHabitId = new Map<number, HabitLogFromDB[]>();
    for (const log of logs) {
      if (!logsByHabitId.has(log.habito_id)) {
        logsByHabitId.set(log.habito_id, []);
      }
      logsByHabitId.get(log.habito_id)!.push(log);
    }

    // 4. Calcular estadísticas para cada hábito
    const habits_con_estadisticas: HabitWithStats[] = habits.map(habit => {
      const habitLogs = logsByHabitId.get(habit.id) || [];
      let racha_actual = 0;

      if (habit.tipo === 'MAL_HABITO') {
        // Racha de abstinencia: días desde la última recaída o desde la creación
        let lastRelapseDate: Date | null = null;
        for (const log of habitLogs) {
            // Un registro para un mal hábito implica una recaída.
            // Como los logs están ordenados DESC, el primero que encontremos es el más reciente.
            lastRelapseDate = new Date(log.fecha_registro);
            break;
        }
        
        const startDate = lastRelapseDate ? lastRelapseDate : new Date(habit.fecha_creacion);
        racha_actual = calculateDaysBetween(startDate, new Date());

      } else { // Para 'SI_NO' y 'MEDIBLE_NUMERICO'
        // Racha de cumplimiento: días consecutivos hasta hoy/ayer
        racha_actual = calculateConsecutiveDays(habitLogs);
      }
      
      return { ...habit, racha_actual };
    });

    return NextResponse.json({ habits_con_estadisticas });

  } catch (error) {
    console.error("Error al obtener los datos del dashboard:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}

// --- Funciones de Ayuda para Cálculos ---

/**
 * Calcula la diferencia en días entre dos fechas, ignorando la hora.
 */
function calculateDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}


/**
 * Calcula los días consecutivos de cumplimiento para un hábito positivo.
 * @param logs - Los registros para un hábito, ORDENADOS POR FECHA DESCENDENTE.
 */
function calculateConsecutiveDays(logs: HabitLogFromDB[]): number {
  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  // Convertir los strings de fecha a objetos Date y crear un Set para búsqueda rápida
  const logDates = new Set(logs.filter(log => log.valor_booleano === true).map(log => {
      const d = new Date(log.fecha_registro);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
  }));

  // Empezar a verificar desde hoy o ayer
  let currentDate = new Date(today);
  
  // Si no hay registro para hoy, empezamos a contar desde ayer
  if (!logDates.has(currentDate.getTime())) {
      currentDate.setDate(currentDate.getDate() - 1);
  }

  // Contar hacia atrás
  while (logDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}
