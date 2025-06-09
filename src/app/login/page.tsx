// src/app/login/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Para nuestro login con email/pass
import { signIn } from 'next-auth/react'; // Para el login con proveedores de NextAuth

// --- Interfaces y componente FormField (se mantienen igual) ---
interface LoginFormData {
  email: string;
  password: string;
}
interface LoginFormErrors {
  email?: string;
  password?: string;
  api?: string;
}
interface FormFieldProps {
  label: string;
  name: keyof LoginFormData;
  type?: string;
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}
const FormField: React.FC<FormFieldProps> = ({ label, name, type = 'text', value, error, onChange }) => (
  <div className="mb-6">
    <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out`}
      aria-describedby={error ? `${name}-error` : undefined}
    />
    {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
);


export default function LoginPage() {
  // Lógica para nuestro sistema de login con email/pass
  const { login: customLogin } = useAuth(); // Renombrado a 'customLogin' para claridad
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);
  
  // handleSubmit para el formulario de email y contraseña
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setApiMessage(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        customLogin(data.user, data.token); // Usar nuestro AuthContext
        router.push('/');
      } else {
        setApiMessage({ type: 'error', text: data.message || 'Error al iniciar sesión.' });
      }
    } catch (error) {
      setApiMessage({ type: 'error', text: 'No se pudo conectar al servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- NUEVA LÓGICA PARA GOOGLE SIGN-IN ---
  const handleGoogleSignIn = () => {
    // Redirige al usuario a la página de login de Google.
    // Después del éxito, NextAuth lo redirigirá de vuelta a la página principal.
    signIn('google', { callbackUrl: '/' }); 
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Iniciar Sesión en Ery
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
            Regístrate aquí
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-6 shadow-xl sm:rounded-lg sm:px-10">
          
          {/* Botón de Google */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l0.007-0.007l6.19,5.238C39.902,36.068,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Iniciar Sesión con Google
            </button>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">O iniciar sesión con email</span>
            </div>
          </div>
          
          {apiMessage && (
            <div className={`p-3 rounded-md ${apiMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white text-sm mb-4`}>
              {apiMessage.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Correo Electrónico" name="email" type="email" value={formData.email} error={errors.email} onChange={handleChange} />
            <FormField label="Contraseña" name="password" type="password" value={formData.password} error={errors.password} onChange={handleChange} />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
