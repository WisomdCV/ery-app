// src/app/profile/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const user = session?.user;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <MainLayout pageTitle="Mi Perfil">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <h1 className="text-3xl font-bold">Cargando Perfil...</h1>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    // El useEffect ya debería estar manejando la redirección
    return (
      <MainLayout pageTitle="Acceso no Autorizado">
        <div className="flex flex-col items-center justify-center text-center h-full">
          <p>Redirigiendo a inicio de sesión...</p>
        </div>
      </MainLayout>
    );
  }

  // Si el usuario está autenticado, mostrar la página de perfil
  return (
    <MainLayout pageTitle="Mi Perfil">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg mx-auto">
        <div className="flex flex-col items-center">
          <img
            src={user.image || `https://ui-avatars.com/api/?name=${user.name || user.email}&background=random`}
            alt="Avatar de usuario"
            className="w-24 h-24 rounded-full mb-4 border-2 border-indigo-400"
          />
          <h2 className="text-2xl font-semibold mb-2 text-white">{user.name}</h2>
          <p className="text-md text-gray-400 mb-4">{user.email}</p>
          <div className="text-sm">
            <span className="font-semibold text-gray-300">ID de Usuario:</span>
            <span className="ml-2 text-gray-400">{user.id}</span>
          </div>
          <div className="text-sm mt-1">
            <span className="font-semibold text-gray-300">Roles:</span>
            <span className="ml-2 text-gray-400">{user.roles?.join(', ')}</span>
          </div>
        </div>
        
        <hr className="border-gray-700 my-6" />

        <div className="text-gray-300">
          <h3 className="text-lg font-medium mb-3">Editar Perfil (Próximamente)</h3>
          <p>Aquí irá un formulario para que los usuarios puedan editar su nombre, contraseña, y otra información personal.</p>
        </div>
      </div>
    </MainLayout>
  );
}
