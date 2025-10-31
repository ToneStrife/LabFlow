import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/Layout";
import { QueryProvider } from "@/components/QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Management App",
  description: "A comprehensive tool for managing projects, requests, and expenditures.",
  // AÑADIR CONFIGURACIÓN DE VIEWPORT PARA MÓVILES
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // Esto previene el zoom no deseado y asegura que la escala inicial sea correcta.
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Layout>
              {children}
            </Layout>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}