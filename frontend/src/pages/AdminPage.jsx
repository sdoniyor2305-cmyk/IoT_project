import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Monitor, Key, Lock, Activity, FileText,
  UserCheck, UserX, Trash2, ShieldCheck,
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminPage = () => {
  const { isAdmin } = useAuth();
  const { t } = useLang();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [keys, setKeys] = useState([]);
  const [operations, setOperations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([adminAPI.getStats(), adminAPI.listUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab === 'dashboard' || activeTab === 'users') return;
    setTabLoading(true);
    const loaders = {
      devices: () => adminAPI.listDevices().then(setDevices),
      keys: () => adminAPI.listKeys().then(setKeys),
      operations: () => adminAPI.listOperations().then(setOperations),
      logs: () => adminAPI.getLogs().then(setLogs),
    };
    loaders[activeTab]?.()
      .catch(console.error)
      .finally(() => setTabLoading(false));
  }, [activeTab, isAdmin]);

  const handleActivate = async (userId) => {
    await adminAPI.activateUser(userId);
    setUsers(u => u.map(x => x.id === userId ? { ...x, is_active: true } : x));
  };

  const handleDeactivate = async (userId) => {
    await adminAPI.deactivateUser(userId);
    setUsers(u => u.map(x => x.id === userId ? { ...x, is_active: false } : x));
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(t('admin.users.deleteConfirm'))) return;
    await adminAPI.deleteUser(userId);
    setUsers(u => u.filter(x => x.id !== userId));
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck size={64} className="mx-auto text-red-400 mb-4" />
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {t('admin.accessDenied')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">{t('admin.loading')}</div>;
  }

  const tabs = [
    { key: 'dashboard', label: t('admin.tab.dashboard'), icon: Activity },
    { key: 'users', label: t('admin.tab.users'), icon: Users },
    { key: 'devices', label: t('admin.tab.devices'), icon: Monitor },
    { key: 'keys', label: t('admin.tab.keys'), icon: Key },
    { key: 'operations', label: t('admin.tab.operations'), icon: Lock },
    { key: 'logs', label: t('admin.tab.logs'), icon: FileText },
  ];

  const opsChartData = stats ? [
    { name: 'Encrypt', value: stats.total_encrypt },
    { name: 'Decrypt', value: stats.total_decrypt },
  ] : [];

  const usersChartData = stats ? [
    { name: t('admin.users.active'), value: stats.active_users },
    { name: t('admin.users.inactive'), value: stats.total_users - stats.active_users },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={32} className="text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition text-sm ${
              activeTab === key
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard ─────────────────────────────────────────── */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t('admin.stats.totalUsers')} value={stats.total_users} color="blue" icon={Users} />
            <StatCard label={t('admin.stats.activeUsers')} value={stats.active_users} color="green" icon={UserCheck} />
            <StatCard label={t('admin.stats.totalDevices')} value={stats.total_devices} color="purple" icon={Monitor} />
            <StatCard label={t('admin.stats.onlineDevices')} value={stats.online_devices} color="yellow" icon={Activity} />
            <StatCard label={t('admin.stats.totalKeys')} value={stats.total_keys} color="green" icon={Key} />
            <StatCard label={t('admin.stats.totalOps')} value={stats.total_operations} color="blue" icon={Lock} />
            <StatCard label={t('admin.stats.encryptOps')} value={stats.total_encrypt} color="purple" icon={Lock} />
            <StatCard label={t('admin.stats.decryptOps')} value={stats.total_decrypt} color="yellow" icon={Lock} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('admin.opsChart')}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={opsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('admin.tab.users')}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={usersChartData} cx="50%" cy="50%" outerRadius={80}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {usersChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Users ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('admin.users.title')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                {[
                  'admin.users.username', 'admin.users.email', 'admin.users.role',
                  'admin.users.status', 'admin.users.devices', 'admin.users.keys',
                  'admin.users.joined', 'admin.users.actions',
                ].map(k => (
                  <th key={k} className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 px-3 font-medium">
                    <span className="flex items-center gap-2">
                      {u.username}
                      {u.is_admin && <ShieldCheck size={14} className="text-yellow-500" />}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="py-2 px-3">
                    <span className={`badge text-xs ${u.is_admin ? 'badge-info' : 'badge-success'}`}>
                      {u.is_admin ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`badge text-xs ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                      {u.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">{u.device_count}</td>
                  <td className="py-2 px-3 text-center">{u.key_count}</td>
                  <td className="py-2 px-3 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3">
                    {u.username !== 'superadmin' && (
                      <div className="flex gap-1">
                        {u.is_active ? (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            className="p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900 rounded"
                            title={t('admin.users.deactivate')}
                          >
                            <UserX size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u.id)}
                            className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                            title={t('admin.users.activate')}
                          >
                            <UserCheck size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                          title={t('admin.users.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Devices ───────────────────────────────────────────── */}
      {activeTab === 'devices' && (
        <div className="card overflow-x-auto">
          {tabLoading ? <LoadingRow /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  {['Device ID', t('devices.name'), t('devices.type'), t('devices.status'), t('devices.memory'), t('admin.owner'), t('keys.created')].map(h => (
                    <th key={h} className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.length === 0
                  ? <tr><td colSpan={7} className="py-8 text-center text-gray-500">{t('admin.noData')}</td></tr>
                  : devices.map(d => (
                    <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2 px-3 font-mono text-xs">{d.device_id}</td>
                      <td className="py-2 px-3">{d.device_name}</td>
                      <td className="py-2 px-3"><span className="badge badge-info text-xs">{d.device_type}</span></td>
                      <td className="py-2 px-3">
                        <span className={`badge text-xs ${d.status === 'online' ? 'badge-success' : 'badge-error'}`}>{d.status}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-500">{d.memory_kb ? `${d.memory_kb} KB` : 'N/A'}</td>
                      <td className="py-2 px-3 font-medium text-blue-600 dark:text-blue-400">{d.owner_username}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Keys ──────────────────────────────────────────────── */}
      {activeTab === 'keys' && (
        <div className="card overflow-x-auto">
          {tabLoading ? <LoadingRow /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  {['Key ID', t('common.algorithm'), t('keys.keyLength'), t('keys.genMethod'), t('keys.randomness'), t('admin.owner'), t('keys.created')].map(h => (
                    <th key={h} className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.length === 0
                  ? <tr><td colSpan={7} className="py-8 text-center text-gray-500">{t('admin.noData')}</td></tr>
                  : keys.map(k => (
                    <tr key={k.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2 px-3 font-mono text-xs">{k.key_id.slice(0, 12)}…</td>
                      <td className="py-2 px-3"><span className="badge badge-info text-xs">{k.algorithm_used}</span></td>
                      <td className="py-2 px-3">{k.key_length_bits}-bit</td>
                      <td className="py-2 px-3 uppercase text-xs">{k.generation_method}</td>
                      <td className="py-2 px-3">{k.randomness_score?.toFixed(1) ?? 'N/A'}%</td>
                      <td className="py-2 px-3 font-medium text-blue-600 dark:text-blue-400">{k.owner_username}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{new Date(k.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Operations ────────────────────────────────────────── */}
      {activeTab === 'operations' && (
        <div className="card overflow-x-auto">
          {tabLoading ? <LoadingRow /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  {[t('encrypt.opType'), t('common.algorithm'), t('common.time'), t('encrypt.opStatus'), t('admin.owner'), t('keys.created')].map(h => (
                    <th key={h} className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operations.length === 0
                  ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">{t('admin.noData')}</td></tr>
                  : operations.map(o => (
                    <tr key={o.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2 px-3 capitalize">{o.operation_type}</td>
                      <td className="py-2 px-3"><span className="badge badge-info text-xs">{o.algorithm}</span></td>
                      <td className="py-2 px-3">{o.execution_time_ms?.toFixed(2)}ms</td>
                      <td className="py-2 px-3">
                        <span className={`badge text-xs ${o.status === 'success' ? 'badge-success' : 'badge-error'}`}>{o.status}</span>
                      </td>
                      <td className="py-2 px-3 font-medium text-blue-600 dark:text-blue-400">{o.owner_username}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Audit Logs ────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="card overflow-x-auto">
          {tabLoading ? <LoadingRow /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  {[t('admin.logs.user'), t('admin.logs.action'), t('admin.logs.resource'), 'Details', t('admin.logs.time')].map(h => (
                    <th key={h} className="py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0
                  ? <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('admin.noData')}</td></tr>
                  : logs.map(l => (
                    <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2 px-3 font-medium">{l.username ?? '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`badge text-xs ${actionColor(l.action)}`}>{l.action}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {l.resource_type && <span>{l.resource_type}: </span>}
                        {l.resource_id && <span className="font-mono">{l.resource_id.slice(0, 16)}</span>}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs max-w-xs truncate">{l.details ?? '—'}</td>
                      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const colorMap = {
  blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400',
  purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  yellow: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
};

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="card-hover">
    <div className={`p-2 rounded-lg w-fit mb-3 ${colorMap[color]}`}>
      <Icon size={20} />
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
  </div>
);

const LoadingRow = () => (
  <div className="py-8 text-center text-gray-500 animate-pulse">Loading…</div>
);

function actionColor(action) {
  if (!action) return '';
  if (action.includes('DELETE') || action.includes('DELETED')) return 'badge-error';
  if (action.includes('LOGIN') || action.includes('REGISTER')) return 'badge-info';
  if (action.includes('DEACTIVAT')) return 'badge-warning';
  return 'badge-success';
}

export default AdminPage;
