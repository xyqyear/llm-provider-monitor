import type { ProviderWithModels, TimelineBatchItem, TimeRange } from '../types';
import { getStatusColor, getStatusTextColor, formatLatency, formatDate } from '../utils';
import { useResponsive } from '../hooks/useResponsive';
import Button from './Button';
import { MiniTimeline } from './MiniTimeline';

interface Props {
  providers: ProviderWithModels[];
  timelineData?: Map<string, TimelineBatchItem>;
  timeRange: TimeRange;
  onTriggerProbe?: (providerId: number, modelId: number) => void;
  onViewDetail?: (providerId: number, modelId: number) => void;
}

export function StatusTable({ providers, timelineData, timeRange, onTriggerProbe, onViewDetail }: Props) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {providers.map(provider => (
          <StatusCard
            key={provider.id}
            provider={provider}
            timelineData={timelineData}
            timeRange={timeRange}
            onTriggerProbe={onTriggerProbe}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              供应商
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              模型
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              延迟
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              检测时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              Uptime
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-full">
              Timeline
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {providers.map(provider =>
            provider.models.map((model, idx) => (
              <tr key={`${provider.id}-${model.modelId}`} className={!provider.enabled || !model.enabled ? 'opacity-50' : ''}>
                {idx === 0 && (
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                    rowSpan={provider.models.length}
                  >
                    {provider.name}
                    {!provider.enabled && (
                      <span className="ml-2 text-xs text-gray-400">(已禁用)</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.displayName}
                  {!model.enabled && (
                    <span className="ml-2 text-xs text-gray-400">(已禁用)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center">
                    <span
                      className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(model.statusCategory)}`}
                    />
                    <span className={`text-sm ${getStatusTextColor(model.statusCategory)}`}>
                      {model.statusName || '-'}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatLatency(model.latencyMs)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.checkedAt ? formatDate(model.checkedAt) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(() => {
                    const key = `${provider.id}-${model.modelId}`;
                    const data = timelineData?.get(key);
                    if (!data) return <span className="text-gray-400">-</span>;

                    const uptime = data.uptimePercentage;
                    const color = uptime >= 95 ? 'text-green-600' : uptime >= 90 ? 'text-yellow-600' : 'text-red-600';
                    return <span className={`font-medium ${color}`}>{uptime.toFixed(1)}%</span>;
                  })()}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const key = `${provider.id}-${model.modelId}`;
                    const data = timelineData?.get(key);
                    if (!data) return <span className="text-xs text-gray-400">No data</span>;

                    return (
                      <MiniTimeline
                        timeline={data.timeline}
                        uptimePercentage={data.uptimePercentage}
                        timeRange={timeRange}
                      />
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {onTriggerProbe && (
                    <Button
                      onClick={() => onTriggerProbe(provider.id, model.modelId)}
                      variant="primary"
                      size="sm"
                      disabled={!provider.enabled || !model.enabled}
                    >
                      检测
                    </Button>
                  )}
                  {onViewDetail && (
                    <Button
                      onClick={() => onViewDetail(provider.id, model.modelId)}
                      variant="secondary"
                      size="sm"
                    >
                      详情
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusCard({
  provider,
  timelineData,
  timeRange,
  onTriggerProbe,
  onViewDetail,
}: {
  provider: ProviderWithModels;
  timelineData?: Map<string, TimelineBatchItem>;
  timeRange: TimeRange;
  onTriggerProbe?: (providerId: number, modelId: number) => void;
  onViewDetail?: (providerId: number, modelId: number) => void;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${!provider.enabled ? 'opacity-50' : ''}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        {provider.name}
        {!provider.enabled && (
          <span className="ml-2 text-xs text-gray-400">(已禁用)</span>
        )}
      </h3>
      <div className="space-y-3">
        {provider.models.map(model => {
          const key = `${provider.id}-${model.modelId}`;
          const data = timelineData?.get(key);

          return (
            <div
              key={model.modelId}
              className={`border border-gray-200 rounded-md p-3 ${!model.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-3 h-3 rounded-full ${getStatusColor(model.statusCategory)}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {model.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {model.statusName || '-'} · {formatLatency(model.latencyMs)}
                    </p>
                  </div>
                </div>
                {data && (
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      data.uptimePercentage >= 95 ? 'text-green-600' :
                      data.uptimePercentage >= 90 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {data.uptimePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Uptime</p>
                  </div>
                )}
              </div>
              {data && (
                <div className="mb-2">
                  <MiniTimeline
                    timeline={data.timeline}
                    uptimePercentage={data.uptimePercentage}
                    timeRange={timeRange}
                  />
                </div>
              )}
              <div className="flex space-x-2">
                {onTriggerProbe && (
                  <Button
                    onClick={() => onTriggerProbe(provider.id, model.modelId)}
                    variant="primary"
                    size="sm"
                    disabled={!provider.enabled || !model.enabled}
                  >
                    检测
                  </Button>
                )}
                {onViewDetail && (
                  <Button
                    onClick={() => onViewDetail(provider.id, model.modelId)}
                    variant="secondary"
                    size="sm"
                  >
                    详情
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
