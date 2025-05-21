// src/app/login/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Importar el hook useAuth

// Interfaz para los datos del formulario de login
interface LoginFormData {
  email: string;
  password: string;
}

// Interfaz para los errores de validación del formulario de login
interface LoginFormErrors {
  email?: string;
  password?: string;
  api?: string;
}

// Componente reutilizable para campos de formulario
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
  const router = useRouter();
  const { login } = useAuth(); // Usar el hook useAuth para obtener la función login
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const fieldName = name as keyof LoginFormErrors;
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
    if (errors.api) {
      setErrors((prev) => ({ ...prev, api: undefined }));
    }
    setApiMessage(null);
  }, [errors]);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del correo electrónico no es válido.';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        // Usar la función login del AuthContext
        login(data.user, data.token);

        setApiMessage({ type: 'success', text: data.message || '¡Inicio de sesión exitoso!' });
        
        // La redirección ahora puede ser manejada por el AuthContext si se desea,
        // o mantenerse aquí. Por ahora, la dejamos aquí.
        setTimeout(() => {
          router.push('/'); // Cambia '/' por la ruta a la que quieras redirigir
        }, 1000);

      } else {
        const errorMessage = data.message || 'Ocurrió un error durante el inicio de sesión.';
        setApiMessage({ type: 'error', text: errorMessage });
        setErrors(prev => ({...prev, api: errorMessage}));
      }
    } catch (error) {
      console.error('Error en el handleSubmit de login:', error);
      const errorMessage = 'No se pudo conectar al servidor. Intenta de nuevo más tarde.';
      setApiMessage({ type: 'error', text: errorMessage });
      setErrors(prev => ({...prev, api: errorMessage}));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Iniciar Sesión
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
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {apiMessage && (
              <div className={`p-3 rounded-md ${apiMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-sm mb-4`}>
                {apiMessage.text}
              </div>
            )}
            {errors.api && !apiMessage && (
                <div className="p-3 rounded-md bg-red-600 text-white text-sm mb-4">
                    {errors.api}
                </div>
            )}

            <FormField
              label="Correo Electrónico"
              name="email"
              type="email"
              value={formData.email}
              error={errors.email}
              onChange={handleChange}
            />
            <FormField
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              error={errors.password}
              onChange={handleChange}
            />

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Ingresar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
