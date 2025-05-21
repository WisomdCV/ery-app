// src/components/AuthStatus.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Importar el hook useAuth

export default function AuthStatus() {
  const { user, logout, isLoading } = useAuth(); // Obtener user, logout, e isLoading del contexto

  if (isLoading) {
    // Mostrar un estado de carga mientras se verifica la autenticación inicial
    // Puedes personalizar este loader como prefieras
    return (
      <div className="p-4 text-center text-gray-400">
        Cargando estado de autenticación...
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 shadow-md rounded-lg text-center">
      {user ? (
        // Si hay un usuario autenticado
        <div className="space-y-3">
          <p className="text-lg text-white">
            Bienvenido, <span className="font-semibold">{user.nombre || user.email}</span>!
          </p>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
          >
            Cerrar Sesión
          </button>
        </div>
      ) : (
        // Si no hay un usuario autenticado
        <div className="space-y-3 md:space-y-0 md:space-x-4">
          <p className="text-lg text-gray-300 mb-2 md:mb-0">No has iniciado sesión.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out"
            >
              Registrarse
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
