import { useState, useEffect } from 'react';
import type { GlobalConfig, GlobalConfigUpdate } from '../../types';
import { getConfig, updateConfig } from '../../api/config';

export function SettingsAdmin() {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    checkIntervalSeconds: 300,
    checkTimeoutSeconds: 120,
    maxParallelChecks: 3,
    dataRetentionDays: 30,
    adminPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getConfig();
      setConfig(data);
      setFormData({
        checkIntervalSeconds: data.checkIntervalSeconds,
        checkTimeoutSeconds: data.checkTimeoutSeconds,
        maxParallelChecks: data.maxParallelChecks,
        dataRetentionDays: data.dataRetentionDays,
        adminPassword: '',
        confirmPassword: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.adminPassword && formData.adminPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSaving(true);
    try {
      const updateData: GlobalConfigUpdate = {
        checkIntervalSeconds: formData.checkIntervalSeconds,
        checkTimeoutSeconds: formData.checkTimeoutSeconds,
        maxParallelChecks: formData.maxParallelChecks,
        dataRetentionDays: formData.dataRetentionDays,
      };

      if (formData.adminPassword) {
        updateData.adminPassword = formData.adminPassword;
      }

      await updateConfig(updateData);
      setSuccess('设置已保存');
      setFormData(prev => ({ ...prev, adminPassword: '', confirmPassword: '' }));
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">全局设置</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md">{success}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认检测间隔 (秒)
              </label>
              <input
                type="number"
                value={formData.checkIntervalSeconds}
                onChange={e => setFormData({ ...formData, checkIntervalSeconds: parseInt(e.target.value) || 300 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={60}
              />
              <p className="mt-1 text-xs text-gray-500">供应商未设置独立间隔时使用此值</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                检测超时时间 (秒)
              </label>
              <input
                type="number"
                value={formData.checkTimeoutSeconds}
                onChange={e => setFormData({ ...formData, checkTimeoutSeconds: parseInt(e.target.value) || 120 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={30}
                max={600}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大并行检测数
              </label>
              <input
                type="number"
                value={formData.maxParallelChecks}
                onChange={e => setFormData({ ...formData, maxParallelChecks: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
                max={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据保留天数
              </label>
              <input
                type="number"
                value={formData.dataRetentionDays}
                onChange={e => setFormData({ ...formData, dataRetentionDays: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
                max={365}
              />
            </div>
          </div>

          <hr />

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              管理密码
              {config?.hasAdminPassword && (
                <span className="ml-2 text-sm text-green-600">(已设置)</span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="留空则不修改"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="再次输入新密码"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
