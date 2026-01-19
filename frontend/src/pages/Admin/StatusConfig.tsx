import { useState, useEffect } from 'react';
import type { StatusConfig, StatusConfigCreate, UnmatchedMessage, PreviewMatch } from '../../types';
import {
  getStatusConfigs,
  createStatusConfig,
  updateStatusConfig,
  deleteStatusConfig,
  previewRegexMatches,
  applyConfigToHistory,
  getUnmatchedMessages,
} from '../../api/status';
import Pagination from '../../components/Pagination';

export function StatusConfigAdmin() {
  const [configs, setConfigs] = useState<StatusConfig[]>([]);
  const [unmatchedMessages, setUnmatchedMessages] = useState<UnmatchedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  const [formData, setFormData] = useState<StatusConfigCreate>({
    name: '',
    category: 'yellow',
    httpCodePattern: '',
    responseRegex: '',
    priority: 0,
  });
  const [previewMatches, setPreviewMatches] = useState<PreviewMatch[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      const [configsData, messagesData] = await Promise.all([
        getStatusConfigs(),
        getUnmatchedMessages(currentPage, pageSize),
      ]);
      setConfigs(configsData);
      setUnmatchedMessages(messagesData.items);
      setTotal(messagesData.total);
      setTotalPages(messagesData.totalPages);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'yellow',
      httpCodePattern: '',
      responseRegex: '',
      priority: 0,
    });
    setEditingId(null);
    setShowForm(false);
    setPreviewMatches([]);
    setError('');
  };

  const handleEdit = (config: StatusConfig) => {
    setFormData({
      name: config.name,
      category: config.category,
      httpCodePattern: config.httpCodePattern || '',
      responseRegex: config.responseRegex || '',
      priority: config.priority,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handlePreview = async () => {
    if (!formData.responseRegex) {
      setPreviewMatches([]);
      return;
    }

    try {
      const matches = await previewRegexMatches(formData.responseRegex);
      setPreviewMatches(matches);
    } catch (err) {
      setError('正则表达式无效');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await updateStatusConfig(editingId, formData);
      } else {
        await createStatusConfig(formData);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleApplyToHistory = async (configId: number) => {
    if (!confirm('确定要将此配置应用到历史未匹配记录吗？此操作不可撤销。')) return;

    try {
      const result = await applyConfigToHistory(configId);
      alert(result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个状态配置吗？')) return;

    try {
      await deleteStatusConfig(id);
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
        <h2 className="text-xl font-semibold text-gray-900">状态配置</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          添加状态
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? '编辑状态配置' : '添加状态配置'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态名称 *
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
                  分类 *
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as 'green' | 'yellow' | 'red' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="green">正常 (绿色)</option>
                  <option value="yellow">警告 (黄色)</option>
                  <option value="red">异常 (红色)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTTP 状态码模式
                </label>
                <input
                  type="text"
                  value={formData.httpCodePattern || ''}
                  onChange={e => setFormData({ ...formData, httpCodePattern: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: 200, 4xx, 5xx"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  响应匹配正则
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.responseRegex || ''}
                    onChange={e => setFormData({ ...formData, responseRegex: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: ^2$ 或 error|timeout"
                  />
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    预览匹配
                  </button>
                </div>
              </div>
            </div>

            {previewMatches.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  将匹配以下未匹配消息:
                </h4>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {previewMatches.map((match, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      <span className="text-gray-400">({match.count}次)</span> {match.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

      {/* Status Configs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态码</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTP模式</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">正则</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">优先级</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {configs.map(config => (
              <tr key={config.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {config.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {config.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${config.category === 'green' ? 'bg-green-100 text-green-800' :
                    config.category === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {config.category === 'green' ? '正常' :
                      config.category === 'yellow' ? '警告' : '异常'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                  {config.httpCodePattern || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate font-mono">
                  {config.responseRegex || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {config.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {config.code !== -1 ? (
                    <>
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleApplyToHistory(config.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        应用
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400">系统保留</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unmatched Messages */}
      {total > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">未匹配消息 (共 {total} 条)</h3>
            <div className="space-y-2">
              {unmatchedMessages.map((msg, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-700 break-all">{msg.message}</p>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {msg.occurrenceCount}次
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
