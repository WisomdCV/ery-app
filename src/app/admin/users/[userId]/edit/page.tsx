// src/app/admin/users/[userId]/edit/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react'; // 1. Importar useSession
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- Interfaces (sin cambios) ---
interface UserToEdit {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  roles: string[];
}

interface AvailableRole {
  id: number;
  nombre_rol: string;
  descripcion: string | null;
}

export default function EditUserPage() {
  // 2. Usar useSession para obtener la sesión y el estado de carga
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [userToEdit, setUserToEdit] = useState<UserToEdit | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());

  const [pageLoading, setPageLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. useEffect actualizado para usar el estado de NextAuth
  useEffect(() => {
    if (status === 'loading') {
      return; // No hacer nada mientras la sesión carga
    }
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    // 4. Verificar el rol 'administrador' desde la sesión de NextAuth
    if (status === 'authenticated' && !session?.user?.roles?.includes('administrador')) {
      setPageLoading(false); // Dejar de cargar para mostrar "Acceso Denegado"
      return;
    }

    const fetchData = async () => {
      if (!userId || isNaN(parseInt(userId))) {
        setFormError("ID de usuario inválido en la URL.");
        setPageLoading(false);
        return;
      }
      setPageLoading(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        // 5. Las llamadas a la API ya no necesitan enviar el token manualmente
        const [userResponse, rolesResponse] = await Promise.all([
          fetch(`/api/admin/users/${userId}`),
          fetch('/api/roles')
        ]);

        if (!userResponse.ok) {
          const errData = await userResponse.json();
          throw new Error(errData.message || `Error al obtener datos del usuario`);
        }
        if (!rolesResponse.ok) {
          const errData = await rolesResponse.json();
          throw new Error(errData.message || `Error al obtener roles`);
        }

        const userData: { user: UserToEdit } = await userResponse.json();
        const rolesData: { roles: AvailableRole[] } = await rolesResponse.json();
        
        setUserToEdit(userData.user);
        setAvailableRoles(rolesData.roles || []);

        // Preseleccionar roles actuales
        if (userData.user && rolesData.roles) {
          const currentUserRoleIds = new Set<number>();
          userData.user.roles.forEach(userRoleName => {
            const roleObj = rolesData.roles.find(r => r.nombre_rol === userRoleName);
            if (roleObj) {
              currentUserRoleIds.add(roleObj.id);
            }
          });
          setSelectedRoleIds(currentUserRoleIds);
        }

      } catch (err) {
        console.error("Error fetching data for edit page:", err);
        setFormError(err instanceof Error ? err.message : 'Error desconocido al cargar datos.');
      } finally {
        setPageLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [userId, status, session, router]);

  const handleRoleChange = (roleId: number, isChecked: boolean) => {
    setSelectedRoleIds(prev => {
      const newSelected = new Set(prev);
      if (isChecked) newSelected.add(roleId);
      else newSelected.delete(roleId);
      return newSelected;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userToEdit) {
      setFormError("No se puede guardar, información de usuario faltante.");
      return;
    }
     if (session?.user?.id === userToEdit.id) {
        const adminRole = availableRoles.find(r => r.nombre_rol === 'administrador');
        if (adminRole && !selectedRoleIds.has(adminRole.id)) {
            alert("Un administrador no puede quitarse a sí mismo el rol de 'administrador'.");
            return;
        }
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch(`/api/admin/users/${userToEdit.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: Array.from(selectedRoleIds) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al actualizar roles`);
      }

      const successData = await response.json();
      setFormSuccess(successData.message || "Roles actualizados correctamente.");
      setUserToEdit(prev => prev ? {...prev, roles: availableRoles.filter(r => selectedRoleIds.has(r.id)).map(r => r.nombre_rol)} : null);

    } catch (err) {
      console.error("Error submitting roles:", err);
      setFormError(err instanceof Error ? err.message : 'Error desconocido al guardar roles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Lógica de renderizado condicional actualizada
  if (status === 'loading' || pageLoading) {
    return (
      <MainLayout pageTitle="Editar Usuario">
        <div className="flex flex-col items-center justify-center text-center h-full">Cargando...</div>
      </MainLayout>
    );
  }

  if (status === 'unauthenticated') {
    return <MainLayout pageTitle="Redirigiendo"><p>Redirigiendo a inicio de sesión...</p></MainLayout>; 
  }

  if (!session?.user?.roles?.includes('administrador')) {
    return (
      <MainLayout pageTitle="Acceso Denegado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
          <p>No tienes permisos para editar usuarios.</p>
          <Link href="/" className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">Volver a Inicio</Link>
        </div>
      </MainLayout>
    );
  }
  
  if (!userToEdit) {
    return (
      <MainLayout pageTitle="Error">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Error al Cargar Usuario</h1>
          <p className="text-xl text-gray-300">{formError || "No se pudo cargar la información del usuario."}</p>
          <Link href="/admin/users" className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow">Volver a la lista</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle={`Editar Roles de: ${userToEdit.nombre}`}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-2 text-white">
          Editando Roles para: <span className="text-indigo-400">{userToEdit.email}</span>
        </h2>
        <p className="text-sm text-gray-400 mb-6">ID de Usuario: {userToEdit.id}</p>

        {formError && <div className="mb-4 p-3 bg-red-700 text-white rounded">{formError}</div>}
        {formSuccess && <div className="mb-4 p-3 bg-green-700 text-white rounded">{formSuccess}</div>}

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend className="text-lg font-medium text-gray-200 mb-3">Roles Asignados:</legend>
            <div className="space-y-2">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center p-3 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-indigo-500 bg-gray-600 border-gray-500 rounded focus:ring-indigo-400 focus:ring-offset-gray-800"
                    checked={selectedRoleIds.has(role.id)}
                    onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                    disabled={session?.user?.id === userToEdit.id && role.nombre_rol === 'administrador'}
                  />
                  <span className="ml-3 text-sm text-gray-300">
                    {role.nombre_rol}
                    {role.descripcion && <span className="block text-xs text-gray-500">{role.descripcion}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios de Roles'}
            </button>
          </div>
        </form>
        <Link href="/admin/users" className="block text-center mt-6 text-indigo-400 hover:underline">
            Volver a la lista de usuarios
        </Link>
      </div>
    </MainLayout>
  );
}
