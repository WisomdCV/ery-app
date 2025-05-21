// src/app/page.tsx
import AuthStatus from "@/components/AuthStatus"; // Importar el componente AuthStatus

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Bienvenido a Ery</h1>
        <p className="text-xl text-gray-300">
          Tu plataforma para gestionar... (describe brevemente tu app aquí)
        </p>
      </div>

      {/* Aquí integramos el componente AuthStatus */}
      <div className="w-full max-w-md">
        <AuthStatus />
      </div>

      {/* Puedes añadir más contenido a tu página principal aquí */}
      <div className="mt-16 text-center">
        <p className="text-gray-400">Explora nuestras funcionalidades:</p>
        {/* Ejemplo de enlaces o secciones (a desarrollar) */}
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {/* <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300">Dashboard</Link> */}
          {/* <Link href="/profile" className="text-indigo-400 hover:text-indigo-300">Mi Perfil</Link> */}
          {/* <Link href="/settings" className="text-indigo-400 hover:text-indigo-300">Configuración</Link> */}
        </div>
      </div>
    </main>
  );
}
