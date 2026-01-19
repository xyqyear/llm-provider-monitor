import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProviderWithModels } from '../types';
import { getProvidersStatus } from '../api/providers';
import { triggerProbe } from '../api/probe';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../hooks/useAuth';
import { StatusTable } from '../components/StatusTable';
import { getStatusBgColor, getStatusTextColor } from '../utils';
import Button from '../components/Button';

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await getProvidersStatus();
      setProviders(data || []);
      return data || [];
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchData, (data) => setProviders(data || []), 30000);

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

  // Calculate summary stats
  const stats = {
    total: 0,
    green: 0,
    yellow: 0,
    red: 0,
  };

  (providers || []).forEach(p => {
    (p.models || []).forEach(m => {
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
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="总计" value={stats.total} />
        <SummaryCard label="正常" value={stats.green} category="green" />
        <SummaryCard label="警告" value={stats.yellow} category="yellow" />
        <SummaryCard label="异常" value={stats.red} category="red" />
      </div>

      {/* Status Table */}
      {providers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">暂无供应商配置</p>
          <Button
            onClick={() => navigate('/admin/providers')}
            variant="primary"
            size="md"
          >
            添加供应商
          </Button>
        </div>
      ) : (
        <StatusTable
          providers={providers}
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
    <div className={`${bgColor} rounded-lg p-4`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
