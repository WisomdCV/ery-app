// src/app/admin/users/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout'; // Importar el MainLayout

export default function AdminUsersPage() {
  const { user, isLoading, token, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        // No autenticado, redirigir a login
        router.push('/login');
      }
      // La verificación de rol se hará en el renderizado condicional
    }
  }, [user, isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <h1 className="text-3xl font-bold">Cargando Gestión de Usuarios...</h1>
        <svg className="animate-spin h-8 w-8 text-white mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <p>Redirigiendo a inicio de sesión...</p>
      </div>
    );
  }

  if (!hasRole('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denigado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">
            No tienes los permisos necesarios para acceder a la gestión de usuarios.
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

  // Si el usuario es administrador, mostrar el contenido de la página de gestión de usuarios
  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-6 text-white">Administrar Usuarios del Sistema</h2>
        
        {/* Contenido de la página de gestión de usuarios */}
        <div className="text-gray-300">
          <p className="mb-4">
            Aquí podrás ver la lista de usuarios, editar sus roles, activar/desactivar cuentas, y más.
          </p>
          {/* Placeholder para una tabla o lista de usuarios */}
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="text-center font-medium">Tabla de Usuarios (Próximamente)</p>
            {/* Ejemplo de estructura de tabla (a implementar) */}
            {/* <table className="w-full mt-4 text-left">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-2">ID</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Roles</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2">1</td>
                  <td className="p-2">Wilson (Ejemplo)</td>
                  <td className="p-2">wilsondcv711@gmail.com</td>
                  <td className="p-2">administrador</td>
                  <td className="p-2">Editar | Eliminar</td>
                </tr>
              </tbody>
            </table> */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
