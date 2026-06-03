import React from 'react';
import { Menu, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ darkMode, setDarkMode, sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md">
      <div className="px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {t('nav.title')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-sm font-semibold">
            <button
              onClick={() => setLang('uz')}
              className={`px-3 py-1.5 transition ${
                lang === 'uz'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 transition ${
                lang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              EN
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="hidden md:flex items-center gap-4 border-l border-gray-300 dark:border-gray-600 pl-4">
            <span className="text-gray-600 dark:text-gray-300">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <LogOut size={18} />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
