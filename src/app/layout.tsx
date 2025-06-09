// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Importar AMBOS proveedores
import NextAuthSessionProvider from "@/context/NextAuthSessionProvider";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ery App",
  description: "EryTesting creada by WisomCORP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* 2. Anidar los proveedores. El de NextAuth puede ir por fuera. */}
        <NextAuthSessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
