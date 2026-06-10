import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Smartphone, Key, TrendingUp, Wifi, WifiOff, AlertTriangle, ShieldCheck, ShieldOff, Radio, Activity } from 'lucide-react';
import { analysisAPI, deviceAPI, keyAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const PROTO_COLORS = { mqtt: '#3b82f6', coap: '#10b981', tls: '#8b5cf6' };
const METHOD_COLORS_ARR = ['#3b82f6', '#10b981', '#f59e0b'];
const TOOLTIP_STYLE = { backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' };

const getStatusConfig = (status) => {
  if (status === 'online') return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', label: 'Online' };
  if (status === 'error') return { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', label: 'Error' };
  return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Offline' };
};

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => {
  const colorClasses = {
    blue:   'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    red:    'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400',
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

const DashboardPage = () => {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [iotOverview, setIotOverview] = useState(null);
  const [devices, setDevices] = useState([]);
  const [keyMethodData, setKeyMethodData] = useState([]);
  const [protocolBarData, setProtocolBarData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [statsData, devData, overview] = await Promise.all([
        analysisAPI.getDashboardStatistics(),
        deviceAPI.list(),
        analysisAPI.getIoTOverview().catch(() => null),
      ]);
      setStats(statsData);
      setDevices(devData);

      if (overview) {
        setIotOverview(overview);
        const md = overview.key_method_distribution || {};
        setKeyMethodData([
          { name: 'DRBG', value: md.drbg || 0 },
          { name: 'TRNG', value: md.trng || 0 },
          { name: 'PUF',  value: md.puf  || 0 },
        ]);
        const pd = overview.protocol_distribution || {};
        setProtocolBarData([
          { protocol: 'MQTT', devices: pd.mqtt || 0 },
          { protocol: 'CoAP', devices: pd.coap || 0 },
          { protocol: 'TLS',  devices: pd.tls  || 0 },
        ]);
      } else {
        const keysData = await keyAPI.list().catch(() => []);
        const counts = { DRBG: 0, TRNG: 0, PUF: 0 };
        keysData.forEach(k => { const m = (k.generation_method || '').toUpperCase(); if (m in counts) counts[m]++; });
        setKeyMethodData([{ name: 'DRBG', value: counts.DRBG }, { name: 'TRNG', value: counts.TRNG }, { name: 'PUF', value: counts.PUF }]);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
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
  const securedCount = iotOverview?.secured_devices ?? 0;
  const unsecuredCount = iotOverview?.unsecured_devices ?? (devices.length - securedCount);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.welcome')}</p>
      </div>

      {/* ====== STAT CARDS ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Smartphone}
          title={t('dashboard.totalDevices')}
          value={stats?.total_devices || devices.length || 0}
          subtitle={`${onlineDevices.length} ${t('dashboard.online')}`}
          color="blue"
        />
        <StatCard
          icon={ShieldCheck}
          title="Secured Devices"
          value={securedCount}
          subtitle={`Score: ${iotOverview?.security_score ?? 0}%`}
          color="green"
        />
        <StatCard
          icon={ShieldOff}
          title="Unsecured Devices"
          value={unsecuredCount}
          subtitle={unsecuredCount === 0 ? 'All secured!' : 'Need keys'}
          color="red"
        />
        <StatCard
          icon={Key}
          title={t('dashboard.totalKeys')}
          value={stats?.total_keys || 0}
          subtitle={t('dashboard.generatedKeys')}
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

      {/* ====== SECURITY PROGRESS + RECENT COMMS ====== */}
      {iotOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security progress */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-green-400" /> Security Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Overall Security Score</span>
                  <span className="font-bold text-gray-900 dark:text-white">{iotOverview.security_score}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      iotOverview.security_score >= 80 ? 'bg-green-500'
                      : iotOverview.security_score >= 50 ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }`}
                    style={{ width: `${iotOverview.security_score}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{securedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Secured</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{unsecuredCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Unsecured</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">{iotOverview.total_communications || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Comms</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent communications */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-blue-400" /> Recent Communications
            </h2>
            {iotOverview.recent_communications?.length > 0 ? (
              <div className="space-y-2">
                {iotOverview.recent_communications.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-white text-xs flex-shrink-0 ${
                      c.protocol === 'mqtt' ? 'bg-blue-600'
                      : c.protocol === 'coap' ? 'bg-emerald-600'
                      : 'bg-violet-600'
                    }`}>
                      {(c.protocol || '').toUpperCase()}
                    </span>
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                      {c.source} → {c.target}
                    </span>
                    <span className="text-gray-400 text-xs flex-shrink-0">{c.transmission_time_ms?.toFixed(1)} ms</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No communications yet — go to Communication page to simulate</p>
            )}
          </div>
        </div>
      )}

      {/* ====== PROTOCOL + METHOD DISTRIBUTION ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Protocol distribution pie */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Radio size={20} className="text-blue-400" /> Protocol Distribution
          </h2>
          <p className="text-xs text-gray-500 mb-4">Protocols used across secured devices</p>
          {iotOverview && Object.values(iotOverview.protocol_distribution || {}).some(v => v > 0) ? (
            <div className="grid grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'MQTT', value: iotOverview.protocol_distribution.mqtt || 0 },
                      { name: 'CoAP', value: iotOverview.protocol_distribution.coap || 0 },
                      { name: 'TLS',  value: iotOverview.protocol_distribution.tls  || 0 },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {['mqtt', 'coap', 'tls'].map(p => <Cell key={p} fill={PROTO_COLORS[p]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {[['MQTT', 'mqtt'], ['CoAP', 'coap'], ['TLS', 'tls']].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PROTO_COLORS[key] }} />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{label}</span>
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                      {iotOverview.protocol_distribution[key] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-10 text-sm">No secured devices yet. Bind keys to devices on the Devices page.</p>
          )}
        </div>

        {/* Key method distribution */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {t('dashboard.keyGenDist')}
          </h2>
          <p className="text-xs text-gray-500 mb-4">Key generation methods across all keys</p>
          <div className="grid grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={keyMethodData}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {keyMethodData.map((entry, i) => (
                    <Cell key={entry.name} fill={METHOD_COLORS_ARR[i % METHOD_COLORS_ARR.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [`${val} key${val !== 1 ? 's' : ''}`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {keyMethodData.map((item, i) => {
                const total = keyMethodData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                const descs = {
                  DRBG: 'Algorithmic, standards-compliant',
                  TRNG: 'Hardware noise source',
                  PUF:  'Chip fingerprint, unique',
                };
                return (
                  <div key={item.name} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: METHOD_COLORS_ARR[i] }} />
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: METHOD_COLORS_ARR[i] }}>{pct}% ({item.value})</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-5">{descs[item.name]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ====== LIVE DEVICE STATUS ====== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Device Status</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Auto-refresh every 15s
          </div>
        </div>

        {devices.length === 0 ? (
          <p className="text-center text-gray-500 py-6">{t('dashboard.noData')}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                <Wifi size={20} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineDevices.length}</p>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                <WifiOff size={20} className="text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{offlineDevices.length}</p>
                  <p className="text-xs text-gray-500">Offline</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{errorDevices.length}</p>
                  <p className="text-xs text-gray-500">Error</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((device) => {
                const cfg = getStatusConfig(device.status);
                return (
                  <div
                    key={device.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.bg} ${device.status === 'online' ? 'animate-pulse' : ''}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.device_name}</p>
                      <p className="text-xs text-gray-500 truncate capitalize">{device.device_type}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                      {device.is_secured && <p className="text-xs text-green-500 font-bold">SECURED</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
