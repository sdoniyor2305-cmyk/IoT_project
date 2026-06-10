import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Smartphone,
  Key,
  Radio,
  BarChart3,
  InfoIcon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const { logout, isAdmin } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
    { path: '/devices', labelKey: 'sidebar.devices', icon: Smartphone },
    { path: '/keys', labelKey: 'sidebar.keys', icon: Key },
    { path: '/communication', labelKey: 'sidebar.communication', icon: Radio },
    { path: '/analysis', labelKey: 'sidebar.analysis', icon: BarChart3 },
    { path: '/about', labelKey: 'sidebar.about', icon: InfoIcon },
    ...(isAdmin ? [{ path: '/admin', labelKey: 'admin.nav', icon: ShieldCheck, admin: true }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-gray-900 text-white shadow-lg flex flex-col h-screen border-r border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold">{t('sidebar.title')}</h2>
        <p className="text-sm text-gray-400">{t('sidebar.subtitle')}</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : item.admin
                  ? 'text-yellow-400 hover:bg-yellow-900 hover:bg-opacity-30'
                  : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <item.icon size={20} />
            <span>{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 py-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition"
        >
          <LogOut size={20} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
