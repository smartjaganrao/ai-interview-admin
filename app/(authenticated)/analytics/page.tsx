'use client';

import { useState, useEffect } from 'react';
import KPICards from '../../analytics/components/KPICards';
import RevenueChart from '../../analytics/components/RevenueChart';
import UserDistribution from '../../analytics/components/UserDistribution';
import DAUChart from '../../analytics/components/DAUChart';
import CohortTable from '../../analytics/components/CohortTable';
import APIUsageChart from '../../analytics/components/APIUsageChart';

interface KPIData {
  totalUsers: number;
  activeThisWeek: number;
  mrrByPlan: { free: number; pro: number; power: number };
  totalMRR: number;
  usersByPlan: { free: number; pro: number; power: number };
  churnRate: number;
}

interface RevenueData {
  month: string;
  mrr: number;
}

interface CohortData {
  month: string;
  signups: number;
  active: number;
  retention: number;
}

interface APIUsageData {
  week: string;
  tokens: number;
  voiceMinutes: number;
  screenshots: number;
}

export default function AnalyticsPage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [usageData, setUsageData] = useState<APIUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('90days');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, planFilter]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [kpiRes, revenueRes, cohortRes, usageRes] = await Promise.all([
        fetch('/api/analytics/kpis'),
        fetch('/api/analytics/revenue'),
        fetch('/api/analytics/cohorts'),
        fetch('/api/analytics/api-usage'),
      ]);

      if (!kpiRes.ok) throw new Error('Failed to fetch KPIs');
      const kpiJson: KPIData = await kpiRes.json();
      setKpiData(kpiJson);

      if (!revenueRes.ok) throw new Error('Failed to fetch revenue');
      const revenueJson: { revenueData: RevenueData[] } = await revenueRes.json();
      setRevenueData(revenueJson.revenueData);

      if (!cohortRes.ok) throw new Error('Failed to fetch cohorts');
      const cohortJson: { cohortData: CohortData[] } = await cohortRes.json();
      setCohortData(cohortJson.cohortData);

      if (!usageRes.ok) throw new Error('Failed to fetch API usage');
      const usageJson: { usageData: APIUsageData[] } = await usageRes.json();
      setUsageData(usageJson.usageData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-gray-400">Dashboard and insights</p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Filter by Plan
          </label>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Only</option>
            <option value="pro">Pro Only</option>
            <option value="power">Power Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-600 bg-red-900 bg-opacity-20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {kpiData && (
        <KPICards
          totalUsers={kpiData.totalUsers}
          activeThisWeek={kpiData.activeThisWeek}
          totalMRR={kpiData.totalMRR}
          churnRate={kpiData.churnRate}
          isLoading={isLoading}
        />
      )}

      {/* Charts Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueData} isLoading={isLoading} />
        <UserDistribution
          usersByPlan={kpiData?.usersByPlan || { free: 0, pro: 0, power: 0 }}
          isLoading={isLoading}
        />
      </div>

      {/* Full Width Charts */}
      <div className="mt-6">
        <DAUChart data={[]} isLoading={isLoading} />
      </div>

      <div className="mt-6">
        <APIUsageChart data={usageData} isLoading={isLoading} />
      </div>

      {/* Cohort Table */}
      <div className="mt-6">
        <CohortTable data={cohortData} isLoading={isLoading} />
      </div>
    </div>
  );
}
