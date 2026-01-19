import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TimelinePoint, TimeRange } from '../types';
import { getStatusBgColor } from '../utils';

interface MiniTimelineProps {
  timeline: TimelinePoint[];
  timeRange: TimeRange;
}

export function MiniTimeline({ timeline, timeRange }: MiniTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  const isAggregated = timeRange !== '90min';

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

  // Helper to get background color for timeline blocks
  const getBlockColor = (point: TimelinePoint | null): string => {
    if (!point) return 'bg-gray-300';

    if (isAggregated) {
      // For aggregated data, use uptime percentage to determine color
      const uptime = point.uptimePercentage ?? 0;
      if (uptime >= 95) return 'bg-green-100';
      if (uptime >= 90) return 'bg-yellow-100';
      return 'bg-red-100';
    } else {
      // For non-aggregated data, use status category
      return getStatusBgColor(point.statusCategory);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (displayPoints[index] === null) return;

    const blockElement = blockRefs.current[index];
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  return (
    <>
      <div className="relative">
        <div className="flex gap-0.5">
          {displayPoints.map((point, index) => {
            const bgColor = getBlockColor(point);
            const isPlaceholder = point === null;

            return (
              <div
                key={index}
                ref={(el) => (blockRefs.current[index] = el)}
                className={`flex-1 h-2 ${bgColor} rounded-sm ${isPlaceholder ? '' : 'cursor-pointer transition-transform hover:scale-150'}`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip rendered via portal */}
      {hoveredIndex !== null && displayPoints[hoveredIndex] !== null && tooltipPosition && (() => {
        const point = displayPoints[hoveredIndex]!;

        const tooltip = (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg whitespace-nowrap"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="space-y-1">
              {isAggregated ? (
                // Aggregated data tooltip
                <>
                  <div>
                    <span className="font-semibold">Time Range:</span>{' '}
                    {new Date(point.timestamp).toLocaleString()} - {new Date(point.timeRangeEnd!).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Uptime:</span>{' '}
                    {point.uptimePercentage?.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-semibold">Green:</span> {point.greenCount} |
                    <span className="font-semibold"> Yellow:</span> {point.yellowCount} |
                    <span className="font-semibold"> Red:</span> {point.redCount}
                  </div>
                  {point.avgLatencyMs !== null && (
                    <div>
                      <span className="font-semibold">Avg Latency:</span>{' '}
                      {point.avgLatencyMs.toFixed(0)}ms
                    </div>
                  )}
                </>
              ) : (
                // Non-aggregated data tooltip
                <>
                  <div>
                    <span className="font-semibold">Time:</span>{' '}
                    {new Date(point.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Status:</span>{' '}
                    {point.statusName}
                  </div>
                  {point.avgLatencyMs !== null && (
                    <div>
                      <span className="font-semibold">Latency:</span>{' '}
                      {point.avgLatencyMs.toFixed(0)}ms
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Arrow */}
            <div
              className="absolute left-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
              style={{
                top: '100%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        );

        return createPortal(tooltip, document.body);
      })()}
    </>
  );
}
