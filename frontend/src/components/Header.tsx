import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStatusCounts } from '../contexts/StatusContext';

export function Header() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { statusCounts } = useStatusCounts();

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
          <div className="flex items-center space-x-4">
            {/* Status Counts */}
            <div className="flex items-center space-x-2">
              {/* Normal Count */}
              <div className="flex items-center space-x-1 bg-green-50 border border-green-200 rounded px-2 py-1">
                <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-700">{statusCounts.green}</span>
              </div>
              {/* Abnormal Count */}
              <div className="flex items-center space-x-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                <svg className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-red-700">{statusCounts.red}</span>
              </div>
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
      </div>
    </header>
  );
}
