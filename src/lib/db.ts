// src/lib/db.ts
import mysql, { Pool, RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';

// Definimos una interfaz para la configuración de la BD para mayor claridad
interface DbConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  // Opciones adicionales para el pool si las necesitas
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

// Configura los detalles de la conexión usando variables de entorno
const dbConfig: DbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Puedes ajustar este valor según tus necesidades
  queueLimit: 0
};

// El pool se crea una sola vez y se reutiliza
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      console.log('MySQL Connection Pool created successfully.');

      // Nota: mysql2/promise Pool no soporta el evento 'error' directamente en el pool object como en `mysql`.
      // Los errores de conexión individuales se manejan en los catch de las consultas.
    } catch (error) {
      console.error('Failed to create MySQL Connection Pool:', error);
      throw error;
    }
  }
  return pool;
}

// Hacemos la función query más genérica con tipos
export async function query<T extends RowDataPacket[] | RowDataPacket[][] | OkPacket | OkPacket[] | ResultSetHeader>(
  sql: string,
  // Corregido: params puede ser un array de primitivas o un objeto para sentencias preparadas
  params?: (string | number | boolean | null)[] | Record<string, unknown> | undefined
): Promise<T> {
  const currentPool = getPool();
  // Corregido: La variable 'connection' no se usaba y ha sido eliminada.
  try {
    const [results] = await currentPool.execute<T>(sql, params);
    return results;
  } catch (error) { // Corregido: Usar 'unknown' para el tipo de error y luego verificarlo si es necesario
    // Para el log, podemos acceder a 'message' y 'code' si asumimos que es un error de MySQL o similar.
    // Para mayor seguridad, se podría hacer una verificación de tipo: if (error instanceof Error)
    const typedError = error as { message?: string; code?: string; sqlState?: string };
    console.error('Error executing query:', {
        sql,
        params,
        errorMessage: typedError.message,
        errorCode: typedError.code,
        sqlState: typedError.sqlState
    });
    throw new Error(`Database query failed. SQLState: ${typedError.sqlState}, Code: ${typedError.code}`);
  }
}
