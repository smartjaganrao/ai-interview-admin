'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Users', href: '/users', icon: '👥' },
  { label: 'Analytics', href: '/analytics', icon: '📈' },
  { label: 'Audit Logs', href: '/audit', icon: '📋' },
  { label: 'Support', href: '/support', icon: '💬' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-gradient-mesh bg-grid min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 w-64 h-screen glass-heavy z-40 transition-smooth ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 h-full flex flex-col">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-smooth">
              AI
            </div>
            <div>
              <div className="font-bold text-white">Admin Panel</div>
              <div className="text-xs text-slate-400 -mt-0.5">Control Center</div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="space-y-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-smooth ${
                    active
                      ? 'gradient-primary text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">Super Admin</div>
                <div className="text-xs text-slate-400 truncate">admin@company.com</div>
              </div>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-ghost w-full justify-start"
            >
              <span>↪</span> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="md:ml-64 min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 glass-heavy border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-white hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-smooth">
                <span className="text-lg">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
              <div className="hidden sm:flex badge badge-green">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                System Healthy
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}
