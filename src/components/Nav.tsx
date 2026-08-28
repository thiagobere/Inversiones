'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Resumen' },
  { href: '/portfolio', label: 'Portafolio' },
  { href: '/watchlist', label: 'Seguimiento' },
  { href: '/news', label: 'Noticias' },
  { href: '/alerts', label: 'Alertas' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-b border-hairline bg-surface lg:w-56 lg:border-b-0 lg:border-r">
      <div className="px-5 py-6 lg:px-6">
        <Link href="/" className="serif text-xl tracking-tight text-text">
          Inversiones
        </Link>
        <p className="label mt-1.5">Panel personal</p>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0 lg:px-3 lg:pb-6">
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap px-3 py-2.5 text-sm transition-colors lg:border-l-2 ${
                  active
                    ? 'border-accent bg-surface-2 text-text'
                    : 'border-transparent text-text-dim hover:bg-surface-2 hover:text-text'
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
