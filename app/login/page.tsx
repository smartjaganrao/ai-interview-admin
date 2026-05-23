import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Redirect to admin login
  redirect('/admin/login');
}
