import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AdminAuth } from '../../components/AdminAuth';

export function AdminLayout() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <AdminAuth />;
  }

  const tabs = [
    { path: '/admin/providers', label: '供应商管理' },
    { path: '/admin/models', label: '模型配置' },
    { path: '/admin/templates', label: '请求模板' },
    { path: '/admin/status', label: '状态配置' },
    { path: '/admin/settings', label: '全局设置' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <nav className="flex border-b">
          {tabs.map(tab => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px ${location.pathname === tab.path
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
}
