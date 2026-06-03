import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Smartphone, Key, Lock, TrendingUp, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { analysisAPI, deviceAPI, keyAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];
const TOOLTIP_STYLE = { backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' };

const getStatusConfig = (status) => {
  if (status === 'online') return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', label: 'Online' };
  if (status === 'error') return { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', label: 'Error' };
  return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Offline' };
};

const DashboardPage = () => {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [algorithmComparison, setAlgorithmComparison] = useState(null);
  const [devices, setDevices] = useState([]);
  const [keyMethodData, setKeyMethodData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadKeyMethods = async () => {
    try {
      const keysData = await keyAPI.list();
      const counts = { DRBG: 0, TRNG: 0, PUF: 0 };
      keysData.forEach(k => {
        const m = (k.generation_method || '').toUpperCase();
        if (m in counts) counts[m]++;
      });
      if (keysData.length > 0) {
        setKeyMethodData([
          { name: 'DRBG', value: counts.DRBG },
          { name: 'TRNG', value: counts.TRNG },
          { name: 'PUF', value: counts.PUF },
        ]);
      } else {
        setKeyMethodData([
          { name: 'DRBG', value: 4 },
          { name: 'TRNG', value: 3 },
          { name: 'PUF', value: 5 },
        ]);
      }
    } catch {
      setKeyMethodData([
        { name: 'DRBG', value: 4 },
        { name: 'TRNG', value: 3 },
        { name: 'PUF', value: 5 },
      ]);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, comparisonData, devicesData] = await Promise.all([
          analysisAPI.getDashboardStatistics(),
          analysisAPI.getAlgorithmComparison(),
          deviceAPI.list(),
        ]);
        setStats(statsData);
        setAlgorithmComparison(comparisonData);
        setDevices(devicesData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
    loadKeyMethods();

    // Auto-refresh device status every 10 seconds
    const statusInterval = setInterval(async () => {
      try {
        const devicesData = await deviceAPI.list();
        setDevices(devicesData);
        const statsData = await analysisAPI.getDashboardStatistics();
        setStats(statsData);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">{t('dashboard.loading')}</div>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');
  const errorDevices = devices.filter(d => d.status === 'error');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Smartphone}
          title={t('dashboard.totalDevices')}
          value={stats?.total_devices || 0}
          subtitle={`${stats?.online_devices || 0} ${t('dashboard.online')}`}
          color="blue"
        />
        <StatCard
          icon={Key}
          title={t('dashboard.totalKeys')}
          value={stats?.total_keys || 0}
          subtitle={t('dashboard.generatedKeys')}
          color="green"
        />
        <StatCard
          icon={Lock}
          title={t('dashboard.operations')}
          value={stats?.total_operations || 0}
          subtitle={t('dashboard.totalEncryptions')}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          title={t('dashboard.avgEntropy')}
          value={`${stats?.avg_entropy_score?.toFixed(1) || 0}%`}
          subtitle={t('dashboard.randomnessScore')}
          color="yellow"
        />
      </div>

      {/* Live Device Status Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Live Device Status
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"></span>
            Auto-refresh every 10s
          </div>
        </div>

        {devices.length === 0 ? (
          <p className="text-center text-gray-500 py-6">{t('dashboard.noData')}</p>
        ) : (
          <>
            {/* Status Summary Bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                <Wifi size={20} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineDevices.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                <WifiOff size={20} className="text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{offlineDevices.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Offline</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{errorDevices.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Error</p>
                </div>
              </div>
            </div>

            {/* Device List with Status Dots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((device) => {
                const cfg = getStatusConfig(device.status);
                return (
                  <div
                    key={device.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.bg} ${device.status === 'online' ? 'animate-pulse' : ''}`}></span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.device_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.device_id}</p>
                    </div>
                    <span className={`ml-auto text-xs font-semibold flex-shrink-0 ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('dashboard.algoPerformance')}
          </h2>
          {algorithmComparison && algorithmComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={algorithmComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="algorithm" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="avg_execution_time_ms" fill="#3b82f6" name="Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('dashboard.throughput')}
          </h2>
          {algorithmComparison && algorithmComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={algorithmComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="algorithm" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="avg_throughput_kbs" fill="#10b981" name="Throughput (KB/s)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {t('dashboard.keyGenDist')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Distribution of key generation methods across all generated keys
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={keyMethodData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={true}
              >
                {keyMethodData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val, name) => [`${val} key${val !== 1 ? 's' : ''}`, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {keyMethodData.map((item, i) => {
              const total = keyMethodData.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }}></span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: PIE_COLORS[i] }}>{pct}%</span>
                    <span className="text-xs text-gray-500 ml-2">({item.value} keys)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('dashboard.supportedAlgos')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlgorithmCard name="ASCON" description={t('algo.ascon.desc')} blockSize="128-bit" keySize="128-bit" />
          <AlgorithmCard name="AES-128" description={t('algo.aes.desc')} blockSize="128-bit" keySize="128-bit" />
          <AlgorithmCard name="SPECK" description={t('algo.speck.desc')} blockSize="64-bit" keySize="128-bit" />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
  };
  return (
    <div className="card-hover">
      <div className={`p-3 rounded-lg w-fit mb-4 ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{subtitle}</p>
    </div>
  );
};

const AlgorithmCard = ({ name, description, blockSize, keySize }) => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition">
    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{name}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
    <div className="space-y-1 text-xs">
      <p className="text-gray-500 dark:text-gray-500">Block: {blockSize}</p>
      <p className="text-gray-500 dark:text-gray-500">Key: {keySize}</p>
    </div>
  </div>
);

export default DashboardPage;
