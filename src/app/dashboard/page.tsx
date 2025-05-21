// src/app/dashboard/page.tsx
'use client'; // Necesario para hooks como useEffect, useRouter, useAuth

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Nuestro AuthContext

export default function DashboardPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo actuar cuando isLoading sea false para evitar redirecciones prematuras
    if (!isLoading) {
      if (!user || !token) {
        // Si no hay usuario o token después de cargar, redirigir a login
        router.push('/login');
      }
    }
  }, [user, isLoading, token, router]); // Dependencias del efecto

  if (isLoading) {
    // Mostrar un estado de carga mientras se verifica la autenticación
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <h1 className="text-3xl font-bold">Cargando Dashboard...</h1>
        {/* Podrías añadir un spinner o un loader más elaborado aquí */}
        <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Si después de cargar, todavía no hay usuario (aunque el useEffect ya debería haber redirigido),
  // podríamos mostrar un mensaje o simplemente nada, ya que la redirección es el objetivo.
  // Este return es más una salvaguarda o para el caso en que la redirección aún no haya ocurrido.
  if (!user) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
            <p>Redirigiendo a inicio de sesión...</p>
        </div>
    );
  }

  // Si el usuario está autenticado y la carga ha terminado, mostrar el contenido del Dashboard
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white pt-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Dashboard de Ery</h1>
        <p className="text-xl text-gray-300">
          ¡Bienvenido de nuevo, <span className="font-semibold">{user.nombre || user.email}</span>!
        </p>
      </div>

      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Tu Progreso Personal</h2>
        
        {/* Aquí es donde empezarías a añadir las funcionalidades de "Ery" */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-indigo-400 mb-2">Mis Hábitos</h3>
            <p className="text-gray-300">
              {/* Contenido relacionado con hábitos aquí */}
              Próximamente: seguimiento de tus hábitos diarios.
            </p>
          </div>
          <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-green-400 mb-2">Superación de Adicciones</h3>
            <p className="text-gray-300">
              {/* Contenido relacionado con adicciones aquí */}
              Próximamente: herramientas para superar adicciones.
            </p>
          </div>
          <div className="bg-gray-700 p-4 rounded-md shadow md:col-span-2">
            <h3 className="text-lg font-medium text-yellow-400 mb-2">Niveles y Logros</h3>
            <p className="text-gray-300">
              {/* Contenido relacionado con gamificación aquí */}
              Próximamente: sube de nivel y desbloquea logros.
            </p>
          </div>
        </div>
        {/* Ejemplo de cómo podrías mostrar el ID del usuario o el token si fuera necesario para depuración */}
        {/* <div className="mt-8 text-xs text-gray-500">
          <p>User ID: {user.id}</p>
          <p>Token: {token ? token.substring(0, 30) + "..." : "No token"}</p>
        </div> */}
      </div>
    </main>
  );
}
