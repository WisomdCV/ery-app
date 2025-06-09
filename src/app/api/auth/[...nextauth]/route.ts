// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// --- Inicio: Aumentación de Tipos para NextAuth ---
// Extiende las interfaces por defecto de NextAuth para incluir nuestro 'id' y 'roles'.
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: number; // Nuestro ID de la base de datos
      roles?: string[]; // Nuestros roles de la base de datos
    } & DefaultSession["user"]; // Mantiene los campos por defecto (name, email, image)
  }

  interface User { // El objeto User que se pasa a los callbacks
    id?: number;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT { // El contenido del token JWT de sesión
    id?: number;
    roles?: string[];
  }
}
// --- Fin: Aumentación de Tipos para NextAuth ---

// Interfaz para el usuario de nuestra base de datos
interface AppUser extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  foto_perfil_url?: string | null;
}

// Interfaz para los roles de nuestra base de datos
interface UserRole extends RowDataPacket {
    nombre_rol: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // Aquí es donde, más adelante, podríamos reintegrar nuestro sistema de
    // login con email/contraseña como un proveedor de "Credenciales".
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // 1. Se llama cuando un usuario intenta iniciar sesión
    async signIn({ user, account, profile }) {
      // Solo nos interesa procesar esto para el proveedor de Google
      if (account?.provider === "google" && profile?.email) {
        try {
          // Verificar si el usuario ya existe en nuestra BD por email
          const existingUserResults = await query<AppUser[]>(
            "SELECT id, nombre, email, foto_perfil_url FROM usuarios WHERE email = ?",
            [profile.email]
          );

          if (existingUserResults.length > 0) {
            // El usuario existe, permitir inicio de sesión
            console.log(`Usuario existente encontrado con Google: ${profile.email}`);
            return true;
          } else {
            // Si el usuario no existe, lo creamos en nuestra base de datos
            console.log(`Creando nuevo usuario desde Google: ${profile.email}`);
            
            // La columna password_hash no puede ser nula. Generamos un hash aleatorio seguro
            // que nunca se usará para iniciar sesión, solo para cumplir con el esquema de la BD.
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const password_hash = await bcrypt.hash(randomPassword, 10);

            const newUser = {
              email: profile.email,
              nombre: profile.name || profile.email.split('@')[0] || "Usuario",
              password_hash: password_hash,
              foto_perfil_url: profile.image || null,
              activo: true,
            };

            const insertResult = await query<OkPacket>(
              "INSERT INTO usuarios (email, nombre, password_hash, foto_perfil_url, activo) VALUES (?, ?, ?, ?, ?)",
              [newUser.email, newUser.nombre, newUser.password_hash, newUser.foto_perfil_url, newUser.activo]
            );

            if (insertResult.affectedRows === 1) {
                const newUserId = insertResult.insertId;
                console.log(`Nuevo usuario creado con ID: ${newUserId}`);
                // **Punto de mejora futuro:** Asignar el rol 'usuario_estandar' por defecto
                // const standardRoleId = 2; // Asumiendo que 2 es el ID de 'usuario_estandar'
                // await query("INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)", [newUserId, standardRoleId]);
                return true; // Permitir inicio de sesión
            } else {
                console.error("Error al crear nuevo usuario desde Google: no se insertó la fila.");
                return false; // Impedir si falla la creación en BD
            }
          }
        } catch (error) {
          console.error("Error en callback signIn de NextAuth:", error);
          return false; // Impedir inicio de sesión en caso de error
        }
      }
      return true; // Permitir otros tipos de signIn por defecto
    },

    // 2. Se llama para crear/actualizar el JWT de sesión
    async jwt({ token, user }) {
      // Si el objeto `user` está presente (esto ocurre al iniciar sesión),
      // significa que podemos buscar sus datos en nuestra BD y enriquecer el token.
      if (user?.email) {
        try {
          const dbUserResults = await query<AppUser[]>(
            "SELECT id, nombre, email FROM usuarios WHERE email = ?",
            [user.email]
          );

          if (dbUserResults.length > 0) {
            const dbUser = dbUserResults[0];
            const rolesResults = await query<UserRole[]>(
                `SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,
                [dbUser.id]
            );
            
            // Añadir nuestros datos personalizados (ID y roles de nuestra BD) al token
            token.id = dbUser.id;
            token.roles = rolesResults.map(r => r.nombre_rol);
            token.name = dbUser.nombre; // Asegurarse de que el nombre sea el de nuestra BD
          }
        } catch (error) {
          console.error("Error obteniendo datos de BD en callback jwt:", error);
        }
      }
      // En solicitudes posteriores, el token ya enriquecido se devuelve.
      return token;
    },

    // 3. Se llama para crear/actualizar el objeto de sesión que verá el cliente
    async session({ session, token }) {
      // Pasamos los datos de nuestro token enriquecido al objeto `session` del cliente.
      if (token && session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles;
        // El `name`, `email` y `image` ya son manejados por NextAuth si están presentes en el token.
      }
      return session;
    },
  },

  // Secret y URL base de la aplicación (leídos desde .env.local)
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // Si queremos usar nuestra página /login en lugar de la que genera NextAuth por defecto
    // cuando ocurra un error o se requiera iniciar sesión.
    signIn: '/login',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
