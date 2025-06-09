// src/app/habits/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // 1. Importar useSession
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

export default function HabitsPage() {
  // 2. Usar useSession para obtener la sesión y el estado
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const user = session?.user;

  // Roles que tienen acceso a esta página (usando los nombres correctos de tu BD)
  const allowedRoles = ['usuario_estandar', 'administrador'];

  // 3. Adaptar el useEffect para que funcione con el estado de NextAuth
  useEffect(() => {
    // Si la sesión ha terminado de cargar y no está autenticada, redirigir a login
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 4. Adaptar la lógica de renderizado condicional

  if (isLoading) {
    return (
      <MainLayout pageTitle="Mis Hábitos">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-3xl font-bold">Cargando...</h1>
          <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    // Si después de cargar no hay usuario, useEffect lo redirigirá.
    // Mientras tanto, mostramos un mensaje.
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
          <div className="flex flex-col items-center justify-center text-center h-full">
              <p>Redirigiendo a inicio de sesión...</p>
          </div>
      </MainLayout>
    );
  }

  // Verificar si el usuario tiene alguno de los roles permitidos
  const canAccessPage = allowedRoles.some(role => session?.user?.roles?.includes(role));

  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para acceder a esta sección.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Volver a la Página Principal
          </button>
        </div>
      </MainLayout>
    );
  }

  // Si el usuario tiene el rol permitido, mostrar el contenido de la página "Mis Hábitos"
  return (
    <MainLayout pageTitle="Mis Hábitos y Adicciones">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Gestiona tus Hábitos y Adicciones</h2>
        
        <div className="text-gray-300">
          <p className="mb-4">
            Aquí podrás definir los hábitos que deseas seguir, registrar tu progreso diario,
            y trabajar en la superación de adicciones. ¡Tu camino hacia una mejor versión de ti comienza aquí!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-700 p-4 rounded-md">
              <h3 className="text-xl font-medium text-green-400 mb-3">Hábitos Positivos</h3>
              <p className="mb-2">Define y sigue tus hábitos diarios.</p>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md">
                Añadir Hábito (Próximamente)
              </button>
            </div>
            <div className="bg-gray-700 p-4 rounded-md">
              <h3 className="text-xl font-medium text-orange-400 mb-3">Superar Adicciones</h3>
              <p className="mb-2">Registra tus días sin caer y mide tu progreso.</p>
              <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-md">
                Gestionar Adicciones (Próximamente)
              </button>
            </div>
          </div>

          <div className="mt-8 bg-gray-700 p-4 rounded-md">
            <h3 className="text-xl font-medium text-blue-400 mb-3">Tu Progreso y Rachas</h3>
            <p>Visualiza tus estadísticas y mantén la motivación.</p>
            <div className="mt-4 h-32 bg-gray-600 rounded flex items-center justify-center">
              <p>Gráficos de Progreso (Próximamente)</p>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
