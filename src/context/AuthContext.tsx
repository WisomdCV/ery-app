// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Interfaz para el objeto de usuario
interface User {
  id: number;
  nombre: string;
  email: string;
  // Puedes añadir más campos del usuario aquí si los necesitas globalmente
  // Por ejemplo, roles o permisos, una vez que los implementemos
}

// Interfaz para el valor del contexto de autenticación
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean; // Para saber si se está cargando el estado inicial de auth
  login: (userData: User, authToken: string) => void;
  logout: () => void;
}

// Crear el contexto con un valor por defecto undefined para forzar el uso del Provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para el AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inicia como true para cargar el estado inicial
  const router = useRouter();

  // Efecto para cargar el estado de autenticación desde localStorage al iniciar la app
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUserData = localStorage.getItem('userData');

      if (storedToken && storedUserData) {
        const parsedUser = JSON.parse(storedUserData) as User;
        // TODO: Aquí podrías añadir una verificación del token con el backend
        // para asegurar que no haya expirado o sido invalidado.
        // Por ahora, simplemente lo cargamos.
        setUser(parsedUser);
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Error al cargar datos de autenticación desde localStorage:", error);
      // Si hay error (ej. JSON malformado), limpiar para evitar problemas
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    } finally {
      setIsLoading(false); // Termina la carga inicial
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    // La redirección se maneja en la página de login, pero podrías centralizarla aquí si prefieres
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // Redirigir al usuario a la página de login o a la home
    router.push('/login');
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
