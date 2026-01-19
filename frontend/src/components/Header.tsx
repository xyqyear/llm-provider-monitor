import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              LLM Monitor
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                状态总览
              </Link>
              <Link
                to="/detail"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/detail')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                详情
              </Link>
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/admin')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                管理
              </Link>
            </nav>
          </div>
          {isAuthenticated && (
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              退出登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
