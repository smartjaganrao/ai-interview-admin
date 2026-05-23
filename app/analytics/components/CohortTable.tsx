'use client';

interface CohortData {
  month: string;
  signups: number;
  active: number;
  retention: number;
}

interface CohortTableProps {
  data: CohortData[];
  isLoading: boolean;
}

export default function CohortTable({ data, isLoading }: CohortTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-700 bg-gray-800">
        <p className="text-gray-400">Loading cohorts...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Cohort Retention Analysis
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left font-medium text-gray-300">
                Signup Month
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-300">
                Signups
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-300">
                Still Active
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-300">
                Retention Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No cohort data available
                </td>
              </tr>
            ) : (
              data.map((cohort, idx) => (
                <tr key={idx} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-white">{cohort.month}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {cohort.signups}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {cohort.active}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        cohort.retention >= 50
                          ? 'bg-green-900 text-green-200'
                          : cohort.retention >= 25
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {cohort.retention}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
