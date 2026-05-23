export interface Session {
  uid: string;
  email: string;
  role: 'super-admin' | 'admin' | 'moderator' | 'analyst';
  isAdmin: boolean;
}
