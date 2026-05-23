'use client';

import { useState } from 'react';

export default function OrganizationPage() {
  const [companyName, setCompanyName] = useState('AI Interview Helper');
  const [supportEmail, setSupportEmail] = useState('support@example.com');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
        <p className="mt-2 text-gray-400">Manage your company information</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg p-4 text-sm ${
            message.type === 'success'
              ? 'border border-green-600 bg-green-900 bg-opacity-20 text-green-400'
              : 'border border-red-600 bg-red-900 bg-opacity-20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Settings Form */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              The name displayed in communications to users
            </p>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Support Email Address
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Email address for support inquiries and notifications
            </p>
          </div>

          {/* Plan Summary */}
          <div className="rounded-lg border border-gray-600 bg-gray-700 p-4">
            <h3 className="font-medium text-white">Your Subscription</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan</span>
                <span className="text-white">Professional</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Renewal Date</span>
                <span className="text-white">June 23, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Users</span>
                <span className="text-white">Unlimited</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-600 bg-red-900 bg-opacity-10 p-4">
            <h3 className="font-medium text-red-400">Danger Zone</h3>
            <p className="mt-2 text-sm text-gray-400">
              These actions cannot be undone. Proceed with caution.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                className="block w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 md:w-auto"
                disabled
              >
                Delete Organization
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-8 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Additional Settings Sections */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="font-semibold text-white">Security</h3>
          <p className="mt-2 text-sm text-gray-400">
            Manage security settings and two-factor authentication
          </p>
          <button className="mt-4 text-blue-400 hover:text-blue-300">
            View Security →
          </button>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="font-semibold text-white">Billing</h3>
          <p className="mt-2 text-sm text-gray-400">
            Manage payment methods and billing history
          </p>
          <button className="mt-4 text-blue-400 hover:text-blue-300">
            View Billing →
          </button>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="font-semibold text-white">Integrations</h3>
          <p className="mt-2 text-sm text-gray-400">
            Connect third-party tools and services
          </p>
          <button className="mt-4 text-blue-400 hover:text-blue-300">
            View Integrations →
          </button>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="font-semibold text-white">Activity Log</h3>
          <p className="mt-2 text-sm text-gray-400">
            View account activity and login history
          </p>
          <button className="mt-4 text-blue-400 hover:text-blue-300">
            View Activity →
          </button>
        </div>
      </div>
    </div>
  );
}
