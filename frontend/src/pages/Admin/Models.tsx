import { useState, useEffect } from 'react';
import type { Model, RequestTemplate } from '../../types';
import { getModels, createModel, updateModel, deleteModel } from '../../api/models';
import { getTemplates } from '../../api/templates';

export function ModelsAdmin() {
  const [models, setModels] = useState<Model[]>([]);
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    modelName: '',
    displayName: '',
    defaultPrompt: '',
    defaultRegex: '',
    systemPrompt: '',
    templateId: null as number | null,
    enabled: true,
    sortOrder: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modelsData, templatesData] = await Promise.all([
        getModels(),
        getTemplates(),
      ]);
      setModels(modelsData);
      setTemplates(templatesData);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      modelName: '',
      displayName: '',
      defaultPrompt: '',
      defaultRegex: '',
      systemPrompt: '',
      templateId: null,
      enabled: true,
      sortOrder: 0,
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (model: Model) => {
    setFormData({
      name: model.name,
      modelName: model.modelName,
      displayName: model.displayName,
      defaultPrompt: model.defaultPrompt || '',
      defaultRegex: model.defaultRegex || '',
      systemPrompt: model.systemPrompt || '',
      templateId: model.templateId,
      enabled: model.enabled,
      sortOrder: model.sortOrder,
    });
    setEditingId(model.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = {
        name: formData.name,
        modelName: formData.modelName,
        displayName: formData.displayName,
        defaultPrompt: formData.defaultPrompt || null,
        defaultRegex: formData.defaultRegex || null,
        systemPrompt: formData.systemPrompt || null,
        templateId: formData.templateId,
        enabled: formData.enabled,
        sortOrder: formData.sortOrder,
      };

      if (editingId) {
        await updateModel(editingId, data);
      } else {
        await createModel(data);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模型吗？')) return;

    try {
      await deleteModel(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const getTemplateName = (templateId: number | null) => {
    if (!templateId) return '-';
    const template = templates.find(t => t.id === templateId);
    return template?.name || '-';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">模型配置</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          添加模型
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? '编辑模型' : '添加模型'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标识名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="cc-haiku"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">唯一标识符</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模型名 *
                </label>
                <input
                  type="text"
                  value={formData.modelName}
                  onChange={e => setFormData({ ...formData, modelName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="claude-haiku-4-5-20251001"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">实际请求时使用的模型名，填入模板的 {'{model}'} 变量</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  显示名称 *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CC Haiku 4.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求模板 *
                </label>
                <select
                  value={formData.templateId || ''}
                  onChange={e => setFormData({ ...formData, templateId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">选择模板</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序顺序
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                系统提示词
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="You are a helpful assistant."
              />
              <p className="text-xs text-gray-500 mt-1">填入模板的 {'{system_prompt}'} 变量</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  默认测试Prompt
                </label>
                <input
                  type="text"
                  value={formData.defaultPrompt}
                  onChange={e => setFormData({ ...formData, defaultPrompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1+1等于几？只回答数字。"
                />
                <p className="text-xs text-gray-500 mt-1">填入模板的 {'{user_prompt}'} 变量</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  默认响应正则
                </label>
                <input
                  type="text"
                  value={formData.defaultRegex}
                  onChange={e => setFormData({ ...formData, defaultRegex: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="^2$"
                />
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标识名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">显示名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模板</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {models.map(model => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {model.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {model.modelName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getTemplateName(model.templateId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${model.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {model.enabled ? '已启用' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(model)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
