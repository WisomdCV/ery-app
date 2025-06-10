// src/app/my-dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

// --- Interfaces ---
// Interfaz para un hábito con sus estadísticas, tal como lo devuelve la API /api/dashboard
interface HabitWithStats {
  id: number;
  nombre: string;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  racha_actual: number;
}

// --- Iconos para las tarjetas ---
const StreakIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-2 text-orange-400">
        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.052A9.75 9.75 0 0118.635 8.25H17.25a.75.75 0 000 1.5h3a.75.75 0 00.75-.75V6a.75.75 0 00-1.5 0v1.127a11.252 11.252 0 00-9.865-6.872.75.75 0 00-.61 1.031Zm-2.033 18.428a.75.75 0 001.071-1.052A9.75 9.75 0 015.365 15.75H6.75a.75.75 0 000-1.5h-3a.75.75 0 00-.75.75V18a.75.75 0 001.5 0v-1.127a11.252 11.252 0 009.865 6.872.75.75 0 00.61-1.031Z" clipRule="evenodd" />
    </svg>
);
const PositiveHabitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-green-400">
        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.496-12.744a.75.75 0 011.04-.208z" clipRule="evenodd" />
    </svg>
);
const NegativeHabitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-red-400">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
    </svg>
);


export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [habitsData, setHabitsData] = useState<HabitWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('No se pudo cargar la información del dashboard.');
      }
      const data = await response.json();
      setHabitsData(data.habits_con_estadisticas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchDashboardData]);

  if (status === 'loading' || isLoading) {
    return <MainLayout pageTitle="Mi Dashboard"><div className="text-center">Cargando tu progreso...</div></MainLayout>;
  }

  if (status === 'unauthenticated') {
    return <MainLayout pageTitle="Redirigiendo"><div className="text-center">Redirigiendo...</div></MainLayout>;
  }
  
  return (
    <MainLayout pageTitle="Mi Dashboard de Progreso">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">¡Hola, {session?.user?.name}!</h2>
        <p className="text-lg text-gray-400">Aquí tienes un resumen de tu progreso. ¡Sigue así!</p>
      </div>

      {error && <div className="bg-red-700 text-white p-4 rounded-lg mb-6">{error}</div>}

      {habitsData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habitsData.map(habit => (
            <div key={habit.id} className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-between hover:bg-gray-700 transition-colors duration-200">
              <div>
                <div className="flex items-center mb-2">
                  {habit.tipo === 'MAL_HABITO' ? <NegativeHabitIcon /> : <PositiveHabitIcon />}
                  <h3 className="text-xl font-bold text-white">{habit.nombre}</h3>
                </div>
                <p className="text-sm text-gray-400">{habit.tipo === 'MAL_HABITO' ? 'Superando' : 'Construyendo'}</p>
              </div>
              <div className="text-center mt-6">
                <div className="flex items-center justify-center">
                  <StreakIcon />
                  <p className="text-5xl font-bold text-orange-400">{habit.racha_actual}</p>
                </div>
                <p className="text-md text-gray-300 mt-1">
                  {habit.tipo === 'MAL_HABITO' ? 'Días de Racha' : 'Días de Racha'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-2">¡Es hora de empezar!</h3>
          <p>Aún no tienes hábitos para seguir.</p>
          <Link href="/habits" className="mt-4 inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg">
            Crea tu primer hábito
          </Link>
        </div>
      )}
    </MainLayout>
  );
}
