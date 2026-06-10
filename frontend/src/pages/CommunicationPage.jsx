import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, Send, ShieldCheck, ShieldOff, Clock, Lock, ArrowRight,
  Cpu, Activity, CheckCircle, AlertCircle, RefreshCw, PackageOpen,
  PackageCheck, Wifi, Database
} from 'lucide-react';
import { deviceAPI, communicationAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const PROTOCOL_COLORS = {
  mqtt: 'bg-blue-600',
  coap: 'bg-emerald-600',
  tls:  'bg-violet-600',
};
const PROTOCOL_LABELS = { mqtt: 'MQTT', coap: 'CoAP', tls: 'TLS' };

const DATA_PRESETS = {
  sensor:     'temperature:36.5,humidity:65,timestamp:2026-06-03',
  actuator:   'command:open,valve:3,pressure:2.4',
  camera:     'motion:detected,zone:entrance,confidence:0.95',
  gateway:    'devices_connected:5,uptime:3600,alerts:0',
  controller: 'mode:auto,setpoint:22.0,status:active',
};

const getCommSteps = (result, t) => [
  { id: 'packet',   icon: PackageOpen,   label: t('comm.step.prepare') || 'Preparing packet' },
  { id: 'encrypt',  icon: Lock,          label: `${t('comm.step.encrypt') || 'Encrypting with'} ${result ? (result.algorithm || 'key').toUpperCase() : 'key'}` },
  { id: 'send',     icon: Wifi,          label: `${t('comm.step.send') || 'Sending via'} ${result ? (result.protocol || 'MQTT').toUpperCase() : 'protocol'}` },
  { id: 'receive',  icon: Database,      label: t('comm.step.receive') || 'Received at target' },
  { id: 'decrypt',  icon: PackageCheck,  label: t('comm.step.decrypt') || 'Decrypting data' },
  { id: 'done',     icon: CheckCircle,   label: t('comm.step.done') || 'Data delivered' },
];

const DeviceSelector = ({ device, label, selected, onSelect, devices, exclude, onPick, showPicker, onToggle }) => {
  const secured = device?.is_secured;
  return (
    <div className="flex-1 relative">
      <div
        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
          ${selected ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
        onClick={onToggle}
      >
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        {device ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className="text-blue-400 flex-shrink-0" />
              <span className="font-bold text-white truncate">{device.device_name}</span>
            </div>
            <p className="text-xs text-gray-500 capitalize mb-2">{device.device_type}</p>
            <div className="flex items-center gap-2">
              {secured ? (
                <>
                  <ShieldCheck size={13} className="text-green-400" />
                  <span className="text-xs text-green-400 font-semibold">SECURED</span>
                  {device.protocol && (
                    <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${PROTOCOL_COLORS[device.protocol]} text-white`}>
                      {device.protocol}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <ShieldOff size={13} className="text-red-400" />
                  <span className="text-xs text-red-400">NO KEY</span>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm py-4 text-center">Click to select device</p>
        )}
        {selected && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
      </div>
      {showPicker && (
        <div className="absolute z-20 top-full left-0 mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {devices.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No devices available</p>
          ) : devices.map(d => (
            <div
              key={d.id}
              className={`flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer ${d.id === exclude ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => onPick(d.id)}
            >
              {d.is_secured ? <ShieldCheck size={13} className="text-green-400 flex-shrink-0" /> : <ShieldOff size={13} className="text-red-400 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.device_name}</p>
                <p className="text-xs text-gray-400 truncate">{d.device_type} · {(d.protocol || '').toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CommunicationPage = () => {
  const { t } = useLang();
  const [devices, setDevices] = useState([]);
  const [sourceId, setSourceId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [message, setMessage] = useState('temperature:36.5,humidity:65,timestamp:2026-06-03');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
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
  const COMM_STEPS = getCommSteps(result, t);

  // Auto-update preset when source device type changes
  useEffect(() => {
    if (sourceDevice?.device_type) {
      const preset = DATA_PRESETS[sourceDevice.device_type.toLowerCase()];
      if (preset) setMessage(preset);
    }
  }, [sourceId]);

  const animateSteps = () => {
    let step = 0;
    setActiveStep(0);
    const interval = setInterval(() => {
      step++;
      if (step < COMM_STEPS.length) {
        setActiveStep(step);
      } else {
        clearInterval(interval);
      }
    }, 240);
    return interval;
  };

  const animatePacket = (duration = 1400) => {
    setPacketPct(0);
    const start = performance.now();
    const step = (now) => {
      const pct = Math.min(100, ((now - start) / duration) * 100);
      setPacketPct(pct);
      if (pct < 100) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const handleSimulate = async () => {
    setError('');
    if (!sourceId || !targetId) { setError('Please select both devices'); return; }
    if (sourceId === targetId) { setError('Source and target must be different devices'); return; }
    if (!sourceDevice?.is_secured) { setError('Source device has no bound key'); return; }
    if (!message.trim()) { setError('Message cannot be empty'); return; }

    setSimulating(true);
    setResult(null);
    setActiveStep(-1);

    animatePacket(1400);
    const stepInterval = animateSteps();

    try {
      const res = await communicationAPI.simulate({
        source_device_id: sourceId,
        target_device_id: targetId,
        message: message.trim(),
      });
      clearInterval(stepInterval);
      setActiveStep(COMM_STEPS.length - 1);
      setResult(res);
      const histData = await communicationAPI.getHistory().catch(() => []);
      setHistory(histData);
    } catch (e) {
      clearInterval(stepInterval);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Radio size={28} className="text-blue-400" /> Secure Communication
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Send IoT data between devices using bound keys</p>
      </div>

      {/* Device selector + packet animation */}
      <div className="card bg-gray-900 border border-gray-700">
        <div className="flex items-stretch gap-4">
          <DeviceSelector
            device={sourceDevice}
            label={t('comm.source') || 'Source Device'}
            selected={!!sourceDevice}
            devices={devices}
            exclude={targetId}
            onPick={(id) => { setSourceId(id); setShowSourcePicker(false); }}
            showPicker={showSourcePicker}
            onToggle={() => { setShowSourcePicker(v => !v); setShowTargetPicker(false); }}
          />

          {/* Transmission channel */}
          <div className="flex flex-col items-center justify-center gap-2 px-2 min-w-[100px]">
            {sourceDevice?.protocol && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${protocolColor(sourceDevice.protocol)}`}>
                {protocolLabel(sourceDevice.protocol)}
              </span>
            )}
            <div className="relative w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${packetPct}%`,
                  background: simulating ? 'linear-gradient(90deg,#3b82f6,#8b5cf6)' : result ? '#10b981' : '#374151',
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
            <ArrowRight size={18} className={`${simulating ? 'text-blue-400 animate-bounce' : result ? 'text-green-400' : 'text-gray-600'}`} />
          </div>

          <DeviceSelector
            device={targetDevice}
            label={t('comm.target') || 'Target Device'}
            selected={!!targetDevice}
            devices={devices}
            exclude={sourceId}
            onPick={(id) => { setTargetId(id); setShowTargetPicker(false); }}
            showPicker={showTargetPicker}
            onToggle={() => { setShowTargetPicker(v => !v); setShowSourcePicker(false); }}
          />
        </div>

        {/* Message + presets */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">IoT Data Payload</label>
            {sourceDevice?.device_type && (
              <span className="text-xs text-gray-500">
                Preset: <span className="text-blue-400 capitalize">{sourceDevice.device_type}</span>
              </span>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(DATA_PRESETS).map(([type, preset]) => (
              <button
                key={type}
                onClick={() => setMessage(preset)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                  message === preset
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-blue-300'
                    : 'border-gray-600 text-gray-400 hover:border-gray-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter IoT data payload..."
            rows={2}
            className="input w-full resize-none font-mono text-sm"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            onClick={handleSimulate}
            disabled={simulating || !sourceId || !targetId || !message.trim()}
            className="btn btn-primary w-full gap-2 text-base py-3"
          >
            {simulating
              ? <><RefreshCw size={18} className="animate-spin" /> Transmitting...</>
              : <><Send size={18} /> Send Secure Message</>}
          </button>
        </div>
      </div>

      {/* Animated steps */}
      {(simulating || (result && activeStep >= 0)) && (
        <div className="card bg-gray-900 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Transmission Steps</h3>
          <div className="flex flex-wrap gap-3">
            {COMM_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const done = activeStep > i;
              const active = activeStep === i;
              return (
                <div key={step.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  done ? 'bg-green-900 bg-opacity-30 text-green-400 border border-green-700'
                  : active ? 'bg-blue-900 bg-opacity-40 text-blue-300 border border-blue-600 animate-pulse'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}>
                  <StepIcon size={14} />
                  <span>{step.label}</span>
                  {done && <CheckCircle size={12} className="text-green-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card bg-gray-900 border border-green-700 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle size={22} className="text-green-400" /> Transmission Results
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-900 text-green-300 border border-green-700">
              SUCCESS
            </span>
          </div>

          {/* Timing metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Encrypt Time', value: `${result.encryption_time_ms?.toFixed(3)} ms`, color: 'border-blue-700' },
              { label: 'Transit Time', value: `${result.transmission_time_ms?.toFixed(1)} ms`, color: 'border-purple-700' },
              { label: 'Decrypt Time', value: `${result.decryption_time_ms?.toFixed(3)} ms`, color: 'border-emerald-700' },
              { label: 'Total Latency', value: `${result.total_time_ms?.toFixed(2)} ms`, color: 'border-orange-700' },
            ].map(m => (
              <div key={m.label} className={`flex flex-col items-center p-3 rounded-lg border ${m.color}`}>
                <span className="text-xs text-gray-400 mb-1">{m.label}</span>
                <span className="text-lg font-bold text-white">{m.value}</span>
              </div>
            ))}
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className={`px-2 py-1 rounded font-bold text-white text-xs uppercase ${protocolColor(result.protocol)}`}>
              {protocolLabel(result.protocol)}
            </span>
            {result.algorithm && (
              <span className={`px-2 py-1 rounded font-bold text-white text-xs uppercase ${
                result.algorithm === 'present' ? 'bg-purple-700'
                : result.algorithm === 'speck' ? 'bg-blue-700'
                : 'bg-green-700'
              }`}>
                {result.algorithm.toUpperCase()}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              {t('comm.algorithm') || 'Algorithm'}: {result.algorithm?.toUpperCase() || 'N/A'}
            </span>
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              Method: {result.key_method?.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
              Key: {result.key_length_bits}-bit
            </span>
          </div>

          {/* Messages */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Original Data</p>
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs text-gray-200 break-all">
                {result.original_message}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Lock size={11} /> Encrypted (hex)
              </p>
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs text-blue-300 break-all max-h-24 overflow-y-auto">
                {result.encrypted_message}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle size={11} className="text-green-400" /> Decrypted
              </p>
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-green-300">
                {result.decrypted_message}
              </div>
            </div>
          </div>

          {/* Device path */}
          <div className="flex items-center gap-3 text-sm text-gray-400 border-t border-gray-700 pt-3">
            <span className="font-medium text-white">{result.source_device_name}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs text-white ${protocolColor(result.protocol)}`}>
              {protocolLabel(result.protocol)}
            </span>
            <ArrowRight size={14} />
            <span className="font-medium text-white">{result.target_device_name}</span>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={20} /> Recent Communications
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Source</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Target</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Protocol</th>
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

      {devices.length === 0 && (
        <div className="card text-center py-12 border-dashed border-2 border-gray-700">
          <ShieldOff size={40} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-400">{t('comm.noSecuredDevices') || 'No secured devices. Go to Devices and bind keys first.'}</p>
          <Link to="/devices" className="mt-3 inline-block text-blue-400 hover:underline text-sm">
            {t('devices.title') || 'Go to Devices'} →
          </Link>
        </div>
      )}
    </div>
  );
};

export default CommunicationPage;
