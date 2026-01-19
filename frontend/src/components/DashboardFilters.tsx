import { useState, useRef, useEffect } from 'react';
import type { ProviderWithModels, StatusCategory, TimeRange } from '../types';

interface DashboardFiltersProps {
  providers: ProviderWithModels[];
  selectedProviderIds: number[];
  selectedModelIds: number[];
  selectedCategories: StatusCategory[];
  timeRange: TimeRange;
  onProviderChange: (ids: number[]) => void;
  onModelChange: (ids: number[]) => void;
  onCategoryChange: (categories: StatusCategory[]) => void;
  onTimeRangeChange: (range: TimeRange) => void;
}

interface MultiSelectDropdownProps<T> {
  label: string;
  items: Array<{ value: T; label: string }>;
  selectedValues: T[];
  onToggle: (value: T) => void;
  onClear: () => void;
  placeholder?: string;
}

function MultiSelectDropdown<T extends string | number>({
  label,
  items,
  selectedValues,
  onToggle,
  onClear,
  placeholder = '全部',
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayText = selectedValues.length === 0
    ? placeholder
    : selectedValues.length === 1
    ? items.find(item => item.value === selectedValues[0])?.label || placeholder
    : `${selectedValues.length} 项已选`;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full px-3 py-2 pr-10 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        <span className="block truncate">{displayText}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
            >
              <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="max-h-60 overflow-y-auto p-2">
            {items.map(item => (
              <label
                key={String(item.value)}
                className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(item.value)}
                  onChange={() => onToggle(item.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardFilters({
  providers,
  selectedProviderIds,
  selectedModelIds,
  selectedCategories,
  timeRange,
  onProviderChange,
  onModelChange,
  onCategoryChange,
  onTimeRangeChange,
}: DashboardFiltersProps) {
  // Get all unique models from selected providers (or all if none selected)
  const availableModels = providers
    .filter(p => selectedProviderIds.length === 0 || selectedProviderIds.includes(p.id))
    .flatMap(p => p.models)
    .filter((model, index, self) =>
      index === self.findIndex(m => m.modelId === model.modelId)
    );

  const handleProviderToggle = (providerId: number) => {
    if (selectedProviderIds.includes(providerId)) {
      onProviderChange(selectedProviderIds.filter(id => id !== providerId));
    } else {
      onProviderChange([...selectedProviderIds, providerId]);
    }
  };

  const handleModelToggle = (modelId: number) => {
    if (selectedModelIds.includes(modelId)) {
      onModelChange(selectedModelIds.filter(id => id !== modelId));
    } else {
      onModelChange([...selectedModelIds, modelId]);
    }
  };

  const handleCategoryToggle = (category: StatusCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const providerItems = providers.map(p => ({ value: p.id, label: p.name }));
  const modelItems = availableModels.map(m => ({ value: m.modelId, label: m.displayName }));
  const categoryItems: Array<{ value: StatusCategory; label: string }> = [
    { value: 'green', label: '正常' },
    { value: 'yellow', label: '警告' },
    { value: 'red', label: '异常' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Provider Filter */}
        <MultiSelectDropdown
          label="供应商"
          items={providerItems}
          selectedValues={selectedProviderIds}
          onToggle={handleProviderToggle}
          onClear={() => onProviderChange([])}
        />

        {/* Model Filter */}
        <MultiSelectDropdown
          label="模型"
          items={modelItems}
          selectedValues={selectedModelIds}
          onToggle={handleModelToggle}
          onClear={() => onModelChange([])}
        />

        {/* Status Category Filter */}
        <MultiSelectDropdown
          label="状态"
          items={categoryItems}
          selectedValues={selectedCategories}
          onToggle={handleCategoryToggle}
          onClear={() => onCategoryChange([])}
        />

        {/* Time Range Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            时间范围
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['90min', '24h', '7d', '30d'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
