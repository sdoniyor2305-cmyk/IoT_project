import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Activity, ShieldCheck, ShieldOff, RefreshCw,
  Cpu, MemoryStick, Wifi, WifiOff, AlertTriangle, X, Key, XCircle
} from 'lucide-react';
import { deviceAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const STATUS_CYCLE = ['online', 'offline', 'error'];

const getStatusConfig = (status) => {
  if (status === 'online') return { color: 'bg-green-500', text: 'text-green-400', label: 'Online', icon: Wifi };
  if (status === 'error') return { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Error', icon: AlertTriangle };
  return { color: 'bg-red-500', text: 'text-red-400', label: 'Offline', icon: WifiOff };
};

const PROTOCOL_INFO = {
  mqtt: { label: 'MQTT', color: 'bg-blue-600', desc: 'Lightweight pub/sub — best for sensors', latency: '8–15ms' },
  coap: { label: 'CoAP', color: 'bg-emerald-600', desc: 'UDP-based, minimal overhead', latency: '4–10ms' },
  tls:  { label: 'TLS', color: 'bg-violet-600', desc: 'Full TLS security, higher overhead', latency: '25–45ms' },
};

const METHOD_INFO = {
  drbg: { label: 'DRBG', color: 'bg-blue-700', desc: 'Algorithmic — fast, NIST-compliant', entropy: '~96%', forDevices: 'gateway, controller' },
  trng: { label: 'TRNG', color: 'bg-green-700', desc: 'Hardware noise — highest entropy', entropy: '~99%', forDevices: 'camera' },
  puf:  { label: 'PUF', color: 'bg-orange-700', desc: 'Chip fingerprint — device-unique', entropy: '~85%', forDevices: 'sensor, actuator' },
};

const LENGTH_INFO = {
  64:  { label: '64-bit', desc: 'Ultra-lightweight IoT' },
  128: { label: '128-bit', desc: 'Standard security (recommended)' },
  256: { label: '256-bit', desc: 'Maximum security' },
};

const getRecommendedMethod = (deviceType) => {
  const t = (deviceType || '').toLowerCase();
  if (['sensor', 'actuator'].includes(t)) return 'puf';
  if (t === 'camera') return 'trng';
  return 'drbg';
};

const getMatchStatus = (deviceType, method) => {
  if (!deviceType || !method) return null;
  return getRecommendedMethod(deviceType) === method.toLowerCase() ? 'optimal' : 'non-optimal';
};

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Never';
  const diffMins = Math.floor((new Date() - new Date(lastSeen)) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const BindKeyModal = ({ device, onClose, onSuccess }) => {
  const recommended = getRecommendedMethod(device.device_type);
  const [form, setForm] = useState({ method: recommended, length: 128, protocol: '' });
  const [binding, setBinding] = useState(false);
  const [bindResult, setBindResult] = useState(null);
  const [error, setError] = useState('');

  const recInfo = METHOD_INFO[recommended];

  const handleBind = async () => {
    if (!form.protocol) { setError('Please select a protocol'); return; }
    setBinding(true);
    setError('');
    try {
      const res = await deviceAPI.bindKey(device.id, {
        protocol: form.protocol,
        generation_method: form.method,
        key_length_bits: form.length,
      });
      setBindResult(res);
      onSuccess(res);
    } catch (e) {
      setError(e?.detail || 'Failed to bind key');
    } finally {
      setBinding(false);
    }
  };

  if (bindResult) {
    const match = bindResult.match_status;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="text-center mb-4">
            <ShieldCheck size={48} className="mx-auto text-green-400 mb-2" />
            <h2 className="text-xl font-bold text-white">Key Generated & Bound!</h2>
          </div>
          <div className="space-y-2 text-sm bg-gray-800 rounded-xl p-4 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Device</span>
              <span className="text-white font-medium">{bindResult.device_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Protocol</span>
              <span className={`font-bold uppercase text-white px-2 py-0.5 rounded text-xs ${PROTOCOL_INFO[bindResult.protocol]?.color || 'bg-gray-600'}`}>
                {bindResult.protocol?.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Method</span>
              <span className="text-white">{(bindResult.generation_method || '').toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recommended</span>
              <span className="text-blue-300">{(bindResult.recommended_method || '').toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Match</span>
              <span className={`font-bold text-xs px-2 py-0.5 rounded ${match === 'optimal' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                {match === 'optimal' ? '✓ OPTIMAL' : '⚠ NON-OPTIMAL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Key Length</span>
              <span className="text-white">{bindResult.key_length_bits}-bit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Entropy Score</span>
              <span className="text-green-400 font-bold">{bindResult.randomness_score?.toFixed(1)}%</span>
            </div>
            {bindResult.shannon_entropy && (
              <div className="flex justify-between">
                <span className="text-gray-400">Shannon Entropy</span>
                <span className="text-blue-300 font-mono">{bindResult.shannon_entropy.toFixed(4)} / 8.0</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4 font-mono break-all">
            Key: {bindResult.key_hex?.slice(0, 32)}...
          </p>
          <button onClick={onClose} className="btn btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl my-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key size={20} className="text-blue-400" /> Generate & Bind Key
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Device info */}
        <div className="bg-gray-800 rounded-xl p-3 mb-4 flex items-center gap-3">
          <Cpu size={18} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold">{device.device_name}</p>
            <p className="text-xs text-gray-400 capitalize">{device.device_type} · {device.device_id}</p>
          </div>
        </div>

        {/* Recommended method highlight */}
        <div className={`rounded-xl p-3 mb-4 border-2 border-dashed ${
          recommended === 'puf' ? 'border-orange-600 bg-orange-950 bg-opacity-30' :
          recommended === 'trng' ? 'border-green-600 bg-green-950 bg-opacity-30' :
          'border-blue-600 bg-blue-950 bg-opacity-30'
        }`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Recommended for {device.device_type}</p>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-white px-2 py-0.5 rounded text-sm ${METHOD_INFO[recommended]?.color}`}>
              {recInfo?.label}
            </span>
            <span className="text-gray-300 text-sm">{recInfo?.desc}</span>
            <span className="text-xs text-green-400 ml-auto font-mono">{recInfo?.entropy}</span>
          </div>
        </div>

        {/* Method selection */}
        <div className="mb-4">
          <h3 className="font-semibold text-white mb-2 text-sm">Generation Method</h3>
          <div className="grid gap-2">
            {Object.entries(METHOD_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, method: key }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left
                  ${form.method === key ? `border-blue-500 ${info.color} bg-opacity-20` : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-white px-2 py-0.5 rounded text-xs ${info.color}`}>{info.label}</span>
                  <span className="text-gray-300 text-sm">{info.desc}</span>
                  {key === recommended && (
                    <span className="text-xs bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded">recommended</span>
                  )}
                </div>
                <span className="text-xs text-green-400 font-mono ml-2">{info.entropy}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Key length selection */}
        <div className="mb-4">
          <h3 className="font-semibold text-white mb-2 text-sm">Key Length</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LENGTH_INFO).map(([bits, info]) => (
              <button
                key={bits}
                onClick={() => setForm(f => ({ ...f, length: parseInt(bits) }))}
                className={`p-3 rounded-xl border-2 transition-all text-center
                  ${form.length === parseInt(bits) ? 'border-blue-500 bg-blue-900 bg-opacity-30' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                <p className="font-bold text-white text-sm">{info.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Protocol selection */}
        <div className="mb-4">
          <h3 className="font-semibold text-white mb-2 text-sm">Protocol</h3>
          <div className="grid gap-2">
            {Object.entries(PROTOCOL_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, protocol: key }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left
                  ${form.protocol === key ? `border-blue-500 ${info.color} bg-opacity-20` : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-white px-2 py-0.5 rounded text-xs ${info.color}`}>{info.label}</span>
                  <span className="text-gray-300 text-sm">{info.desc}</span>
                </div>
                <span className="text-xs text-gray-400">{info.latency}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-800 rounded-xl p-3 text-sm mb-4 flex gap-2 flex-wrap">
          {form.method && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${METHOD_INFO[form.method]?.color}`}>
              {form.method.toUpperCase()}
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-gray-600">{form.length}-bit</span>
          {form.protocol && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${PROTOCOL_INFO[form.protocol]?.color}`}>
              {form.protocol.toUpperCase()}
            </span>
          )}
          {form.method && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ml-auto ${
              getMatchStatus(device.device_type, form.method) === 'optimal'
                ? 'bg-green-900 text-green-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}>
              {getMatchStatus(device.device_type, form.method) === 'optimal' ? '✓ Optimal' : '⚠ Non-Optimal'}
            </span>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleBind}
          disabled={binding || !form.protocol}
          className="btn btn-primary w-full gap-2"
        >
          {binding
            ? <><RefreshCw size={16} className="animate-spin" /> Generating & Binding Key...</>
            : <><ShieldCheck size={16} /> Generate & Bind Key</>}
        </button>
      </div>
    </div>
  );
};

const DeviceCard = ({ device, onDelete, onSimulateStatus, onBindKey, onRotateKey, onRevoke }) => {
  const statusCfg = getStatusConfig(device.status);
  const StatusIcon = statusCfg.icon;
  const proto = PROTOCOL_INFO[device.protocol];

  return (
    <div className="card relative hover:shadow-lg transition-shadow duration-200">
      {/* Security badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
        ${device.is_secured ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-red-900 text-red-300 border border-red-800'}`}>
        {device.is_secured ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
        {device.is_secured ? 'SECURED' : 'NO KEY'}
      </div>

      {/* Header */}
      <div className="mb-3 pr-24">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{device.device_name}</h3>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{device.device_id}</p>
      </div>

      {/* Status + Protocol + Type */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.color} ${device.status === 'online' ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>
        {device.protocol && proto && (
          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${proto.color}`}>
            {proto.label}
          </span>
        )}
        <span className="text-xs text-gray-500 capitalize bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
          {device.device_type}
        </span>
      </div>

      {/* Specs */}
      {(device.cpu_type || device.memory_kb) && (
        <div className="flex gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
          {device.cpu_type && (
            <span className="flex items-center gap-1"><Cpu size={11} /> {device.cpu_type}</span>
          )}
          {device.memory_kb && (
            <span className="flex items-center gap-1"><MemoryStick size={11} /> {device.memory_kb}KB RAM</span>
          )}
        </div>
      )}

      {/* Key security info (if secured) */}
      {device.is_secured && device.bound_key_id && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3 text-xs space-y-1">
          <div className="flex items-center gap-1 text-green-400">
            <Key size={11} /> <span className="font-semibold">Key Bound</span>
            <span className="text-gray-400 ml-1">ID: {device.bound_key_id}</span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 mb-3">Last seen: {device.last_seen ? formatLastSeen(device.last_seen) : 'Never'}</div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!device.is_secured ? (
          <button onClick={onBindKey} className="btn btn-primary flex-1 text-xs py-1.5 gap-1">
            <Key size={14} /> Generate & Bind Key
          </button>
        ) : (
          <>
            <button onClick={onRotateKey} className="btn text-xs py-1.5 gap-1 flex-1 border border-blue-600 text-blue-400 hover:bg-blue-900 hover:bg-opacity-20">
              <RefreshCw size={14} /> Rotate Key
            </button>
            <button onClick={onRevoke} className="btn text-xs py-1.5 gap-1 border border-red-700 text-red-400 hover:bg-red-900 hover:bg-opacity-20">
              <XCircle size={14} />
            </button>
          </>
        )}
        <button onClick={onSimulateStatus} className="btn btn-ghost text-xs py-1.5 px-2" title="Cycle status">
          <Activity size={14} />
        </button>
        <button onClick={onDelete} className="btn text-xs py-1.5 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const DevicesPage = () => {
  const { t } = useLang();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bindDevice, setBindDevice] = useState(null);
  const [rotatingId, setRotatingId] = useState(null);
  const [formData, setFormData] = useState({
    device_id: '', device_name: '', device_type: 'sensor',
    manufacturer: '', model: '', cpu_type: '', memory_kb: '', storage_kb: '',
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
    } catch (e) {
      console.error(e);
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
      setDevices(prev => [...prev, newDevice]);
      setFormData({ device_id: '', device_name: '', device_type: 'sensor', manufacturer: '', model: '', cpu_type: '', memory_kb: '', storage_kb: '' });
      setShowForm(false);
    } catch (e) {
      alert(e?.detail || 'Failed to create device');
    }
  };

  const handleDelete = async (deviceId) => {
    if (!confirm(t('devices.deleteConfirm'))) return;
    try {
      await deviceAPI.delete(deviceId);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateStatus = async (device) => {
    const idx = STATUS_CYCLE.indexOf(device.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    try {
      await deviceAPI.updateStatus(device.id, next);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: next, last_seen: new Date().toISOString() } : d));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotateKey = async (device) => {
    if (!confirm(`Rotate key for ${device.device_name}? A new key will be generated.`)) return;
    setRotatingId(device.id);
    try {
      await deviceAPI.rotateKey(device.id);
      await loadDevices();
    } catch (e) {
      alert(e?.detail || 'Rotation failed');
    } finally {
      setRotatingId(null);
    }
  };

  const handleRevokeKey = async (device) => {
    if (!confirm(`Revoke key for ${device.device_name}? The device will become unsecured.`)) return;
    try {
      await deviceAPI.revokeKey(device.id);
      await loadDevices();
    } catch (e) {
      alert(e?.detail || 'Revoke failed');
    }
  };

  const handleBindSuccess = async () => {
    await loadDevices();
    setBindDevice(null);
  };

  const securedCount = devices.filter(d => d.is_secured).length;
  const unsecuredCount = devices.length - securedCount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('devices.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('devices.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary gap-2">
          <Plus size={18} /> {t('devices.addBtn')}
        </button>
      </div>

      {/* Security summary */}
      {devices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-blue-400">{devices.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total Devices</p>
          </div>
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-green-400">{securedCount}</p>
            <p className="text-sm text-gray-500 mt-1">
              <ShieldCheck size={14} className="inline mr-1 text-green-400" />
              Secured
            </p>
          </div>
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-red-400">{unsecuredCount}</p>
            <p className="text-sm text-gray-500 mt-1">
              <ShieldOff size={14} className="inline mr-1 text-red-400" />
              No Key
            </p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('devices.createTitle')}</h2>
          <form onSubmit={handleCreateDevice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.deviceId')}</label>
              <input type="text" value={formData.device_id} onChange={e => setFormData({ ...formData, device_id: e.target.value })} className="input" placeholder={t('devices.deviceIdPlaceholder')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.deviceName')}</label>
              <input type="text" value={formData.device_name} onChange={e => setFormData({ ...formData, device_name: e.target.value })} className="input" placeholder={t('devices.deviceNamePlaceholder')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.type')}</label>
              <select value={formData.device_type} onChange={e => setFormData({ ...formData, device_type: e.target.value })} className="input">
                <option value="sensor">Sensor</option>
                <option value="actuator">Actuator</option>
                <option value="gateway">Gateway</option>
                <option value="controller">Controller</option>
                <option value="camera">Camera</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.cpuType')}</label>
              <input type="text" value={formData.cpu_type} onChange={e => setFormData({ ...formData, cpu_type: e.target.value })} className="input" placeholder="e.g., ARM Cortex-M0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.memory')}</label>
              <input type="number" value={formData.memory_kb} onChange={e => setFormData({ ...formData, memory_kb: e.target.value })} className="input" placeholder="e.g., 32" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('devices.manufacturer')}</label>
              <input type="text" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} className="input" placeholder={t('devices.manufacturerPlaceholder')} />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="btn btn-primary flex-1">{t('devices.createBtn')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">{t('devices.loading')}</div>
      ) : devices.length === 0 ? (
        <div className="card text-center py-16">
          <ShieldOff size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-500 text-lg mb-2">{t('devices.empty')}</p>
          <p className="text-gray-400 text-sm">Add your first IoT device and generate a security key</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={rotatingId === device.id ? { ...device } : device}
              onDelete={() => handleDelete(device.id)}
              onSimulateStatus={() => handleSimulateStatus(device)}
              onBindKey={() => setBindDevice(device)}
              onRotateKey={() => handleRotateKey(device)}
              onRevoke={() => handleRevokeKey(device)}
            />
          ))}
        </div>
      )}

      {bindDevice && (
        <BindKeyModal
          device={bindDevice}
          onClose={() => setBindDevice(null)}
          onSuccess={handleBindSuccess}
        />
      )}
    </div>
  );
};

export default DevicesPage;
