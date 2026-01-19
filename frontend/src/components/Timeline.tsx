import type { TimelinePoint } from '../types';
import { getStatusColor, formatLatency } from '../utils';

interface Props {
  points: TimelinePoint[];
  maxPoints?: number;
}

export function Timeline({ points, maxPoints = 48 }: Props) {
  // Take the most recent points
  const displayPoints = points.slice(-maxPoints);

  if (displayPoints.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        暂无数据
      </div>
    );
  }

  // Calculate max latency for scaling
  const validLatencies = displayPoints
    .filter(p => p.avgLatencyMs !== null)
    .map(p => p.avgLatencyMs!);
  const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : 1;

  return (
    <div className="space-y-2">
      {/* Status blocks */}
      <div className="flex items-center space-x-0.5">
        {displayPoints.map((point, idx) => (
          <StatusBlock key={idx} point={point} />
        ))}
      </div>

      {/* Latency bars */}
      <div className="relative h-16">
        <div className="absolute inset-0 flex items-end space-x-0.5">
          {displayPoints.map((point, idx) => (
            <LatencyBar key={idx} point={point} maxLatency={maxLatency} />
          ))}
        </div>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 text-xs text-gray-400">
          {formatLatency(maxLatency)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-400">0</div>
      </div>
    </div>
  );
}

function StatusBlock({ point }: { point: TimelinePoint }) {
  const date = new Date(point.timestamp);
  const tooltip = `${date.toLocaleString('zh-CN')}
状态: ${point.statusName}
${point.avgLatencyMs ? `延迟: ${formatLatency(point.avgLatencyMs)}` : ''}
${point.count > 1 ? `检测次数: ${point.count}` : ''}`;

  return (
    <div
      className={`w-3 h-8 rounded-sm ${getStatusColor(point.statusCategory)} hover:opacity-80 cursor-pointer`}
      title={tooltip}
    />
  );
}

function LatencyBar({ point, maxLatency }: { point: TimelinePoint; maxLatency: number }) {
  const date = new Date(point.timestamp);
  const height = point.avgLatencyMs
    ? Math.max(4, (point.avgLatencyMs / maxLatency) * 100)
    : 4;

  const tooltip = `${date.toLocaleString('zh-CN')}
延迟: ${formatLatency(point.avgLatencyMs)}`;

  return (
    <div
      className="w-3 bg-blue-400 rounded-t hover:bg-blue-500 cursor-pointer transition-colors"
      style={{ height: `${height}%` }}
      title={tooltip}
    />
  );
}
