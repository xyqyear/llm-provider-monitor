import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProviderWithModels, StatusCategory, TimeRange, TimelineBatchItem } from '../types';
import { getProvidersStatus } from '../api/providers';
import { triggerProbe, getTimelineBatch } from '../api/probe';
import { useInterval } from '../hooks/useInterval';
import { useAuth } from '../hooks/useAuth';
import { StatusTable } from '../components/StatusTable';
import { DashboardFilters } from '../components/DashboardFilters';
import { getStatusBgColor, getStatusTextColor } from '../utils';
import Button from '../components/Button';

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<StatusCategory[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [timelineData, setTimelineData] = useState<Map<string, TimelineBatchItem>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const data = await getProvidersStatus();
      setProviders(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useInterval(fetchData, 30000);

  // Fetch timeline data when filters or time range change
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        // Map time range to hours and aggregation
        const timeRangeMap: Record<TimeRange, { hours: number; aggregation: 'none' | 'hour' | '6hour' | 'day' }> = {
          '90min': { hours: 1.5, aggregation: 'none' },
          '24h': { hours: 24, aggregation: 'hour' },
          '7d': { hours: 168, aggregation: '6hour' },
          '30d': { hours: 720, aggregation: 'day' },
        };

        const { hours, aggregation } = timeRangeMap[timeRange];

        const response = await getTimelineBatch(
          hours,
          aggregation,
          selectedProviderIds.length > 0 ? selectedProviderIds : undefined,
          selectedModelIds.length > 0 ? selectedModelIds : undefined,
          undefined  // Don't filter timeline by status category - only filter current status
        );

        // Convert array to Map for quick lookup
        const dataMap = new Map<string, TimelineBatchItem>();
        response.items.forEach(item => {
          const key = `${item.providerId}-${item.modelId}`;
          dataMap.set(key, item);
        });

        setTimelineData(dataMap);
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
      }
    };

    if (providers.length > 0) {
      fetchTimeline();
    }
  }, [providers, selectedProviderIds, selectedModelIds, timeRange]);

  const handleTriggerProbe = async (providerId: number, modelId: number) => {
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }

    try {
      await triggerProbe(providerId, modelId);
      await fetchData();
    } catch (error) {
      console.error('Probe failed:', error);
    }
  };

  const handleViewDetail = (providerId: number, modelId: number) => {
    navigate(`/detail?provider=${providerId}&model=${modelId}`);
  };

  // Apply filters to providers
  const filteredProviders = providers.filter(provider => {
    // Filter by provider
    if (selectedProviderIds.length > 0 && !selectedProviderIds.includes(provider.id)) {
      return false;
    }

    // Filter models
    const filteredModels = provider.models.filter(model => {
      // Filter by model
      if (selectedModelIds.length > 0 && !selectedModelIds.includes(model.modelId)) {
        return false;
      }

      // Filter by status category
      if (selectedCategories.length > 0 && model.statusCategory && !selectedCategories.includes(model.statusCategory)) {
        return false;
      }

      return true;
    });

    // Only include provider if it has at least one matching model
    return filteredModels.length > 0;
  }).map(provider => ({
    ...provider,
    models: provider.models.filter(model => {
      if (selectedModelIds.length > 0 && !selectedModelIds.includes(model.modelId)) {
        return false;
      }
      if (selectedCategories.length > 0 && model.statusCategory && !selectedCategories.includes(model.statusCategory)) {
        return false;
      }
      return true;
    }),
  }));

  // Calculate summary stats from filtered providers
  const stats = {
    total: 0,
    green: 0,
    yellow: 0,
    red: 0,
  };

  filteredProviders.forEach(p => {
    p.models.forEach(m => {
      if (p.enabled && m.enabled) {
        stats.total++;
        if (m.statusCategory) {
          stats[m.statusCategory]++;
        }
      }
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary - Smaller */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="总计" value={stats.total} />
        <SummaryCard label="正常" value={stats.green} category="green" />
        <SummaryCard label="警告" value={stats.yellow} category="yellow" />
        <SummaryCard label="异常" value={stats.red} category="red" />
      </div>

      {/* Filters */}
      <DashboardFilters
        providers={providers}
        selectedProviderIds={selectedProviderIds}
        selectedModelIds={selectedModelIds}
        selectedCategories={selectedCategories}
        timeRange={timeRange}
        onProviderChange={setSelectedProviderIds}
        onModelChange={setSelectedModelIds}
        onCategoryChange={setSelectedCategories}
        onTimeRangeChange={setTimeRange}
      />

      {/* Status Table */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">
            {providers.length === 0 ? '暂无供应商配置' : '没有匹配的结果'}
          </p>
          {providers.length === 0 && (
            <Button
              onClick={() => navigate('/admin/providers')}
              variant="primary"
              size="md"
            >
              添加供应商
            </Button>
          )}
        </div>
      ) : (
        <StatusTable
          providers={filteredProviders}
          timelineData={timelineData}
          timeRange={timeRange}
          onTriggerProbe={handleTriggerProbe}
          onViewDetail={handleViewDetail}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  category,
}: {
  label: string;
  value: number;
  category?: 'green' | 'yellow' | 'red';
}) {
  const bgColor = category ? getStatusBgColor(category) : 'bg-gray-100';
  const textColor = category ? getStatusTextColor(category) : 'text-gray-700';

  return (
    <div className={`${bgColor} rounded-lg p-2`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
