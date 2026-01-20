import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface Props {
  onSuccess?: () => void;
}

export function AdminAuth({ onSuccess }: Props) {
  const { login, passwordRequired } = useAuth();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!passwordRequired) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(password, remember);
    setLoading(false);

    if (success) {
      onSuccess?.();
    } else {
      setError('密码错误');
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">管理员认证</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              管理密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入管理密码"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '验证中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
