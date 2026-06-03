import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { keyAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const KeysPage = () => {
  const { t } = useLang();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visibleKeyId, setVisibleKeyId] = useState(null);
  const [formData, setFormData] = useState({
    key_length_bits: 128,
    generation_method: 'drbg',
    algorithm: 'AES',
  });

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

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    try {
      const newKey = await keyAPI.generate(formData);
      setKeys([newKey, ...keys]);
      setFormData({ key_length_bits: 128, generation_method: 'drbg', algorithm: 'AES' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to generate key:', error);
      alert(t('keys.failed') + (error.message || 'Unknown error'));
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('keys.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('keys.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary gap-2">
          <Plus size={20} /> {t('keys.generateBtn')}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('keys.generateNew')}</h2>
          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('keys.keyLength')}
                </label>
                <select
                  value={formData.key_length_bits}
                  onChange={(e) => setFormData({ ...formData, key_length_bits: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={64}>64-bit</option>
                  <option value={128}>128-bit</option>
                  <option value={256}>256-bit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('keys.genMethod')}
                </label>
                <select
                  value={formData.generation_method}
                  onChange={(e) => setFormData({ ...formData, generation_method: e.target.value })}
                  className="input"
                >
                  <option value="drbg">DRBG</option>
                  <option value="trng">TRNG</option>
                  <option value="puf">PUF</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.algorithm')}
                </label>
                <select
                  value={formData.algorithm}
                  onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                  className="input"
                >
                  <option value="AES">AES</option>
                  <option value="ASCON">ASCON</option>
                  <option value="SPECK">SPECK</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary flex-1">{t('keys.generate')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('keys.loading')}</div>
      ) : keys.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('keys.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {keys.map((key) => (
            <div key={key.id} className="card-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{key.key_id}</h3>
                  <p className="text-sm text-gray-500">{key.algorithm_used} • {key.key_length_bits}-bit</p>
                </div>
                <span className="badge badge-info">{key.generation_method.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">{t('keys.randomness')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {key.randomness_score?.toFixed(1) || 'N/A'}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('keys.shannonEntropy')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {key.shannon_entropy?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('keys.status')}</p>
                  <p className="font-semibold">
                    <span className="badge badge-success">{t('keys.active')}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('keys.created')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-xs">
                    {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4 overflow-x-auto">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                  {visibleKeyId === key.id ? key.key_value : '•'.repeat(64)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setVisibleKeyId(visibleKeyId === key.id ? null : key.id)}
                  className="btn btn-ghost flex-1 gap-2 text-sm"
                >
                  {visibleKeyId === key.id ? <EyeOff size={16} /> : <Eye size={16} />}
                  {visibleKeyId === key.id ? t('keys.hide') : t('keys.show')}
                </button>
                <button
                  onClick={() => handleExportKey(key.id)}
                  className="btn btn-ghost flex-1 gap-2 text-sm"
                >
                  <Download size={16} /> {t('keys.export')}
                </button>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900 flex-1 gap-2 text-sm"
                >
                  <Trash2 size={16} /> {t('keys.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KeysPage;
