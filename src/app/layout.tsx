import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import Nav from '@/components/Nav';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Inversiones',
  description: 'Dashboard personal de inversiones: portafolio, noticias y señales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Nav />
          <main className="min-w-0 flex-1 px-5 py-8 pb-[calc(58px+env(safe-area-inset-bottom)+2rem)] lg:px-10 lg:py-10 lg:pb-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
