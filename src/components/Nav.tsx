'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  {
    href: '/', label: 'Resumen',
    icon: <path d="M3 17l5-6 4 4 5-8 4 5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/portfolio', label: 'Cartera',
    icon: <><rect x="3" y="7" width="18" height="13" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /></>,
  },
  {
    href: '/watchlist', label: 'Radar',
    icon: <><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" strokeLinecap="round" /></>,
  },
  {
    href: '/news', label: 'Noticias',
    icon: <><rect x="3" y="5" width="18" height="14" /><path d="M7 9h7M7 13h7M7 16h4" strokeLinecap="round" /></>,
  },
  {
    href: '/alerts', label: 'Alertas',
    icon: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" strokeLinejoin="round" /><path d="M10.5 20a2 2 0 0 0 3 0" strokeLinecap="round" /></>,
  },
  {
    href: '/asistente', label: 'Asistente',
    icon: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" /></>,
  },
];

/**
 * Bottom tab bar on phones (thumb reach, safe-area aware), left rail from
 * `lg` up. Both render from the same list so the two never drift apart.
 */
export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <header className="border-b border-hairline bg-surface px-5 py-4 lg:hidden">
        <Link href="/" className="serif text-lg tracking-tight text-text">Inversiones</Link>
      </header>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur
                   pb-[env(safe-area-inset-bottom)]
                   lg:static lg:w-56 lg:shrink-0 lg:border-r lg:border-t-0 lg:bg-surface lg:pb-0 lg:backdrop-blur-none"
      >
        <div className="hidden px-6 py-6 lg:block">
          <Link href="/" className="serif text-xl tracking-tight text-text">Inversiones</Link>
          <p className="label mt-1.5">Panel personal</p>
        </div>

        <ul className="flex lg:flex-col lg:gap-0 lg:px-3 lg:pb-6">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href} className="flex-1 lg:flex-none">
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[58px] flex-col items-center justify-center gap-1 border-t-2 text-[10px]
                              uppercase tracking-[0.07em] transition-colors
                              lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:border-t-0 lg:border-l-2
                              lg:px-3 lg:py-2.5 lg:text-sm lg:normal-case lg:tracking-normal ${
                    active
                      ? 'border-accent text-accent lg:bg-surface-2 lg:text-text'
                      : 'border-transparent text-text-faint hover:text-text lg:text-text-dim lg:hover:bg-surface-2'
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[19px] w-[19px] lg:h-4 lg:w-4">
                    {link.icon}
                  </svg>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
