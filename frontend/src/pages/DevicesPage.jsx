import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Activity, Clock } from 'lucide-react';
import { deviceAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const STATUS_CYCLE = ['online', 'offline', 'error'];

const getStatusConfig = (status) => {
  if (status === 'online') return { color: '#10b981', bg: 'bg-green-500', label: 'Online', textClass: 'text-green-600 dark:text-green-400' };
  if (status === 'error') return { color: '#f59e0b', bg: 'bg-yellow-500', label: 'Error', textClass: 'text-yellow-600 dark:text-yellow-400' };
  return { color: '#ef4444', bg: 'bg-red-500', label: 'Offline', textClass: 'text-red-600 dark:text-red-400' };
};

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Never';
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const DevicesPage = () => {
  const { t } = useLang();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    device_id: '',
    device_name: '',
    device_type: 'sensor',
    manufacturer: '',
    model: '',
    cpu_type: '',
    memory_kb: '',
    storage_kb: '',
  });

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const data = await deviceAPI.list();
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        device_id: formData.device_id,
        device_name: formData.device_name,
        device_type: formData.device_type,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        cpu_type: formData.cpu_type || null,
        memory_kb: formData.memory_kb ? parseInt(formData.memory_kb, 10) : null,
        storage_kb: formData.storage_kb ? parseInt(formData.storage_kb, 10) : null,
      };
      const newDevice = await deviceAPI.create(payload);
      setDevices([...devices, newDevice]);
      setFormData({
        device_id: '', device_name: '', device_type: 'sensor',
        manufacturer: '', model: '', cpu_type: '', memory_kb: '', storage_kb: '',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create device:', error);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (confirm(t('devices.deleteConfirm'))) {
      try {
        await deviceAPI.delete(deviceId);
        setDevices(devices.filter(d => d.id !== deviceId));
      } catch (error) {
        console.error('Failed to delete device:', error);
      }
    }
  };

  const handleChangeStatus = async (deviceId, newStatus) => {
    try {
      await deviceAPI.updateStatus(deviceId, newStatus);
      setDevices(devices.map(d =>
        d.id === deviceId ? { ...d, status: newStatus, last_seen: new Date().toISOString() } : d
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSimulateStatus = (device) => {
    const currentIdx = STATUS_CYCLE.indexOf(device.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    handleChangeStatus(device.id, nextStatus);
  };

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const errorCount = devices.filter(d => d.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('devices.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('devices.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary gap-2">
          <Plus size={20} /> {t('devices.addBtn')}
        </button>
      </div>

      {/* Status Summary */}
      {devices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-hover text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineCount}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
          </div>
          <div className="card-hover text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{offlineCount}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
          </div>
          <div className="card-hover text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{errorCount}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Error</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('devices.createTitle')}</h2>
          <form onSubmit={handleCreateDevice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.deviceId')}
              </label>
              <input
                type="text"
                value={formData.device_id}
                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                className="input"
                placeholder={t('devices.deviceIdPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.deviceName')}
              </label>
              <input
                type="text"
                value={formData.device_name}
                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                className="input"
                placeholder={t('devices.deviceNamePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.type')}
              </label>
              <select
                value={formData.device_type}
                onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                className="input"
              >
                <option>sensor</option>
                <option>actuator</option>
                <option>gateway</option>
                <option>controller</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.manufacturer')}
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="input"
                placeholder={t('devices.manufacturerPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.model')}
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input"
                placeholder="e.g., TMP36"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.cpuType')}
              </label>
              <input
                type="text"
                value={formData.cpu_type}
                onChange={(e) => setFormData({ ...formData, cpu_type: e.target.value })}
                className="input"
                placeholder="e.g., ARM Cortex-M0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('devices.memory')}
              </label>
              <input
                type="number"
                value={formData.memory_kb}
                onChange={(e) => setFormData({ ...formData, memory_kb: e.target.value })}
                className="input"
                placeholder="e.g., 32"
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="btn btn-primary flex-1">
                {t('devices.createBtn')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-ghost flex-1"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('devices.loading')}</div>
      ) : devices.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('devices.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Device ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('devices.name')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('devices.type')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('devices.status')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  <span className="flex items-center gap-1"><Clock size={14} /> Last Seen</span>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('devices.memory')}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">{t('devices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const statusCfg = getStatusConfig(device.status);
                return (
                  <tr key={device.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-4 text-gray-900 dark:text-white font-mono text-sm">{device.device_id}</td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">{device.device_name}</td>
                    <td className="py-4 px-4">
                      <span className="badge badge-info">{device.device_type}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full inline-block ${statusCfg.bg} animate-pulse`}
                          style={{ animationDuration: device.status === 'online' ? '2s' : 'none' }}
                        ></span>
                        <span className={`font-medium text-sm ${statusCfg.textClass}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-500 dark:text-gray-400 text-sm">
                      {formatLastSeen(device.last_seen)}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {device.memory_kb ? `${device.memory_kb} KB` : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSimulateStatus(device)}
                          className="btn btn-ghost p-2 text-xs flex items-center gap-1"
                          title="Simulate next status"
                        >
                          <Activity size={16} />
                          <span className="hidden sm:inline">Simulate</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 px-4">
            Auto-refreshes every 10 seconds
          </p>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;
