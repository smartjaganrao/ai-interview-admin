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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-6 h-[73px] border-b border-white/10 shrink-0 group">
        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-smooth">
          AI
        </div>
        <div>
          <div className="font-bold text-white leading-tight">Admin Panel</div>
          <div className="text-xs text-slate-400 leading-tight">Control Center</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-smooth ${
                active
                  ? 'gradient-primary text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg w-5 text-center">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">Super Admin</div>
            <div className="text-xs text-slate-400 truncate">admin@company.com</div>
          </div>
        </div>
        <button onClick={() => router.push('/login')} className="btn btn-ghost w-full justify-start">
          <span>↪</span> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-mesh bg-grid">
      {/* Desktop sidebar — flex sibling, cannot overlap content */}
      <aside className="hidden md:block w-64 shrink-0 sidebar sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 w-64 h-screen sidebar z-50 md:hidden">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="topbar sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 h-[73px]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-lg text-white hover:bg-white/10 transition-smooth"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-smooth" aria-label="Notifications">
                <span className="text-lg">🔔</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
              <div className="hidden sm:flex badge badge-green">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                System Healthy
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}
