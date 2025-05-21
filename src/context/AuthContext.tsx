// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Interfaz para el objeto de usuario, ahora incluye roles
interface User {
  id: number;
  nombre: string;
  email: string;
  roles: string[]; // Array de strings para los nombres de los roles
}

// Interfaz para el valor del contexto de autenticación
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, authToken: string) => void; // userData ahora debe incluir roles
  logout: () => void;
  hasRole: (roleName: string) => boolean; // Nueva función para verificar roles
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUserData = localStorage.getItem('userData');

      if (storedToken && storedUserData) {
        const parsedUser = JSON.parse(storedUserData) as User; // Asegurarse que el parseo incluya roles
        // Aquí se podría añadir una verificación del token con el backend
        setUser(parsedUser);
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Error al cargar datos de autenticación desde localStorage:", error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    // userData que llega desde la API de login ya debería incluir el array de roles
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userData', JSON.stringify(userData)); // Guardar userData completo, incluyendo roles
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/login');
  };

  // Nueva función para verificar si el usuario tiene un rol específico
  const hasRole = (roleName: string): boolean => {
    return user?.roles?.includes(roleName) || false;
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    hasRole, // Añadir la nueva función al valor del contexto
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
