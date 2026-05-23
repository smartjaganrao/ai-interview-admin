'use client';

import { useState } from 'react';

interface Admin {
  email: string;
  role: 'super-admin' | 'admin' | 'moderator';
  invitedBy: string;
  invitedAt: number;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([
    {
      email: 'admin@example.com',
      role: 'super-admin',
      invitedBy: 'You',
      invitedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    },
  ]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;

    setIsInviting(true);
    try {
      // In a real app, this would call an API endpoint
      // For now, just add to the list
      setAdmins([
        ...admins,
        {
          email: newAdminEmail,
          role: newAdminRole as 'admin' | 'moderator',
          invitedBy: 'You',
          invitedAt: Date.now(),
        },
      ]);
      setNewAdminEmail('');
      setMessage({ type: 'success', text: `Invitation sent to ${newAdminEmail}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setIsInviting(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-red-900 text-red-200';
      case 'admin':
        return 'bg-blue-900 text-blue-200';
      case 'moderator':
        return 'bg-yellow-900 text-yellow-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Management</h1>
        <p className="mt-2 text-gray-400">Manage admin users and roles</p>
      </div>

      {/* Invite Form */}
      <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Invite New Admin</h2>

        {message && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'border border-green-600 bg-green-900 bg-opacity-20 text-green-400'
                : 'border border-red-600 bg-red-900 bg-opacity-20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleInviteAdmin} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Role
              </label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isInviting || !newAdminEmail}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isInviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Admin List */}
      <div className="rounded-lg border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Current Admins</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-750">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Invited By
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Invited On
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {admins.map((admin, idx) => (
                <tr key={idx} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">{admin.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${roleBadgeColor(
                        admin.role
                      )}`}
                    >
                      {admin.role
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{admin.invitedBy}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(admin.invitedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="font-semibold text-red-400">Super Admin</h3>
          <p className="mt-2 text-xs text-gray-400">
            Full access to all features, can manage admins, change settings
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="font-semibold text-blue-400">Admin</h3>
          <p className="mt-2 text-xs text-gray-400">
            Can manage users, view analytics, handle support tickets
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="font-semibold text-yellow-400">Moderator</h3>
          <p className="mt-2 text-xs text-gray-400">
            Can review content, handle moderation, view audit logs
          </p>
        </div>
      </div>
    </div>
  );
}
