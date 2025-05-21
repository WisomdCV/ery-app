// src/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout'; // Importar el MainLayout

export default function DashboardPage() {
  const { user, isLoading, token, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        router.push('/login');
      }
      // La verificación de rol se hará en el renderizado condicional
      // para mostrar un mensaje de acceso denegado dentro del layout.
    }
  }, [user, isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <h1 className="text-3xl font-bold">Cargando...</h1>
        <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Si no está autenticado, el useEffect ya debería haber iniciado la redirección.
  // Mostramos un mensaje mientras ocurre la redirección.
  if (!user || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <p>Redirigiendo a inicio de sesión...</p>
      </div>
    );
  }

  // Si está autenticado PERO no tiene el rol de administrador
  if (!hasRole('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado"> {/* Usar MainLayout incluso para la página de error */}
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para ver esta página.
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

  // Si el usuario está autenticado Y es administrador, mostrar el contenido del Dashboard dentro del MainLayout
  return (
    <MainLayout pageTitle="Dashboard de Administración">
      {/* El contenido específico del dashboard va aquí como children del MainLayout */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Control Principal</h1>
        <p className="text-lg text-gray-400">
          ¡Bienvenido, Administrador <span className="font-semibold">{user.nombre || user.email}</span>!
        </p>
      </div>

      <div className="w-full bg-gray-800 p-6 rounded-lg shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-indigo-400 mb-2">Gestión de Usuarios</h3>
            <p className="text-gray-300">
              Próximamente: Ver, editar y gestionar cuentas de usuario.
            </p>
            {/* Puedes añadir un Link aquí si ya tienes la página de gestión de usuarios */}
            {/* <Link href="/admin/users" className="text-indigo-400 hover:underline mt-2 inline-block">Ir a Gestión de Usuarios</Link> */}
          </div>
          <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-green-400 mb-2">Estadísticas Globales</h3>
            <p className="text-gray-300">
              Próximamente: Visualizar estadísticas de uso de la aplicación.
            </p>
          </div>
          <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-yellow-400 mb-2">Configuración del Sistema</h3>
            <p className="text-gray-300">
              Próximamente: Ajustes generales de la plataforma Ery.
            </p>
          </div>
           <div className="bg-gray-700 p-4 rounded-md shadow">
            <h3 className="text-lg font-medium text-red-400 mb-2">Moderación (si aplica)</h3>
            <p className="text-gray-300">
              Próximamente: Herramientas de moderación de contenido.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
