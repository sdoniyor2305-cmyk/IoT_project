import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Copy, Check } from 'lucide-react';
import { encryptionAPI, keyAPI } from '../services/api';
import { useLang } from '../context/LangContext';

const EncryptionPage = () => {
  const { t } = useLang();
  const [keys, setKeys] = useState([]);
  const [operations, setOperations] = useState([]);
  const [tab, setTab] = useState('encrypt');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const [encryptForm, setEncryptForm] = useState({
    plaintext: '',
    key_id: '',
    algorithm: 'AES',
  });

  const [decryptForm, setDecryptForm] = useState({
    ciphertext: '',
    key_id: '',
    algorithm: 'AES',
  });

  const [results, setResults] = useState(null);
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [inputMode, setInputMode] = useState('hex'); // 'hex' | 'text'

  const textToHex = (text) =>
    Array.from(text)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');

  const hexToText = (hex) => {
    const clean = hex.replace(/\s/g, '');
    if (!clean || clean.length % 2 !== 0) return null;
    try {
      return clean
        .match(/.{2}/g)
        .map((byte) => String.fromCharCode(parseInt(byte, 16)))
        .join('');
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const keysData = await keyAPI.list();
      const opsData = await encryptionAPI.listOperations();
      setKeys(keysData);
      setOperations(opsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEncrypt = async (e) => {
    e.preventDefault();
    setEncrypting(true);
    try {
      const payload = {
        ...encryptForm,
        plaintext:
          inputMode === 'text'
            ? textToHex(encryptForm.plaintext)
            : encryptForm.plaintext,
      };
      const result = await encryptionAPI.encrypt(payload);
      setResults({ type: 'encrypt', data: result });
      setEncryptForm({ plaintext: '', key_id: '', algorithm: 'AES' });
    } catch (error) {
      alert(t('encrypt.failed') + (error.message || 'Unknown error'));
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    setDecrypting(true);
    try {
      const result = await encryptionAPI.decrypt(decryptForm);
      setResults({ type: 'decrypt', data: result });
      setDecryptForm({ ciphertext: '', key_id: '', algorithm: 'AES' });
    } catch (error) {
      alert(t('decrypt.failed') + (error.message || 'Unknown error'));
    } finally {
      setDecrypting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="text-center py-12">{t('encrypt.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('encrypt.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('encrypt.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('encrypt')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === 'encrypt'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <Lock className="inline mr-2" size={18} /> {t('encrypt.tab')}
        </button>
        <button
          onClick={() => setTab('decrypt')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === 'decrypt'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <Unlock className="inline mr-2" size={18} /> {t('decrypt.tab')}
        </button>
      </div>

      {/* Encryption Form */}
      {tab === 'encrypt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('encrypt.formTitle')}</h2>
            <form onSubmit={handleEncrypt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('encrypt.selectKey')}
                </label>
                <select
                  value={encryptForm.key_id}
                  onChange={(e) => setEncryptForm({ ...encryptForm, key_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">{t('encrypt.chooseKey')}</option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.key_id} ({key.key_length_bits}-bit, {key.algorithm_used})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.algorithm')}
                </label>
                <select
                  value={encryptForm.algorithm}
                  onChange={(e) => setEncryptForm({ ...encryptForm, algorithm: e.target.value })}
                  className="input"
                >
                  <option value="AES">AES</option>
                  <option value="ASCON">ASCON</option>
                  <option value="SPECK">SPECK</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {inputMode === 'hex' ? t('encrypt.plaintextHex') : t('encrypt.plaintextText')}
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={inputMode === 'hex' ? 'font-semibold text-blue-600' : 'text-gray-500 dark:text-gray-400'}>
                      {t('common.hex')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputMode(inputMode === 'hex' ? 'text' : 'hex')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        inputMode === 'text' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={inputMode === 'text'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          inputMode === 'text' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={inputMode === 'text' ? 'font-semibold text-blue-600' : 'text-gray-500 dark:text-gray-400'}>
                      {t('common.text')}
                    </span>
                  </div>
                </div>
                <textarea
                  value={encryptForm.plaintext}
                  onChange={(e) => setEncryptForm({ ...encryptForm, plaintext: e.target.value })}
                  className={`input h-32 ${inputMode === 'hex' ? 'font-mono text-xs' : 'text-sm'}`}
                  placeholder={inputMode === 'hex' ? t('encrypt.hexPlaceholder') : t('encrypt.textPlaceholder')}
                  required
                />
                {inputMode === 'text' && encryptForm.plaintext && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    Hex: {textToHex(encryptForm.plaintext)}
                  </p>
                )}
              </div>
              <button type="submit" disabled={encrypting} className="btn btn-primary w-full">
                {encrypting ? t('encrypt.encrypting') : t('encrypt.btn')}
              </button>
            </form>
          </div>

          {results?.type === 'encrypt' && (
            <div className="card bg-green-50 dark:bg-green-900 bg-opacity-30">
              <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">{t('encrypt.result')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('encrypt.ciphertext')}
                  </label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-xs break-all max-h-40 overflow-y-auto">
                    {results.data.ciphertext}
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.data.ciphertext, 'ciphertext')}
                    className="mt-2 btn btn-ghost gap-2 text-sm"
                  >
                    {copied === 'ciphertext' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'ciphertext' ? t('common.copied') : t('common.copy')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('common.algorithm')}</p>
                    <p className="font-semibold">{results.data.algorithm}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('common.time')}</p>
                    <p className="font-semibold">{results.data.execution_time_ms.toFixed(2)}ms</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('encrypt.throughput')}</p>
                    <p className="font-semibold">{results.data.throughput_kbs.toFixed(2)} KB/s</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('common.operationId')}</p>
                    <p className="font-mono text-xs">{results.data.operation_id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decryption Form */}
      {tab === 'decrypt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('decrypt.formTitle')}</h2>
            <form onSubmit={handleDecrypt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('encrypt.selectKey')}
                </label>
                <select
                  value={decryptForm.key_id}
                  onChange={(e) => setDecryptForm({ ...decryptForm, key_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">{t('encrypt.chooseKey')}</option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.key_id} ({key.key_length_bits}-bit, {key.algorithm_used})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.algorithm')}
                </label>
                <select
                  value={decryptForm.algorithm}
                  onChange={(e) => setDecryptForm({ ...decryptForm, algorithm: e.target.value })}
                  className="input"
                >
                  <option value="AES">AES</option>
                  <option value="ASCON">ASCON</option>
                  <option value="SPECK">SPECK</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('decrypt.ciphertextLabel')}
                </label>
                <textarea
                  value={decryptForm.ciphertext}
                  onChange={(e) => setDecryptForm({ ...decryptForm, ciphertext: e.target.value })}
                  className="input font-mono text-xs h-32"
                  placeholder={t('decrypt.ciphertextPlaceholder')}
                  required
                />
              </div>
              <button type="submit" disabled={decrypting} className="btn btn-primary w-full">
                {decrypting ? t('decrypt.decrypting') : t('decrypt.btn')}
              </button>
            </form>
          </div>

          {results?.type === 'decrypt' && (
            <div className="card bg-blue-50 dark:bg-blue-900 bg-opacity-30">
              <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">{t('decrypt.result')}</h2>
              <div className="space-y-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {t('decrypt.valid')}{results.data.is_valid ? t('common.yes') : t('common.no')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('decrypt.plaintextLabel')}
                  </label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-xs break-all max-h-40 overflow-y-auto">
                    {results.data.plaintext}
                  </div>
                  <button
                    onClick={() => copyToClipboard(results.data.plaintext, 'plaintext')}
                    className="mt-2 btn btn-ghost gap-2 text-sm"
                  >
                    {copied === 'plaintext' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'plaintext' ? t('common.copied') : t('common.copy')}
                  </button>
                  {(() => {
                    const decoded = hexToText(results.data.plaintext);
                    return decoded ? (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{t('decrypt.decodedText')}:</span>{' '}
                        <span className="font-semibold">{decoded}</span>
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('common.time')}</p>
                    <p className="font-semibold">{results.data.execution_time_ms.toFixed(2)}ms</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('common.operationId')}</p>
                    <p className="font-mono text-xs">{results.data.operation_id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Operations */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('encrypt.recentOps')}</h2>
        {operations.length === 0 ? (
          <p className="text-gray-500">{t('encrypt.noOps')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 font-semibold">{t('encrypt.opType')}</th>
                  <th className="text-left py-2 px-2 font-semibold">{t('common.algorithm')}</th>
                  <th className="text-left py-2 px-2 font-semibold">{t('common.time')}</th>
                  <th className="text-left py-2 px-2 font-semibold">{t('encrypt.opStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {operations.slice(0, 5).map((op) => (
                  <tr key={op.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-2">{op.operation_type}</td>
                    <td className="py-2 px-2">{op.algorithm}</td>
                    <td className="py-2 px-2">{op.execution_time_ms?.toFixed(2)}ms</td>
                    <td className="py-2 px-2">
                      <span className={`badge ${op.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                        {op.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptionPage;
