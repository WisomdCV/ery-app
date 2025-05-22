```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myapp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Custom Error for Database Connection Issues
export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  try {
    const [results] = await pool.execute(sql, params);
    return results as T;
  } catch (error: any) {
    console.error("Error executing query:", { sql, params, errorMessage: error.message, errorCode: error.code, sqlState: error.sqlState });
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      throw new DatabaseConnectionError(`Database connection failed: ${error.message}`);
    }
    throw new Error(`Database query failed: ${error.message}`);
  }
}

// Helper function to handle database errors in API routes
export function handleDbError(error: any) {
  if (error instanceof DatabaseConnectionError) {
    return { message: "Servicio no disponible temporalmente debido a problemas con la base de datos.", code: "DB_UNAVAILABLE" };
  }
  // Handle other types of errors or re-throw if necessary
  return { message: 'Error interno del servidor.', errorDetails: error.message };
}
```
