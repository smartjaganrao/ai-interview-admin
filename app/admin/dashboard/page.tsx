import { redirect } from 'next/navigation';
import DashboardPage from '@/app/(authenticated)/dashboard/page';

// Server component that delegates to the existing dashboard
export default async function AdminDashboardPage() {
  try {
    // Directly render the dashboard component
    return <DashboardPage />;
  } catch (error) {
    redirect('/admin/login');
  }
}
