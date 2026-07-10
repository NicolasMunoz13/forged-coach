import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://forged.example.com"),
  title: "FORGED · Fuerza y Nutrición sin excusas",
  description:
    "Programas de fuerza y protocolos de nutrición sin humo. Y un Coach IA que te responde 24/7. Nadie viene a salvarte. Stay hard.",
  keywords: ["fuerza", "hipertrofia", "nutrición", "entrenamiento", "coaching", "Goggins"],
  openGraph: {
    title: "FORGED · Fuerza y Nutrición sin excusas",
    description:
      "Programas, nutrición y un Coach IA. Nadie viene a salvarte. Stay hard.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
