// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean | number; // Puede ser boolean o 0/1 desde la API
  fecha_creacion: string;
}

export default function AdminUsersPage() {
  const { user: adminUser, isLoading: authLoading, token, hasRole } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const fetchUsers = useCallback(async () => {
    if (!token || !hasRole('administrador')) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: Fallo al obtener usuarios`);
      }

      const data: { users: UserFromApi[] } = await response.json();
      setUsers(data.users.map(u => ({ ...u, activo: Boolean(u.activo) })) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setFetchError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setPageLoading(false);
    }
  }, [token, hasRole]);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser || !token) {
        router.push('/login');
      } else if (!hasRole('administrador')) {
        setPageLoading(false);
      } else {
        fetchUsers();
      }
    }
  }, [adminUser, authLoading, token, router, hasRole, fetchUsers]);

  const handleToggleActive = async (userId: number, currentIsActive: boolean) => {
    if (!token) {
      setFetchError("No autenticado para realizar esta acción.");
      return;
    }
    if (adminUser?.id === userId) {
        alert("Un administrador no puede cambiar su propio estado activo a través de esta interfaz.");
        return;
    }

    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setFetchError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ activo: !currentIsActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: Fallo al actualizar estado`);
      }

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, activo: !currentIsActive } : u
        )
      );
      alert(`Usuario ${userId} ha sido ${!currentIsActive ? 'activado' : 'desactivado'}.`);

    } catch (err) {
      console.error(`Error toggling active state for user ${userId}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido al actualizar.';
      setFetchError(errorMessage);
      alert(`Error al actualizar: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (authLoading || (pageLoading && !users.length && !fetchError && hasRole('administrador'))) {
    return (
      <MainLayout pageTitle="Gestión de Usuarios">
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

  if (!authLoading && (!adminUser || !token)) {
    return (
      <MainLayout pageTitle="Redirigiendo">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <p>Redirigiendo a inicio de sesión...</p>
        </div>
      </MainLayout>
    );
  }

  if (!authLoading && adminUser && !hasRole('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
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

  return (
    <MainLayout pageTitle="Gestión de Usuarios">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white">Administrar Usuarios del Sistema</h2>
        
        {fetchError && (
          <div className="bg-red-700 border border-red-900 text-white px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{fetchError}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-md">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Apellido</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Activo</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {users.length > 0 ? (
                users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-600 transition-colors duration-150">
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-200">{userItem.id}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-200">{userItem.nombre}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-200">{userItem.apellido || '-'}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-200">{userItem.email}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.activo ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                        {userItem.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-400">
                      {new Date(userItem.fecha_creacion).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <button 
                        onClick={() => handleToggleActive(userItem.id, Boolean(userItem.activo))}
                        disabled={actionLoading[userItem.id] || adminUser?.id === userItem.id}
                        className={`px-3 py-1 text-xs rounded-md transition-colors duration-150 ease-in-out
                          ${Boolean(userItem.activo) ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
                          text-white disabled:opacity-50 disabled:cursor-not-allowed mr-2`}
                      >
                        {actionLoading[userItem.id] ? 'Carg...' : (Boolean(userItem.activo) ? 'Desactivar' : 'Activar')}
                      </button>
                      <Link
                        href={`/admin/users/${userItem.id}/edit`}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline"
                      >
                        Editar Roles
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-sm text-gray-400">
                    {pageLoading && !fetchError ? 'Cargando usuarios...' : 'No se encontraron usuarios.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
