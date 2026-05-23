import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Welcome to the AI Interview Helper admin panel
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Total Users Card */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-white">—</p>
            </div>
            <div className="rounded-lg bg-blue-900 bg-opacity-50 p-3">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Connected from analytics dashboard (Phase 3)
          </p>
        </div>

        {/* MRR Card */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Monthly Revenue</p>
              <p className="mt-2 text-3xl font-bold text-white">—</p>
            </div>
            <div className="rounded-lg bg-green-900 bg-opacity-50 p-3">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Connected from analytics dashboard
          </p>
        </div>

        {/* Active Users Card */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active This Week</p>
              <p className="mt-2 text-3xl font-bold text-white">—</p>
            </div>
            <div className="rounded-lg bg-purple-900 bg-opacity-50 p-3">
              <svg
                className="h-6 w-6 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Connected from analytics dashboard
          </p>
        </div>

        {/* Churn Rate Card */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Churn Rate</p>
              <p className="mt-2 text-3xl font-bold text-white">—</p>
            </div>
            <div className="rounded-lg bg-red-900 bg-opacity-50 p-3">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17H3v-2h10v2zm0-4H3v-2h10v2zm0-4H3V7h10v2z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Connected from analytics dashboard
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/users"
            className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-blue-600 hover:bg-gray-700"
          >
            <h3 className="font-semibold text-white">Manage Users</h3>
            <p className="mt-2 text-sm text-gray-400">
              View, upgrade plans, reset quotas, or ban users
            </p>
          </Link>

          <Link
            href="/analytics"
            className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-green-600 hover:bg-gray-700"
          >
            <h3 className="font-semibold text-white">Analytics</h3>
            <p className="mt-2 text-sm text-gray-400">
              Revenue trends, cohort analysis, and KPIs
            </p>
          </Link>

          <Link
            href="/audit"
            className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-purple-600 hover:bg-gray-700"
          >
            <h3 className="font-semibold text-white">Audit Logs</h3>
            <p className="mt-2 text-sm text-gray-400">
              Track all admin actions and changes
            </p>
          </Link>

          <Link
            href="/support"
            className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-orange-600 hover:bg-gray-700"
          >
            <h3 className="font-semibold text-white">Support Tickets</h3>
            <p className="mt-2 text-sm text-gray-400">
              Manage user support requests and inquiries
            </p>
          </Link>
        </div>
      </div>

      {/* Status Box */}
      <div className="mt-8 rounded-lg border border-yellow-700 bg-yellow-900 bg-opacity-20 p-6">
        <h3 className="font-semibold text-yellow-300">
          ⚙️ Phase 1 Complete: Authentication Setup
        </h3>
        <p className="mt-2 text-sm text-yellow-200">
          The admin panel is now live with login working. Next phases:
        </p>
        <ul className="mt-4 list-inside space-y-1 text-sm text-yellow-200">
          <li>✅ Phase 1: Bootstrap &amp; Authentication (COMPLETE)</li>
          <li>⏳ Phase 2: User Management Dashboard</li>
          <li>⏳ Phase 3: Analytics Dashboard</li>
          <li>⏳ Phase 4: Audit &amp; Moderation</li>
          <li>⏳ Phase 5: Support System &amp; Settings</li>
        </ul>
      </div>
    </div>
  );
}
