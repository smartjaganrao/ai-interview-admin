import { redirect } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex h-screen flex-col">
      <TopNav email={session.email} isAdmin={true} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isAdmin={true} />
        <main className="flex-1 overflow-auto bg-gray-950">{children}</main>
      </div>
    </div>
  );
}
