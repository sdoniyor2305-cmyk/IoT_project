import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Send, ShieldCheck, ShieldOff, Clock, Zap, Lock, ArrowRight,
  Cpu, Activity, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { deviceAPI, communicationAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const PROTOCOL_COLORS = {
  mqtt: 'bg-blue-600',
  coap: 'bg-emerald-600',
  tls:  'bg-violet-600',
};
const PROTOCOL_TEXT = {
  mqtt: 'text-blue-400',
  coap: 'text-emerald-400',
  tls:  'text-violet-400',
};
const PROTOCOL_LABELS = { mqtt: 'MQTT', coap: 'CoAP', tls: 'TLS' };

const DeviceCard = ({ device, label, selected, onSelect, side }) => {
  const secured = device?.is_secured;
  return (
    <div
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 min-w-0 flex-1
        ${selected
          ? 'border-blue-500 bg-blue-900 bg-opacity-20'
          : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
      onClick={onSelect}
    >
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
      {device ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={18} className="text-blue-400 flex-shrink-0" />
            <span className="font-bold text-white truncate">{device.device_name}</span>
          </div>
          <p className="text-xs text-gray-400 mb-1 truncate">{device.device_id}</p>
          <p className="text-xs text-gray-500 capitalize mb-2">{device.device_type}</p>
          <div className="flex items-center gap-2">
            {secured ? (
              <>
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-xs text-green-400 font-semibold">SECURED</span>
                {device.protocol && (
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${PROTOCOL_COLORS[device.protocol]} text-white`}>
                    {device.protocol}
                  </span>
                )}
              </>
            ) : (
              <>
                <ShieldOff size={14} className="text-red-400" />
                <span className="text-xs text-red-400">UNSECURED</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Click to select device</p>
        </div>
      )}
      {selected && (
        <span className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse`} />
      )}
    </div>
  );
};

const MetricBadge = ({ label, value, color }) => (
  <div className={`flex flex-col items-center p-3 rounded-lg border ${color}`}>
    <span className="text-xs text-gray-400 mb-1">{label}</span>
    <span className="text-lg font-bold text-white">{value}</span>
  </div>
);

const CommunicationPage = () => {
  const { t } = useLang();
  const [devices, setDevices] = useState([]);
  const [sourceId, setSourceId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [message, setMessage] = useState('Hello from IoT Device!');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [packetPct, setPacketPct] = useState(0);
  const [error, setError] = useState('');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const animRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [devData, histData] = await Promise.all([
        deviceAPI.list(),
        communicationAPI.getHistory().catch(() => []),
      ]);
      setDevices(devData);
      setHistory(histData);
    } catch (e) {
      console.error(e);
    }
  };

  const sourceDevice = devices.find(d => d.id === sourceId);
  const targetDevice = devices.find(d => d.id === targetId);
  const securedDevices = devices.filter(d => d.is_secured);

  const animatePacket = (duration = 1200) => {
    setPacketPct(0);
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setPacketPct(pct);
      if (pct < 100) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const handleSimulate = async () => {
    setError('');
    if (!sourceId || !targetId) { setError('Please select both devices'); return; }
    if (sourceId === targetId) { setError('Source and target must be different devices'); return; }
    if (!sourceDevice?.is_secured) { setError(t('comm.sourceNotSecured')); return; }
    if (!message.trim()) { setError('Message cannot be empty'); return; }

    setSimulating(true);
    setResult(null);
    animatePacket(1400);

    try {
      const res = await communicationAPI.simulate({
        source_device_id: sourceId,
        target_device_id: targetId,
        message: message.trim(),
      });
      setResult(res);
      const histData = await communicationAPI.getHistory().catch(() => []);
      setHistory(histData);
    } catch (e) {
      setError(e?.detail || 'Simulation failed');
    } finally {
      setSimulating(false);
      setPacketPct(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  };

  const protocolColor = (p) => PROTOCOL_COLORS[p?.toLowerCase()] || 'bg-gray-600';
  const protocolLabel = (p) => PROTOCOL_LABELS[p?.toLowerCase()] || (p || '').toUpperCase();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Radio size={30} className="text-blue-400" />
          {t('comm.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('comm.subtitle')}</p>
      </div>

      {/* Device Selector + Diagram */}
      <div className="card bg-gray-900 border border-gray-700">
        <div className="flex items-stretch gap-4">
          {/* Source picker */}
          <div className="flex-1 relative">
            <DeviceCard
              device={sourceDevice}
              label={t('comm.source')}
              selected={!!sourceDevice}
              onSelect={() => setShowSourcePicker(v => !v)}
              side="source"
            />
            {showSourcePicker && (
              <div className="absolute z-20 top-full left-0 mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {securedDevices.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">{t('comm.noSecuredDevices')}</p>
                ) : (
                  securedDevices.map(d => (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer ${d.id === targetId ? 'opacity-40 pointer-events-none' : ''}`}
                      onClick={() => { setSourceId(d.id); setShowSourcePicker(false); }}
                    >
                      <ShieldCheck size={14} className="text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{d.device_name}</p>
                        <p className="text-xs text-gray-400 truncate">{d.device_id} · {(d.protocol || '').toUpperCase()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Transmission diagram */}
          <div className="flex flex-col items-center justify-center gap-2 px-2 min-w-[120px]">
            {sourceDevice?.protocol && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${protocolColor(sourceDevice.protocol)}`}>
                {protocolLabel(sourceDevice.protocol)}
              </span>
            )}
            <div className="relative w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-none"
                style={{
                  width: `${packetPct}%`,
                  background: simulating
                    ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                    : result
                    ? '#10b981'
                    : '#374151',
                  transition: simulating ? 'none' : 'background 0.5s',
                }}
              />
              {simulating && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg"
                  style={{ left: `calc(${packetPct}% - 6px)` }}
                />
              )}
            </div>
            <ArrowRight size={20} className={`${simulating ? 'text-blue-400 animate-bounce' : result ? 'text-green-400' : 'text-gray-600'} transition-colors`} />
            {result && !simulating && (
              <CheckCircle size={16} className="text-green-400" />
            )}
          </div>

          {/* Target picker */}
          <div className="flex-1 relative">
            <DeviceCard
              device={targetDevice}
              label={t('comm.target')}
              selected={!!targetDevice}
              onSelect={() => setShowTargetPicker(v => !v)}
              side="target"
            />
            {showTargetPicker && (
              <div className="absolute z-20 top-full left-0 mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {devices.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No devices</p>
                ) : (
                  devices.map(d => (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer ${d.id === sourceId ? 'opacity-40 pointer-events-none' : ''}`}
                      onClick={() => { setTargetId(d.id); setShowTargetPicker(false); }}
                    >
                      {d.is_secured ? <ShieldCheck size={14} className="text-green-400 flex-shrink-0" /> : <ShieldOff size={14} className="text-red-400 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{d.device_name}</p>
                        <p className="text-xs text-gray-400 truncate">{d.device_id}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message + Send */}
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-300">{t('comm.message')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('comm.messagePlaceholder')}
            rows={2}
            className="input w-full resize-none font-mono"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <button
            onClick={handleSimulate}
            disabled={simulating || !sourceId || !targetId || !message.trim()}
            className="btn btn-primary w-full gap-2 text-base py-3"
          >
            {simulating ? (
              <><RefreshCw size={18} className="animate-spin" /> {t('comm.simulating')}</>
            ) : (
              <><Send size={18} /> {t('comm.simulate')}</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="card bg-gray-900 border border-green-700 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle size={22} className="text-green-400" />
              {t('comm.result')}
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-900 text-green-300 border border-green-700">
              {t('comm.success')}
            </span>
          </div>

          {/* Timing metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBadge label={t('comm.encTime')} value={`${result.encryption_time_ms?.toFixed(3)} ms`} color="border-blue-700" />
            <MetricBadge label={t('comm.transTime')} value={`${result.transmission_time_ms?.toFixed(1)} ms`} color="border-purple-700" />
            <MetricBadge label={t('comm.decTime')} value={`${result.decryption_time_ms?.toFixed(3)} ms`} color="border-emerald-700" />
            <MetricBadge label={t('comm.totalTime')} value={`${result.total_time_ms?.toFixed(2)} ms`} color="border-orange-700" />
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className={`px-2 py-1 rounded font-bold text-white text-xs uppercase ${protocolColor(result.protocol)}`}>
              {protocolLabel(result.protocol)}
            </span>
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              Algorithm: {result.algorithm}
            </span>
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              Method: {result.key_method?.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              Key: {result.key_length_bits}-bit
            </span>
          </div>

          {/* Messages */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Lock size={12} /> {t('comm.encrypted')}
              </p>
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs text-blue-300 break-all max-h-24 overflow-y-auto">
                {result.encrypted_message}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle size={12} className="text-green-400" /> {t('comm.decrypted')}
              </p>
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-green-300">
                {result.decrypted_message}
              </div>
            </div>
          </div>

          {/* Devices */}
          <div className="flex items-center gap-3 text-sm text-gray-400 border-t border-gray-700 pt-3">
            <span className="font-medium text-white">{result.source_device_name}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs text-white ${protocolColor(result.protocol)}`}>
              {protocolLabel(result.protocol)}
            </span>
            <ArrowRight size={16} />
            <span className="font-medium text-white">{result.target_device_name}</span>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            {t('comm.history')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Source</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Target</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Protocol</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Algorithm</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Method</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    <Clock size={12} className="inline mr-1" />Latency
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{h.source_device_name}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{h.target_device_name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${protocolColor(h.protocol)}`}>
                        {protocolLabel(h.protocol)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{h.algorithm}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{(h.key_method || '').toUpperCase()}</td>
                    <td className="py-2 px-3 font-mono text-gray-600 dark:text-gray-400">
                      {h.transmission_time_ms?.toFixed(1)} ms
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-xs">
                      {new Date(h.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {securedDevices.length === 0 && (
        <div className="card text-center py-12 border-dashed border-2 border-gray-700">
          <ShieldOff size={40} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-400">{t('comm.noSecuredDevices')}</p>
          <a href="/devices" className="mt-3 inline-block text-blue-400 hover:underline text-sm">
            Go to Devices to bind keys →
          </a>
        </div>
      )}
    </div>
  );
};

export default CommunicationPage;
