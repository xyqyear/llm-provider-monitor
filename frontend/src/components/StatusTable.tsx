import type { ProviderWithModels } from '../types';
import { getStatusColor, getStatusTextColor, formatLatency, formatDate } from '../utils';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  providers: ProviderWithModels[];
  onTriggerProbe?: (providerId: number, modelId: number) => void;
  onViewDetail?: (providerId: number, modelId: number) => void;
}

export function StatusTable({ providers, onTriggerProbe, onViewDetail }: Props) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {providers.map(provider => (
          <StatusCard
            key={provider.id}
            provider={provider}
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              供应商
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              模型
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              延迟
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              检测时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {onTriggerProbe && (
                    <button
                      onClick={() => onTriggerProbe(provider.id, model.modelId)}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={!provider.enabled || !model.enabled}
                    >
                      检测
                    </button>
                  )}
                  {onViewDetail && (
                    <button
                      onClick={() => onViewDetail(provider.id, model.modelId)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      详情
                    </button>
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
  onTriggerProbe,
  onViewDetail,
}: {
  provider: ProviderWithModels;
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
        {provider.models.map(model => (
          <div
            key={model.modelId}
            className={`flex items-center justify-between ${!model.enabled ? 'opacity-50' : ''}`}
          >
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
            <div className="flex space-x-2">
              {onTriggerProbe && (
                <button
                  onClick={() => onTriggerProbe(provider.id, model.modelId)}
                  className="text-xs text-blue-600"
                  disabled={!provider.enabled || !model.enabled}
                >
                  检测
                </button>
              )}
              {onViewDetail && (
                <button
                  onClick={() => onViewDetail(provider.id, model.modelId)}
                  className="text-xs text-gray-600"
                >
                  详情
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
