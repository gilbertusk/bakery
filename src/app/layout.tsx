import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Toko Kue Khansa',
  description: 'Aplikasi kasir, stok, dan HPP Toko Kue Khansa',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} h-full font-sans antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
