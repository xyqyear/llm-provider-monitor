import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProviderWithModels, ProbeHistory, TimelinePoint } from '../types';
import { getProvidersStatus } from '../api/providers';
import { getProbeHistory, getTimeline } from '../api/probe';
import { Timeline } from '../components/Timeline';
import { HistoryList } from '../components/HistoryList';
import Pagination from '../components/Pagination';

export function Detail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [history, setHistory] = useState<ProbeHistory[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const selectedProvider = searchParams.get('provider');
  const selectedModel = searchParams.get('model');

  useEffect(() => {
    getProvidersStatus().then(setProviders);
  }, []);

  useEffect(() => {
    if (selectedProvider && selectedModel) {
      setLoading(true);
      Promise.all([
        getProbeHistory(parseInt(selectedProvider), parseInt(selectedModel), currentPage, pageSize),
        getTimeline(parseInt(selectedProvider), parseInt(selectedModel), 24, 'none'),
      ])
        .then(([historyData, timelineData]) => {
          setHistory(historyData.items);
          setTotal(historyData.total);
          setTotalPages(historyData.totalPages);
          setTimeline(timelineData);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedProvider, selectedModel, currentPage]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSearchParams(providerId ? { provider: providerId } : {});
    setHistory([]);
    setTimeline([]);
    setCurrentPage(1);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    if (selectedProvider && modelId) {
      setSearchParams({ provider: selectedProvider, model: modelId });
    } else if (selectedProvider) {
      setSearchParams({ provider: selectedProvider });
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const currentProvider = providers.find(p => p.id === parseInt(selectedProvider || ''));
  const availableModels = currentProvider?.models || [];

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商
            </label>
            <select
              value={selectedProvider || ''}
              onChange={handleProviderChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择供应商</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模型
            </label>
            <select
              value={selectedModel || ''}
              onChange={handleModelChange}
              disabled={!selectedProvider}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">选择模型</option>
              {availableModels.map(m => (
                <option key={m.modelId} value={m.modelId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedProvider && selectedModel ? (
        loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : (
          <>
            {/* Timeline with integrated latency bars */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">状态时间轴与延迟趋势 (24小时)</h3>
              <Timeline points={timeline} />
            </div>

            {/* History List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">历史记录</h3>
                <HistoryList history={history} />
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                total={total}
              />
            </div>
          </>
        )
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          请选择供应商和模型以查看详情
        </div>
      )}
    </div>
  );
}
