import { useState } from 'react';
import type { TimelinePoint, TimeRange } from '../types';
import { getStatusBgColor } from '../utils';

interface MiniTimelineProps {
  timeline: TimelinePoint[];
  uptimePercentage: number;
  timeRange: TimeRange;
}

export function MiniTimeline({ timeline, uptimePercentage, timeRange }: MiniTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Determine expected number of points based on time range
  const getExpectedPointCount = (range: TimeRange): number | null => {
    switch (range) {
      case '90min':
        return null; // Variable, no fixed count
      case '24h':
        return 24; // 24 hours
      case '7d':
        return 28; // 7 days × 4 (6-hour blocks)
      case '30d':
        return 30; // 30 days
    }
  };

  const expectedCount = getExpectedPointCount(timeRange);

  // Build display points array with gray placeholders if needed
  const displayPoints: Array<TimelinePoint | null> = [];

  if (expectedCount !== null) {
    // For fixed-count ranges, pad with nulls at the beginning
    const paddingCount = Math.max(0, expectedCount - timeline.length);
    for (let i = 0; i < paddingCount; i++) {
      displayPoints.push(null);
    }
    displayPoints.push(...timeline);
  } else {
    // For 90min, just show what we have
    displayPoints.push(...timeline);
  }

  if (displayPoints.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No data
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-0.5">
        {displayPoints.map((point, index) => {
          const bgColor = point ? getStatusBgColor(point.statusCategory) : 'bg-gray-300';
          const isPlaceholder = point === null;

          return (
            <div
              key={index}
              className={`flex-1 h-2 ${bgColor} rounded-sm ${isPlaceholder ? '' : 'cursor-pointer transition-transform hover:scale-150'}`}
              onMouseEnter={() => !isPlaceholder && setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && displayPoints[hoveredIndex] !== null && (
        <div className="absolute z-10 bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg whitespace-nowrap">
          <div className="space-y-1">
            <div>
              <span className="font-semibold">Time:</span>{' '}
              {new Date(displayPoints[hoveredIndex]!.timestamp).toLocaleString()}
            </div>
            <div>
              <span className="font-semibold">Status:</span>{' '}
              {displayPoints[hoveredIndex]!.statusName}
            </div>
            {displayPoints[hoveredIndex]!.count > 1 && (
              <div>
                <span className="font-semibold">Count:</span>{' '}
                {displayPoints[hoveredIndex]!.count}
              </div>
            )}
            {displayPoints[hoveredIndex]!.avgLatencyMs !== null && (
              <div>
                <span className="font-semibold">Avg Latency:</span>{' '}
                {displayPoints[hoveredIndex]!.avgLatencyMs?.toFixed(0)}ms
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
