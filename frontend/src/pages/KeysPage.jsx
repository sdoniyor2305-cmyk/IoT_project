import React, { useState, useEffect } from 'react';
import { Trash2, Download, Eye, EyeOff, ShieldCheck, CheckCircle, AlertTriangle, Filter } from 'lucide-react';
import { keyAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const PROTOCOL_COLORS = {
  mqtt: 'bg-blue-600', coap: 'bg-emerald-600', tls: 'bg-violet-600',
};

const METHOD_COLORS = {
  drbg: 'bg-blue-700', trng: 'bg-green-700', puf: 'bg-orange-700',
};

const ALGO_COLORS = {
  present: 'bg-purple-700', speck: 'bg-blue-700', ascon: 'bg-green-700',
};

const DEVICE_RECS = {
  sensor:     { algorithm: 'present', method: 'puf' },
  rfid:       { algorithm: 'present', method: 'puf' },
  actuator:   { algorithm: 'speck',   method: 'puf' },
  camera:     { algorithm: 'ascon',   method: 'trng' },
  gateway:    { algorithm: 'ascon',   method: 'drbg' },
  controller: { algorithm: 'ascon',   method: 'drbg' },
};

const getRecommendation = (deviceType) => {
  const t = (deviceType || '').toLowerCase();
  for (const [key, rec] of Object.entries(DEVICE_RECS)) {
    if (t.includes(key) || t === key) return rec;
  }
  return DEVICE_RECS.gateway;
};

const getMatchStatus = (deviceType, method, algorithm) => {
  if (!deviceType || !method) return null;
  const rec = getRecommendation(deviceType);
  const methodOk = method.toLowerCase() === rec.method;
  const algoOk = !algorithm || algorithm.toLowerCase() === rec.algorithm;
  return (methodOk && algoOk) ? 'optimal' : 'non-optimal';
};

const KeysPage = () => {
  const { t } = useLang();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeyId, setVisibleKeyId] = useState(null);
  const [keyValues, setKeyValues] = useState({});
  const [filterAlgo, setFilterAlgo] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await keyAPI.list();
      setKeys(data);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKeyValue = async (keyId) => {
    if (visibleKeyId === keyId) {
      setVisibleKeyId(null);
      return;
    }
    setVisibleKeyId(keyId);
    if (!keyValues[keyId]) {
      try {
        const detail = await keyAPI.get(keyId);
        setKeyValues(prev => ({ ...prev, [keyId]: detail.key_value }));
      } catch (e) {
        setKeyValues(prev => ({ ...prev, [keyId]: '(failed to load)' }));
      }
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (confirm(t('keys.deleteConfirm'))) {
      try {
        await keyAPI.delete(keyId);
        setKeys(keys.filter(k => k.id !== keyId));
      } catch (error) {
        console.error('Failed to delete key:', error);
      }
    }
  };

  const handleExportKey = async (keyId) => {
    try {
      const exportedKey = await keyAPI.export(keyId);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportedKey.key_value));
      element.setAttribute('download', `key_${exportedKey.key_id}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Failed to export key:', error);
    }
  };

  const activeKeys = keys.filter(k => k.is_active);
  const rotatedKeys = keys.filter(k => !k.is_active);

  const filteredKeys = keys.filter(k => {
    const algoMatch = !filterAlgo || (k.algorithm_used || '').toLowerCase() === filterAlgo;
    const methodMatch = !filterMethod || (k.generation_method || '').toLowerCase() === filterMethod;
    return algoMatch && methodMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('keys.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('keys.subtitle')}</p>
      </div>

      {/* Summary stats */}
      {keys.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-blue-400">{keys.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('keys.total') || 'Total'}</p>
          </div>
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-green-400">{activeKeys.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('keys.active')}</p>
          </div>
          <div className="card-hover text-center py-4">
            <p className="text-2xl font-bold text-gray-400">{rotatedKeys.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('keys.rotated') || 'Rotated'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {keys.length > 0 && (
        <div className="flex gap-3 items-center flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterAlgo}
            onChange={e => setFilterAlgo(e.target.value)}
            className="input text-sm py-1.5 px-3 w-auto"
          >
            <option value="">{t('keys.filterAlgo') || 'All Algorithms'}</option>
            <option value="present">PRESENT</option>
            <option value="speck">SPECK</option>
            <option value="ascon">Ascon</option>
          </select>
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="input text-sm py-1.5 px-3 w-auto"
          >
            <option value="">{t('keys.filterMethod') || 'All Methods'}</option>
            <option value="drbg">DRBG</option>
            <option value="trng">TRNG</option>
            <option value="puf">PUF</option>
          </select>
          {(filterAlgo || filterMethod) && (
            <button
              onClick={() => { setFilterAlgo(''); setFilterMethod(''); }}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              Clear
            </button>
          )}
          {(filterAlgo || filterMethod) && (
            <span className="text-xs text-gray-500">{filteredKeys.length} / {keys.length} keys</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('keys.loading')}</div>
      ) : keys.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">{t('keys.empty')}</p>
          <p className="text-gray-400 text-sm">Go to Devices and use "Generate & Bind Key" to create keys.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Key ID</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.deviceType') || 'Device'}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.algorithm') || 'Algorithm'}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.method') || 'Method'}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.matchStatus') || 'Match'}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.protocol') || 'Protocol'}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Length</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Entropy</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.status')}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('keys.created')}</th>
                <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => {
                const matchStatus = getMatchStatus(key.device_type, key.generation_method, key.algorithm_used);
                const algoKey = (key.algorithm_used || '').toLowerCase();
                return (
                  <tr key={key.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {/* Key ID */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {key.key_id.slice(0, 14)}...
                      </div>
                      {visibleKeyId === key.id && (
                        <div className="mt-1 font-mono text-xs text-blue-400 break-all max-w-xs">
                          {keyValues[key.id] || 'loading...'}
                        </div>
                      )}
                    </td>

                    {/* Bound device */}
                    <td className="py-3 px-3">
                      {key.device_name ? (
                        <div>
                          <div className="flex items-center gap-1 text-gray-900 dark:text-white font-medium text-xs">
                            <ShieldCheck size={11} className="text-green-400" />
                            {key.device_name}
                          </div>
                          {key.device_type && (
                            <span className="text-xs text-gray-400 capitalize">{key.device_type}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Unbound</span>
                      )}
                    </td>

                    {/* Algorithm */}
                    <td className="py-3 px-3">
                      {algoKey ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${ALGO_COLORS[algoKey] || 'bg-gray-600'}`}>
                          {algoKey === 'present' ? 'PRESENT' : algoKey === 'speck' ? 'SPECK' : algoKey === 'ascon' ? 'Ascon' : algoKey.toUpperCase()}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${METHOD_COLORS[key.generation_method?.toLowerCase()] || 'bg-gray-600'}`}>
                        {key.generation_method?.toUpperCase() || '—'}
                      </span>
                    </td>

                    {/* Match status */}
                    <td className="py-3 px-3">
                      {matchStatus === 'optimal' ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                          <CheckCircle size={11} /> {t('keys.optimal') || 'Optimal'}
                        </span>
                      ) : matchStatus === 'non-optimal' ? (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                          <AlertTriangle size={11} /> {t('keys.nonOptimal') || 'Non-Optimal'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Protocol */}
                    <td className="py-3 px-3">
                      {key.bound_protocol ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${PROTOCOL_COLORS[key.bound_protocol] || 'bg-gray-600'}`}>
                          {key.bound_protocol.toUpperCase()}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Key length */}
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                      {key.key_length_bits}-bit
                    </td>

                    {/* Entropy score */}
                    <td className="py-3 px-3">
                      <div className="text-xs">
                        <span className={`font-semibold ${(key.randomness_score || 0) >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {key.randomness_score?.toFixed(1) || 'N/A'}%
                        </span>
                        {key.shannon_entropy && (
                          <div className="text-gray-500 font-mono">{key.shannon_entropy.toFixed(2)}/8</div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {key.is_active ? (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900 text-green-300">{t('keys.active')}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-700 text-gray-400">Rotated</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleKeyValue(key.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                          title="Show/hide key value"
                        >
                          {visibleKeyId === key.id ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleExportKey(key.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                          title="Export key"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500"
                          title="Delete key"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KeysPage;
