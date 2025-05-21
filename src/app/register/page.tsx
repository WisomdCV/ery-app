// src/app/register/page.tsx
'use client'; // Directiva para indicar que es un Componente de Cliente en Next.js App Router

import React, { useState, ChangeEvent, FormEvent, useCallback } from 'react'; // Importar useCallback
import Link from 'next/link';

// Interfaz para los datos del formulario
interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmPassword: string;
  fecha_nacimiento: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  pais: string;
}

// Interfaz para los errores de validación
interface FormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  api?: string;
}

// Interfaz para las props de FormField
interface FormFieldProps {
  label: string;
  name: keyof RegisterFormData | 'confirmPassword';
  type?: string;
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // onChange es una prop
  children?: React.ReactNode;
}

// Componente FormField definido FUERA de RegisterPage
const FormField: React.FC<FormFieldProps> = ({ label, name, type = 'text', value, error, onChange, children }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">
      {label}
    </label>
    {children || (
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange} // Usar la prop onChange
        className={`w-full px-3 py-2 bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out`}
        aria-describedby={error ? `${name}-error` : undefined}
      />
    )}
    {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
);


export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    fecha_nacimiento: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    pais: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Usar useCallback para memoizar handleChange
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar el error específico cuando el usuario empieza a corregirlo
    // Es importante que 'name' aquí sea del tipo correcto para acceder a 'errors'
    const fieldName = name as keyof FormErrors;
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
    // Limpiar el error de API al cambiar cualquier campo
    if (errors.api) {
        setErrors((prev) => ({ ...prev, api: undefined}));
    }
    setApiMessage(null); // Limpiar mensaje de API también
  }, [errors]); // Dependencia: errors. Si la lógica de limpieza depende de otro estado, añadirlo.
                // Las funciones setter de useState (setFormData, setErrors, setApiMessage) son estables
                // y no necesitan ser listadas como dependencias.

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido.';
      isValid = false;
    }

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
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmar la contraseña es requerido.';
      isValid = false;
    } else if (formData.password && formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
      isValid = false;
    }

    if (formData.fecha_nacimiento) {
        const birthDate = new Date(formData.fecha_nacimiento);
        const today = new Date();
        if (birthDate > today) {
            newErrors.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
            isValid = false;
        }
    }

    if (formData.telefono && !/^\+?[0-9\s-()]*$/.test(formData.telefono)) {
        newErrors.telefono = 'El formato del teléfono no es válido.';
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            nombre: formData.nombre,
            apellido: formData.apellido || null,
            email: formData.email,
            password: formData.password,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            telefono: formData.telefono || null,
            direccion: formData.direccion || null,
            ciudad: formData.ciudad || null,
            pais: formData.pais || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setApiMessage({ type: 'success', text: data.message || '¡Registro exitoso! Ahora puedes iniciar sesión.' });
        setFormData({
            nombre: '', apellido: '', email: '', password: '', confirmPassword: '',
            fecha_nacimiento: '', telefono: '', direccion: '', ciudad: '', pais: '',
        });
      } else {
        setApiMessage({ type: 'error', text: data.message || 'Ocurrió un error durante el registro.' });
        if (data.message) {
            setErrors(prev => ({...prev, api: data.message}));
        }
      }
    } catch (error) {
      console.error('Error en el handleSubmit de registro:', error);
      setApiMessage({ type: 'error', text: 'No se pudo conectar al servidor. Intenta de nuevo más tarde.' });
      setErrors(prev => ({...prev, api: 'Error de conexión.'}));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Crear una nueva cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">
            Inicia sesión aquí
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-2xl">
        <div className="bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {apiMessage && (
              <div className={`p-3 rounded-md ${apiMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}>
                {apiMessage.text}
              </div>
            )}
             {errors.api && !apiMessage && (
                <div className="p-3 rounded-md bg-red-600 text-white text-sm">
                    {errors.api}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Nombre *" name="nombre" value={formData.nombre} error={errors.nombre} onChange={handleChange} />
                <FormField label="Apellido" name="apellido" value={formData.apellido} error={errors.apellido} onChange={handleChange} />
            </div>

            <FormField label="Correo Electrónico *" name="email" type="email" value={formData.email} error={errors.email} onChange={handleChange} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Contraseña *" name="password" type="password" value={formData.password} error={errors.password} onChange={handleChange} />
                <FormField label="Confirmar Contraseña *" name="confirmPassword" type="password" value={formData.confirmPassword} error={errors.confirmPassword} onChange={handleChange} />
            </div>

            <hr className="border-gray-600 my-6" />
            <p className="text-sm text-gray-400">Información Adicional (Opcional)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} error={errors.fecha_nacimiento} onChange={handleChange} />
                <FormField label="Teléfono" name="telefono" type="tel" value={formData.telefono} error={errors.telefono} onChange={handleChange} />
            </div>

            <FormField label="Dirección" name="direccion" value={formData.direccion} error={errors.direccion} onChange={handleChange} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormField label="Ciudad" name="ciudad" value={formData.ciudad} error={errors.ciudad} onChange={handleChange} />
                <FormField label="País" name="pais" value={formData.pais} error={errors.pais} onChange={handleChange} />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
