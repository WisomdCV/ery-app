// src/app/control/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

interface UserFromApi {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  activo: boolean | number;
  fecha_creacion: string;
  roles: string; // La API devuelve los roles como un string concatenado
}

export default function ControlUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      // Llamamos al mismo endpoint inteligente. El backend se encargará de filtrar la lista.
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: Fallo al obtener usuarios`);
      }

      const data: { users: UserFromApi[] } = await response.json();
      setUsers(data.users.map(u => ({ ...u, activo: Boolean(u.activo) })) || []);
    } catch (err) {
      console.error("Error fetching users for moderator:", err);
      setFetchError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    // Esta página es accesible para moderadores y administradores
    const canAccess = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');
    if (canAccess) {
      fetchUsers();
    } else {
      setPageLoading(false); // Dejar de cargar para mostrar "Acceso Denegado"
    }
  }, [status, session, router, fetchUsers]);

  const handleToggleActive = async (userId: number, currentIsActive: boolean) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      // Esta API ya tiene la lógica para que un moderador no edite a otro admin/mod
      const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !currentIsActive }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.message); }
      
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, activo: !currentIsActive } : u));
      alert(`Usuario ${userId} ha sido ${!currentIsActive ? 'activado' : 'desactivado'}.`);
    } catch (err) {
      alert(`Error al actualizar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const canAccessPage = session?.user?.roles?.includes('administrador') || session?.user?.roles?.includes('moderador_contenido');

  if (status === 'loading' || pageLoading) {
    return <MainLayout pageTitle="Control de Usuarios"><div className="text-center">Cargando...</div></MainLayout>;
  }
  
  if (!canAccessPage) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p className="text-xl text-gray-300">No tienes los permisos necesarios para acceder a esta sección.</p>
          <button onClick={() => router.push('/')} className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">Volver a Inicio</button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Control de Usuarios">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white">Panel de Control de Usuarios</h2>
        {fetchError && <div className="bg-red-700 text-white p-3 rounded mb-4"><strong>Error:</strong> {fetchError}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-md">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Activo</th>
                <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {users.length > 0 ? (
                users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-600 transition-colors duration-150">
                    <td className="px-3 py-4 text-xs sm:text-sm text-gray-200">{userItem.id}</td>
                    <td className="px-3 py-4 text-xs sm:text-sm text-gray-200">{userItem.nombre} {userItem.apellido}</td>
                    <td className="px-3 py-4 text-xs sm:text-sm text-gray-200">{userItem.email}</td>
                    <td className="px-3 py-4 text-xs sm:text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.activo ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                        {userItem.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs sm:text-sm font-medium">
                      <button 
                        onClick={() => handleToggleActive(userItem.id, Boolean(userItem.activo))}
                        disabled={actionLoading[userItem.id]}
                        className={`px-3 py-1 text-xs rounded-md transition-colors duration-150 ease-in-out ${Boolean(userItem.activo) ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white disabled:opacity-50 disabled:cursor-not-allowed mr-2`}
                      >
                        {actionLoading[userItem.id] ? 'Carg...' : (Boolean(userItem.activo) ? 'Desactivar' : 'Activar')}
                      </button>
                      <Link href={`/control/users/${userItem.id}/edit`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Editar Datos
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">
                    {pageLoading && !fetchError ? 'Cargando usuarios...' : 'No hay usuarios para controlar.'}
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
