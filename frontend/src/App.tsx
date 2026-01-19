import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Detail } from './pages/Detail';
import { AdminLayout } from './pages/Admin/index';
import { ProvidersAdmin } from './pages/Admin/Providers';
import { ModelsAdmin } from './pages/Admin/Models';
import { TemplatesAdmin } from './pages/Admin/Templates';
import { StatusConfigAdmin } from './pages/Admin/StatusConfig';
import { SettingsAdmin } from './pages/Admin/Settings';
import { StatusProvider } from './contexts/StatusContext';

export default function App() {
  return (
    <StatusProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/detail" element={<Detail />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/providers" replace />} />
              <Route path="providers" element={<ProvidersAdmin />} />
              <Route path="models" element={<ModelsAdmin />} />
              <Route path="templates" element={<TemplatesAdmin />} />
              <Route path="status" element={<StatusConfigAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
            </Route>
          </Routes>
        </main>
      </div>
    </StatusProvider>
  );
}
