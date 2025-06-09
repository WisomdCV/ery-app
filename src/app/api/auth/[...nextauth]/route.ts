// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

// --- Aumentación de Tipos y Interfaces (sin cambios) ---
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: { id?: number; roles?: string[]; } & DefaultSession["user"];
  }
  interface User { id?: number; roles?: string[]; }
}
declare module "next-auth/jwt" {
  interface JWT { id?: number; roles?: string[]; }
}
interface AppUser extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  activo: boolean;
  foto_perfil_url?: string | null;
}
interface UserRole extends RowDataPacket {
    nombre_rol: string;
}
// Nueva interfaz para obtener el ID de un rol
interface RoleId extends RowDataPacket {
    id: number;
}
const loginSchema = z.object({
  email: z.string().email({ message: "Formato de correo electrónico inválido." }),
  password: z.string().min(1, { message: "La contraseña no puede estar vacía." }),
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
        name: 'Credentials',
        credentials: { /* ... */ },
        async authorize(credentials, req) {
          // ... (Lógica de authorize para credenciales sin cambios)
          const parsedCredentials = loginSchema.safeParse(credentials);
          if (!parsedCredentials.success) { return null; }
          const { email, password } = parsedCredentials.data;
          const userResults = await query<AppUser[]>('SELECT id, email, nombre, password_hash, activo FROM usuarios WHERE email = ?', [email]);
          if (userResults.length === 0) { return null; }
          const user = userResults[0];
          if (!user.activo) { throw new Error("account_disabled"); }
          const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
          if (!isPasswordMatch) { return null; }
          return { id: user.id, name: user.nombre, email: user.email };
        }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const existingUserResults = await query<AppUser[]>("SELECT id FROM usuarios WHERE email = ?", [profile.email]);

          if (existingUserResults.length > 0) {
            return true; // El usuario de Google ya existe, permitir login
          } else {
            // Si el usuario de Google no existe, lo creamos
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const password_hash = await bcrypt.hash(randomPassword, 10);
            const insertResult = await query<OkPacket>(
              "INSERT INTO usuarios (email, nombre, password_hash, foto_perfil_url, activo) VALUES (?, ?, ?, ?, ?)",
              [profile.email, profile.name || profile.email.split('@')[0], password_hash, profile.image || null, true]
            );

            if (insertResult.affectedRows === 1) {
              const newUserId = insertResult.insertId;
              console.log(`Nuevo usuario creado con Google. ID: ${newUserId}`);

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
                // Loguear el error pero no impedir el login si solo falla la asignación de rol
                console.error(`Error al asignar rol por defecto al usuario ID ${newUserId}:`, roleError);
              }
              // --- FIN: LÓGICA DE ASIGNACIÓN DE ROL POR DEFECTO ---

              return true; // Permitir inicio de sesión incluso si la asignación de rol falló (decisión de diseño)
            }
            return false; // Falló la inserción del usuario
          }
        } catch (error) {
          console.error("Error en callback signIn de Google:", error);
          return false;
        }
      }
      return true; // Permitir para otros proveedores (como Credentials)
    },
    
    // Los callbacks jwt y session se mantienen igual
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const dbUserResults = await query<AppUser[]>("SELECT id, nombre, email FROM usuarios WHERE email = ?", [user.email]);
          if (dbUserResults.length > 0) {
            const dbUser = dbUserResults[0];
            const rolesResults = await query<UserRole[]>(`SELECT r.nombre_rol FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`, [dbUser.id]);
            token.id = dbUser.id;
            token.roles = rolesResults.map(r => r.nombre_rol);
            token.name = dbUser.nombre;
          }
        } catch (error) {
          console.error("Error obteniendo datos de BD en callback jwt:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
