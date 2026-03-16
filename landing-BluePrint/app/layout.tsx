import type { Metadata } from "next";
import { Exo_2, Manrope } from "next/font/google";
import "./globals.css";

const exo2 = Exo_2({
  subsets: ["latin", "cyrillic"],
  variable: "--font-exo2",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Склад-Софт — Облачная система управления складом",
  description:
    "Запустите склад за 1 день. Облачная система Склад-Софт для e-commerce, маркетплейсов и 3PL компаний. Управление запасами, сборка заказов, мобильное сканирование, аналитика в реальном времени.",
  keywords:
    "Склад-Софт, система управления складом, складской учёт, управление запасами, 3PL логистика, e-commerce склад, маркетплейс WMS, облачная WMS, Wildberries, Ozon",
  openGraph: {
    title: "Склад-Софт — Облачная система управления складом",
    description:
      "Запустите склад за 1 день. Облачная система Склад-Софт для e-commerce и маркетплейс-селлеров. Бесплатно 14 дней.",
    type: "website",
    locale: "ru_RU",
  },
  icons: {
    icon: "/boxes.svg",
    shortcut: "/boxes.svg",
    apple: "/boxes.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${exo2.variable} ${manrope.variable} scroll-smooth`}>
      <body className="font-body bg-[#060b18] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
