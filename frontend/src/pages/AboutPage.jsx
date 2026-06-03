import React from 'react';
import { Shield, Zap, Lock, Users } from 'lucide-react';
import { useLang } from '../context/LangContext';

const AboutPage = () => {
  const { t } = useLang();

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('about.title')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">{t('about.subtitle')}</p>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('about.overview')}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{t('about.overviewDesc1')}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t('about.overviewDesc2')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard icon={Shield} title={t('about.secureKeyGen')} description={t('about.secureKeyGenDesc')} />
        <FeatureCard icon={Zap} title={t('about.lightweightAlgo')} description={t('about.lightweightAlgoDesc')} />
        <FeatureCard icon={Lock} title={t('about.entropyAnalysis')} description={t('about.entropyAnalysisDesc')} />
        <FeatureCard icon={Users} title={t('about.deviceMgmt')} description={t('about.deviceMgmtDesc')} />
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('about.supportedAlgos')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AlgorithmDetail
            name="ASCON"
            category={t('algo.ascon.category')}
            keySize="128-bit"
            blockSize="128-bit"
            description={t('algo.ascon.longDesc')}
            features={[t('algo.ascon.f1'), t('algo.ascon.f2'), t('algo.ascon.f3'), t('algo.ascon.f4')]}
            keyLabel={t('about.keySize')}
            blockLabel={t('about.blockSize')}
          />
          <AlgorithmDetail
            name="AES-128"
            category={t('algo.aes.category')}
            keySize="128-bit"
            blockSize="128-bit"
            description={t('algo.aes.longDesc')}
            features={[t('algo.aes.f1'), t('algo.aes.f2'), t('algo.aes.f3'), t('algo.aes.f4')]}
            keyLabel={t('about.keySize')}
            blockLabel={t('about.blockSize')}
          />
          <AlgorithmDetail
            name="SPECK"
            category={t('algo.speck.category')}
            keySize="128-bit"
            blockSize="64-bit"
            description={t('algo.speck.longDesc')}
            features={[t('algo.speck.f1'), t('algo.speck.f2'), t('algo.speck.f3'), t('algo.speck.f4')]}
            keyLabel={t('about.keySize')}
            blockLabel={t('about.blockSize')}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('about.keyGenMethods')}</h2>
        <div className="space-y-4">
          <MethodCard
            name={t('method.drbg.name')}
            description={t('method.drbg.desc')}
            pros={[t('method.drbg.p1'), t('method.drbg.p2'), t('method.drbg.p3')]}
            cons={[t('method.drbg.c1'), t('method.drbg.c2')]}
            advantagesLabel={t('about.advantages')}
            limitationsLabel={t('about.limitations')}
          />
          <MethodCard
            name={t('method.trng.name')}
            description={t('method.trng.desc')}
            pros={[t('method.trng.p1'), t('method.trng.p2'), t('method.trng.p3')]}
            cons={[t('method.trng.c1'), t('method.trng.c2')]}
            advantagesLabel={t('about.advantages')}
            limitationsLabel={t('about.limitations')}
          />
          <MethodCard
            name={t('method.puf.name')}
            description={t('method.puf.desc')}
            pros={[t('method.puf.p1'), t('method.puf.p2'), t('method.puf.p3')]}
            cons={[t('method.puf.c1'), t('method.puf.c2')]}
            advantagesLabel={t('about.advantages')}
            limitationsLabel={t('about.limitations')}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('about.techSpecs')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">{t('about.backend')}</h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>✓ FastAPI with Python</li>
              <li>✓ SQLAlchemy ORM</li>
              <li>✓ SQLite/PostgreSQL</li>
              <li>✓ JWT Authentication</li>
              <li>✓ RESTful API</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">{t('about.frontend')}</h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>✓ React 18</li>
              <li>✓ Tailwind CSS</li>
              <li>✓ Recharts</li>
              <li>✓ Dark/Light Mode</li>
              <li>✓ Responsive Design</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('about.platformFeatures')}</h2>
        <ul className="space-y-3 text-gray-700 dark:text-gray-300">
          {[
            ['about.userAuth', 'about.userAuthDesc'],
            ['about.deviceMgmtFeature', 'about.deviceMgmtFeatureDesc'],
            ['about.keyGenFeature', 'about.keyGenFeatureDesc'],
            ['about.encDecFeature', 'about.encDecFeatureDesc'],
            ['about.entropyFeature', 'about.entropyFeatureDesc'],
            ['about.perfMetrics', 'about.perfMetricsDesc'],
            ['about.dashboardFeature', 'about.dashboardFeatureDesc'],
            ['about.darkMode', 'about.darkModeDesc'],
          ].map(([titleKey, descKey]) => (
            <li key={titleKey} className="flex gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong>{t(titleKey)}:</strong> {t(descKey)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('about.architecture')}</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg font-mono text-sm overflow-x-auto">
          <pre className="text-gray-900 dark:text-white">{`
IoT_Platform/
├── backend/
│   ├── app/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   ├── schemas/       # Pydantic validation
│   │   ├── auth/          # Authentication
│   │   ├── utils/         # Database & utilities
│   │   └── main.py        # FastAPI app
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth context
│   │   ├── services/      # API service
│   │   └── App.jsx
│   ├── package.json
│   └── index.html
├── crypto/
│   ├── ascon.py           # ASCON cipher
│   ├── aes.py             # AES-128 cipher
│   ├── speck.py           # SPECK cipher
│   ├── keygen.py          # Key generation
│   └── analysis.py        # Entropy analysis
└── docker-compose.yml
          `}</pre>
        </div>
      </div>

      <div className="text-center py-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400 mb-2">{t('about.version')}</p>
        <p className="text-sm text-gray-500">{t('about.diplomaProject')}</p>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="card-hover">
    <Icon className="text-blue-600 dark:text-blue-400 mb-3" size={32} />
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{description}</p>
  </div>
);

const AlgorithmDetail = ({ name, category, keySize, blockSize, description, features, keyLabel, blockLabel }) => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition">
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{name}</h3>
    <p className="text-xs text-gray-500 mb-3">{category}</p>
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{description}</p>
    <div className="text-xs space-y-1 mb-3">
      <p><strong>{keyLabel}:</strong> {keySize}</p>
      <p><strong>{blockLabel}:</strong> {blockSize}</p>
    </div>
    <div className="flex flex-wrap gap-1">
      {features.map((feature) => (
        <span key={feature} className="badge badge-success text-xs">{feature}</span>
      ))}
    </div>
  </div>
);

const MethodCard = ({ name, description, pros, cons, advantagesLabel, limitationsLabel }) => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{name}</h3>
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{description}</p>
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div>
        <p className="font-semibold text-green-600 dark:text-green-400 mb-2">{advantagesLabel}</p>
        {pros.map((pro) => (
          <p key={pro} className="text-gray-700 dark:text-gray-300 mb-1">✓ {pro}</p>
        ))}
      </div>
      <div>
        <p className="font-semibold text-orange-600 dark:text-orange-400 mb-2">{limitationsLabel}</p>
        {cons.map((con) => (
          <p key={con} className="text-gray-700 dark:text-gray-300 mb-1">• {con}</p>
        ))}
      </div>
    </div>
  </div>
);

export default AboutPage;
