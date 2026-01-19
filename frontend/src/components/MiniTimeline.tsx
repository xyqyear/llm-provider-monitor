import { useState } from 'react';
import type { TimelinePoint } from '../types';
import { getStatusBgColor } from '../utils';

interface MiniTimelineProps {
  timeline: TimelinePoint[];
  uptimePercentage: number;
}

export function MiniTimeline({ timeline, uptimePercentage }: MiniTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (timeline.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No data
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-0.5 flex-wrap">
        {timeline.map((point, index) => {
          const bgColor = getStatusBgColor(point.statusCategory);

          return (
            <div
              key={index}
              className={`w-2 h-2 ${bgColor} rounded-sm cursor-pointer transition-transform hover:scale-150`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div className="absolute z-10 bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg whitespace-nowrap">
          <div className="space-y-1">
            <div>
              <span className="font-semibold">Time:</span>{' '}
              {new Date(timeline[hoveredIndex].timestamp).toLocaleString()}
            </div>
            <div>
              <span className="font-semibold">Status:</span>{' '}
              {timeline[hoveredIndex].statusName}
            </div>
            {timeline[hoveredIndex].count > 1 && (
              <div>
                <span className="font-semibold">Count:</span>{' '}
                {timeline[hoveredIndex].count}
              </div>
            )}
            {timeline[hoveredIndex].avgLatencyMs !== null && (
              <div>
                <span className="font-semibold">Avg Latency:</span>{' '}
                {timeline[hoveredIndex].avgLatencyMs?.toFixed(0)}ms
              </div>
            )}
            <div>
              <span className="font-semibold">Uptime:</span>{' '}
              {uptimePercentage.toFixed(1)}%
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
