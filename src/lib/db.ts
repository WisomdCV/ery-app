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
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3307,
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

      // Nota: mysql2/promise Pool no soporta el evento 'error'.
      // Si necesitas manejar errores de conexión, hazlo en los catch de las consultas.
    } catch (error) {
      console.error('Failed to create MySQL Connection Pool:', error);
      // Si la creación del pool falla, es un error crítico.
      // Podrías lanzar el error para detener la aplicación o manejarlo de otra forma.
      throw error;
    }
  }
  return pool;
}

// Hacemos la función query más genérica con tipos
// T es el tipo esperado para las filas de resultados (SELECT)
// U es el tipo esperado para los resultados de operaciones (INSERT, UPDATE, DELETE) que suelen ser OkPacket o ResultSetHeader
export async function query<T extends RowDataPacket[] | RowDataPacket[][] | OkPacket | OkPacket[] | ResultSetHeader>(
  sql: string,
  params?: any[] | object
): Promise<T> {
  const currentPool = getPool(); // Esto asegura que el pool se cree si no existe
  let connection;
  try {
    // Es buena práctica obtener una conexión del pool para cada consulta
    // y liberarla después, aunque `pool.execute` también lo maneja internamente.
    // Para mayor control o transacciones, `pool.getConnection()` es útil.
    // Para simplicidad aquí, `currentPool.execute` es suficiente.
    const [results] = await currentPool.execute<T>(sql, params);
    return results;
  } catch (error: any) {
    console.error('Error executing query:', { sql, params, errorMessage: error.message, errorCode: error.code });
    // Podrías querer lanzar un error más específico o manejarlo de otra forma
    // Es importante no exponer detalles sensibles del error al cliente en producción.
    throw new Error(`Database query failed. SQLState: ${error.sqlState}, Code: ${error.code}`);
  }
  // No cerramos la conexión aquí porque el pool la gestiona.
  // Si usaras `pool.getConnection()`, necesitarías `connection.release()` en un bloque finally.
}