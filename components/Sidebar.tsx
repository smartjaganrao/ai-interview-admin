'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const getNavItems = (isAdmin: boolean = false) => {
  const prefix = isAdmin ? '/admin' : '';
  return [
    { name: 'Dashboard', href: `${prefix}/dashboard` },
    { name: 'Users', href: `${prefix}/users` },
    { name: 'Analytics', href: `${prefix}/analytics` },
    { name: 'Audit Logs', href: `${prefix}/audit` },
    { name: 'Support', href: `${prefix}/support` },
    { name: 'Settings', href: `${prefix}/settings` },
  ];
};

export default function Sidebar({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

  return (
    <aside className="w-64 border-r border-gray-700 bg-gray-900">
      <nav className="space-y-1 px-4 py-8">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
