import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RTEC Ops Panel',
  description: 'Painel operacional interno de licencas, dispositivos e backups',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
