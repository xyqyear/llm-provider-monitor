import { useState, useEffect } from 'react';
import type { ProviderAdmin, Model } from '../../types';
import { getProvidersAdmin, getProvidersStatus, createProvider, updateProvider, deleteProvider, configureProviderModels } from '../../api/providers';
import { getModels } from '../../api/models';
import Button from '../../components/Button';

export function ProvidersAdmin() {
  const [providers, setProviders] = useState<ProviderAdmin[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    authToken: '',
    enabled: true,
    intervalSeconds: '',
    modelNameMapping: {} as Record<string, string>,
  });
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [newMappingKey, setNewMappingKey] = useState('');
  const [newMappingValue, setNewMappingValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [providersData, modelsData] = await Promise.all([
        getProvidersAdmin(),
        getModels(),
      ]);
      setProviders(providersData);
      setModels(modelsData);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      baseUrl: '',
      authToken: '',
      enabled: true,
      intervalSeconds: '',
      modelNameMapping: {},
    });
    setSelectedModels([]);
    setNewMappingKey('');
    setNewMappingValue('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = async (provider: ProviderAdmin) => {
    setFormData({
      name: provider.name,
      baseUrl: provider.baseUrl,
      authToken: provider.authToken,
      enabled: provider.enabled,
      intervalSeconds: provider.intervalSeconds?.toString() || '',
      modelNameMapping: provider.modelNameMapping || {},
    });
    setEditingId(provider.id);

    // Load current enabled models for this provider
    try {
      const providersWithModels = await getProvidersStatus();
      const currentProvider = providersWithModels.find(p => p.id === provider.id);
      if (currentProvider) {
        const enabledModelIds = currentProvider.models
          .filter(m => m.enabled)
          .map(m => m.modelId);
        setSelectedModels(enabledModelIds);
      }
    } catch (err) {
      console.error('Failed to load provider models:', err);
    }

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Use model name mapping directly (no JSON parsing needed)
    const modelNameMapping = Object.keys(formData.modelNameMapping).length > 0
      ? formData.modelNameMapping
      : null;

    try {
      const data = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        authToken: formData.authToken,
        enabled: formData.enabled,
        intervalSeconds: formData.intervalSeconds ? parseInt(formData.intervalSeconds) : null,
        modelNameMapping,
      };

      if (editingId) {
        await updateProvider(editingId, data);
        // Update model configuration for existing provider
        await configureProviderModels(
          editingId,
          selectedModels.map(id => ({ modelId: id, enabled: true }))
        );
      } else {
        const newProvider = await createProvider({
          ...data,
          models: selectedModels.map(id => ({ modelId: id, enabled: true })),
        });
        setEditingId(newProvider.id);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个供应商吗？')) return;

    try {
      await deleteProvider(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAddMapping = () => {
    if (!newMappingKey.trim() || !newMappingValue.trim()) {
      return;
    }

    setFormData({
      ...formData,
      modelNameMapping: {
        ...formData.modelNameMapping,
        [newMappingKey.trim()]: newMappingValue.trim(),
      },
    });
    setNewMappingKey('');
    setNewMappingValue('');
  };

  const handleRemoveMapping = (key: string) => {
    const newMapping = { ...formData.modelNameMapping };
    delete newMapping[key];
    setFormData({
      ...formData,
      modelNameMapping: newMapping,
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">供应商管理</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          添加供应商
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? '编辑供应商' : '添加供应商'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API地址 *
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  认证令牌 *
                </label>
                <input
                  type="password"
                  value={formData.authToken}
                  onChange={e => setFormData({ ...formData, authToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  检测间隔 (秒)
                </label>
                <input
                  type="number"
                  value={formData.intervalSeconds}
                  onChange={e => setFormData({ ...formData, intervalSeconds: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="留空使用全局配置"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名映射
              </label>
              <p className="text-xs text-gray-500 mb-2">
                如果此供应商使用的模型名与配置中的标准模型名不同，可以在这里配置映射关系。格式：标准模型名 → 供应商模型名
              </p>

              {/* Existing mappings */}
              {Object.keys(formData.modelNameMapping).length > 0 && (
                <div className="mb-3 space-y-2">
                  {Object.entries(formData.modelNameMapping).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                      <span className="text-sm text-gray-700 font-mono flex-1">
                        {key} → {value}
                      </span>
                      <Button
                        type="button"
                        onClick={() => handleRemoveMapping(key)}
                        variant="danger"
                        size="sm"
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new mapping */}
              <div className="flex gap-2">
                <select
                  value={newMappingKey}
                  onChange={e => setNewMappingKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                >
                  <option value="">选择标准模型名</option>
                  {models.map(model => (
                    <option key={model.id} value={model.modelName}>
                      {model.modelName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newMappingValue}
                  onChange={e => setNewMappingValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="供应商模型名 (如: gemini-claude-opus-4-5)"
                />
                <button
                  type="button"
                  onClick={handleAddMapping}
                  disabled={!newMappingKey.trim() || !newMappingValue.trim()}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">启用</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                启用的模型
              </label>
              <div className="flex flex-wrap gap-2">
                {models.map(model => (
                  <label key={model.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedModels([...selectedModels, model.id]);
                        } else {
                          setSelectedModels(selectedModels.filter(id => id !== model.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{model.displayName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                {editingId ? '保存' : '创建'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API地址</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">映射</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {providers.map(provider => (
              <tr key={provider.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {provider.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {provider.baseUrl}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {provider.modelNameMapping ? (
                    <span className="text-blue-600" title={JSON.stringify(provider.modelNameMapping)}>
                      已配置
                    </span>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${provider.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {provider.enabled ? '已启用' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <Button
                    onClick={() => handleEdit(provider)}
                    variant="primary"
                    size="sm"
                  >
                    编辑
                  </Button>
                  <Button
                    onClick={() => handleDelete(provider.id)}
                    variant="danger"
                    size="sm"
                  >
                    删除
                  </Button>
                </td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  暂无供应商
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
