import { StatusCategory } from '../types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getStatusColor(category: StatusCategory | null): string {
  switch (category) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-gray-300';
  }
}

export function getStatusTextColor(category: StatusCategory | null): string {
  switch (category) {
    case 'green':
      return 'text-green-600';
    case 'yellow':
      return 'text-yellow-600';
    case 'red':
      return 'text-red-600';
    default:
      return 'text-gray-400';
  }
}

export function getStatusBgColor(category: StatusCategory | null): string {
  switch (category) {
    case 'green':
      return 'bg-green-100';
    case 'yellow':
      return 'bg-yellow-100';
    case 'red':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}
