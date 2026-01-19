import { useState, useEffect } from 'react';
import type { RequestTemplate, HttpMethod } from '../../types';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/templates';

export function TemplatesAdmin() {
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    method: 'POST' as HttpMethod,
    url: '/v1/messages',
    headers: '',
    body: '',
  });
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      method: 'POST',
      url: '/v1/messages',
      headers: '',
      body: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (template: RequestTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      method: template.method,
      url: template.url,
      headers: template.headers,
      body: template.body,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        method: formData.method,
        url: formData.url,
        headers: formData.headers,
        body: formData.body,
      };

      if (editingId) {
        await updateTemplate(editingId, data);
      } else {
        await createTemplate(data);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      await deleteTemplate(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">请求模板</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          添加模板
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? '编辑模板' : '添加模板'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模板名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Anthropic API"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求方法 *
                </label>
                <select
                  value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value as HttpMethod })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求路径 *
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/v1/messages"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                请求头 *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                标准HTTP头格式，每行一个（如 authorization: Bearer {'{key}'}）。
                使用 {'{variable}'} 表示需要填入的变量。
              </p>
              <textarea
                value={formData.headers}
                onChange={e => setFormData({ ...formData, headers: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={8}
                placeholder={`authorization: Bearer {key}
content-type: application/json`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                请求体 (JSON) *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                JSON格式的请求体。使用 {'{variable}'} 表示需要填入的变量（如 {'{model}'}, {'{user_prompt}'}, {'{system_prompt}'}）。
              </p>
              <textarea
                value={formData.body}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={15}
                placeholder={`{
  "model": "{model}",
  "messages": [{"role": "user", "content": "{user_prompt}"}],
  "system": "{system_prompt}"
}`}
                required
              />
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

      <div className="space-y-4">
        {templates.map(template => (
          <div key={template.id} className="bg-white rounded-lg shadow">
            <div
              className="px-6 py-4 flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
            >
              <div>
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                {template.description && (
                  <p className="text-sm text-gray-500">{template.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-mono bg-gray-100 px-1 rounded">{template.method}</span>
                  <span className="ml-2 font-mono">{template.url}</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleEdit(template);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                >
                  编辑
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
                <span className="text-gray-400">
                  {expandedId === template.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {expandedId === template.id && (
              <div className="px-6 pb-4 space-y-4 border-t">
                <div className="pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">请求头</h5>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {template.headers}
                  </pre>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">请求体</h5>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {template.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            暂无模板
          </div>
        )}
      </div>
    </div>
  );
}
