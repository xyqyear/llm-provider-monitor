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

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Provider Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
            {providers.map(provider => (
              <label key={provider.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedProviderIds.includes(provider.id)}
                  onChange={() => handleProviderToggle(provider.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{provider.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Model Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
            {availableModels.map(model => (
              <label key={model.modelId} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedModelIds.includes(model.modelId)}
                  onChange={() => handleModelToggle(model.modelId)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{model.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes('green')}
                onChange={() => handleCategoryToggle('green')}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700">Normal</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes('yellow')}
                onChange={() => handleCategoryToggle('yellow')}
                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="ml-2 text-sm text-gray-700">Warning</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes('red')}
                onChange={() => handleCategoryToggle('red')}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700">Error</span>
            </label>
          </div>
        </div>

        {/* Time Range Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
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
