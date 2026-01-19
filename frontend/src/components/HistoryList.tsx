import type { ProbeHistory } from '../types';
import { getStatusColor, getStatusTextColor, formatLatency, formatDate } from '../utils';

interface Props {
  history: ProbeHistory[];
}

export function HistoryList({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        暂无历史记录
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map(record => (
        <div
          key={record.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <span
              className={`w-3 h-3 rounded-full ${getStatusColor(record.statusCategory)}`}
            />
            <div>
              <p className={`text-sm font-medium ${getStatusTextColor(record.statusCategory)}`}>
                {record.statusName}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(record.checkedAt)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-700">
              {formatLatency(record.latencyMs)}
            </p>
            {record.message && (
              <p className="text-xs text-gray-400 max-w-xs truncate" title={record.message}>
                {record.message}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
