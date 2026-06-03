# 🔐 IoT Key Generation Platform

A professional full-stack web application for secure, lightweight encryption key generation and management in IoT systems. Built for diploma thesis on efficient cryptography for resource-constrained devices.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Algorithms](#algorithms)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Docker Deployment](#docker-deployment)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication with password hashing
- **Device Management**: Register, monitor, and manage IoT devices
- **Key Generation**: Multiple methods (DRBG, TRNG, PUF) with variable key lengths (64/128/256-bit)
- **Encryption/Decryption**: Real-time operations with three lightweight algorithms
- **Entropy Analysis**: NIST-inspired randomness tests and statistical analysis
- **Performance Monitoring**: Track execution times, throughput, and resource usage
- **Dashboard**: Comprehensive statistics and real-time visualizations
- **Dark/Light Mode**: Eye-friendly interface with theme switching

### Security Features
- JWT token-based authentication with expiration
- Password hashing using bcrypt
- Token revocation system
- Input validation with Pydantic
- CORS protection
- Secure database operations

## 🛠 Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Auth**: JWT (PyJWT) + Bcrypt
- **Server**: Uvicorn

### Frontend
- **Library**: React 18.2
- **Bundler**: Vite
- **Styling**: Tailwind CSS 3.3
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React

### Deployment
- **Docker**: Multi-container orchestration
- **Docker Compose**: Service management
- **Nginx**: Reverse proxy (optional)

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)

### Local Development

1. **Clone and Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Setup Environment Variables**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
```

3. **Run Backend**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

## 🏗 Architecture

```
IoT_Platform/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── models.py           # SQLAlchemy ORM models
│   │   ├── routes/
│   │   │   ├── auth_routes.py      # Authentication endpoints
│   │   │   ├── device_routes.py    # Device management
│   │   │   ├── key_routes.py       # Key generation
│   │   │   ├── encryption_routes.py # Encryption/decryption
│   │   │   └── analysis_routes.py  # Analysis endpoints
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic validation schemas
│   │   ├── auth/
│   │   │   └── auth.py             # JWT & password utilities
│   │   ├── utils/
│   │   │   └── database.py         # Database configuration
│   │   └── main.py                 # FastAPI app initialization
│   ├── requirements.txt
│   ├── .env
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation
│   │   │   └── Sidebar.jsx         # Side navigation
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # User login
│   │   │   ├── RegisterPage.jsx    # User registration
│   │   │   ├── DashboardPage.jsx   # Main dashboard
│   │   │   ├── DevicesPage.jsx     # Device management
│   │   │   ├── KeysPage.jsx        # Key management
│   │   │   ├── EncryptionPage.jsx  # Encryption tools
│   │   │   ├── AnalysisPage.jsx    # Analysis tools
│   │   │   └── AboutPage.jsx       # Project information
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state management
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── styles/
│   │   │   └── globals.css         # Global styles
│   │   ├── App.jsx                 # Main App component
│   │   └── index.jsx               # React entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── Dockerfile
│   └── index.html
├── crypto/
│   ├── ascon.py                    # ASCON-128 cipher
│   ├── aes.py                      # AES-128 cipher
│   ├── speck.py                    # SPECK-64/128 cipher
│   ├── keygen.py                   # Key generation methods
│   ├── analysis.py                 # Entropy analysis
│   └── __init__.py
├── docker-compose.yml
├── nginx.conf                      # Nginx configuration
├── README.md
└── .gitignore
```

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 200 OK
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "SecurePass123"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Device Endpoints

#### Create Device
```http
POST /devices
Authorization: Bearer {token}
Content-Type: application/json

{
  "device_id": "IOT-DEVICE-001",
  "device_name": "Temperature Sensor",
  "device_type": "sensor",
  "manufacturer": "SensorCorp",
  "cpu_type": "ARM Cortex-M4",
  "memory_kb": 256,
  "storage_kb": 1024
}

Response: 201 Created
{
  "id": 1,
  "device_id": "IOT-DEVICE-001",
  "device_name": "Temperature Sensor",
  "status": "active",
  "created_at": "2024-01-15T10:30:00",
  "last_seen": "2024-01-15T10:30:00"
}
```

### Key Generation Endpoints

#### Generate Key
```http
POST /keys/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "key_length_bits": 128,
  "generation_method": "drbg",
  "algorithm": "AES",
  "device_id": 1
}

Response: 201 Created
{
  "id": 1,
  "key_id": "KEY-001",
  "key_value": "a1b2c3d4e5f6...",
  "key_length_bits": 128,
  "generation_method": "drbg",
  "algorithm_used": "AES",
  "shannon_entropy": 7.98,
  "randomness_score": 98.5,
  "created_at": "2024-01-15T10:30:00"
}
```

### Encryption Endpoints

#### Encrypt Data
```http
POST /crypto/encrypt
Authorization: Bearer {token}
Content-Type: application/json

{
  "plaintext": "48656c6c6f20576f726c64",
  "key_id": 1,
  "algorithm": "AES"
}

Response: 200 OK
{
  "operation_id": "OP-001",
  "ciphertext": "7e3f5a8b...",
  "algorithm": "AES",
  "execution_time_ms": 2.45,
  "throughput_kbs": 1024.5,
  "status": "success"
}
```

#### Decrypt Data
```http
POST /crypto/decrypt
Authorization: Bearer {token}
Content-Type: application/json

{
  "ciphertext": "7e3f5a8b...",
  "key_id": 1,
  "algorithm": "AES"
}

Response: 200 OK
{
  "operation_id": "OP-002",
  "plaintext": "48656c6c6f20576f726c64",
  "is_valid": true,
  "execution_time_ms": 1.98,
  "status": "success"
}
```

### Analysis Endpoints

#### Analyze Key Entropy
```http
POST /analysis/entropy
Authorization: Bearer {token}
Content-Type: application/json

{
  "key_id": 1,
  "analysis_type": "entropy"
}

Response: 200 OK
{
  "key_id": 1,
  "shannon_entropy": 7.98,
  "min_entropy": 5.2,
  "collision_entropy": 6.8,
  "frequency_test": {
    "chi_squared": 12.45,
    "is_random": true
  },
  "runs_test": {
    "runs": 128,
    "is_random": true
  },
  "overall_randomness_score": 98.5,
  "passes_all_tests": true
}
```

### Complete API Reference
Full API documentation available at `/docs` endpoint (Swagger UI) or `/redoc` endpoint (ReDoc)

## 🔐 Algorithms

### ASCON-128 (Authenticated Encryption)
- **Key Size**: 128-bit
- **Block Size**: 128-bit
- **Nonce Size**: 128-bit
- **Tag Size**: 128-bit
- **Rounds**: 12
- **Use Case**: IoT with authentication requirement
- **Performance**: Ultra-lightweight, proven secure

### AES-128 (Advanced Encryption Standard)
- **Key Size**: 128-bit
- **Block Size**: 128-bit
- **Mode**: ECB with PKCS7 padding
- **Rounds**: 10
- **Use Case**: General-purpose encryption
- **Performance**: Industry standard, widely compatible

### SPECK-64/128 (Ultra-Lightweight)
- **Key Size**: 128-bit
- **Block Size**: 64-bit
- **Rounds**: 27
- **Use Case**: Extremely constrained IoT devices
- **Performance**: Minimal resource usage, fast execution

## 🔑 Key Generation Methods

### DRBG (Deterministic Random Bit Generator)
- Standards-based (NIST SP 800-90A)
- Reproducible key generation
- Fast performance
- Suitable for batch operations
- Recommended for testing and reproducible scenarios

### TRNG (True Random Number Generator)
- Uses system entropy sources
- Non-reproducible, genuine randomness
- Maximum security
- Slower than DRBG
- Recommended for production deployments

### PUF (Physical Unclonable Function)
- Device-specific key generation
- Simulates manufacturing variations
- Unique per device
- Useful for device authentication
- Limited entropy in simulation mode

## 💻 Installation

### Development Installation

**Backend Setup:**
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
```

**Frontend Setup:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Production Installation

See Docker Deployment section below.

## ⚙️ Configuration

### Backend Configuration (.env)
```env
# Database
DATABASE_URL=sqlite:///./iot_keygen.db

# JWT
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_TITLE=IoT Key Generation Platform
API_VERSION=1.0.0
DEBUG=False
```

### Frontend Configuration (.env)
```env
VITE_API_URL=http://localhost:8000
```

## 📖 Usage Guide

### 1. User Registration
1. Navigate to registration page
2. Enter username, email, and password
3. Click "Register"
4. Automatically logged in

### 2. Add IoT Device
1. Go to Devices page
2. Click "Add Device"
3. Fill in device specifications
4. Click "Create"

### 3. Generate Encryption Key
1. Go to Keys page
2. Click "Generate Key"
3. Select key length, generation method, algorithm
4. Click "Generate"
5. View generated key and its entropy metrics

### 4. Encrypt Data
1. Go to Encryption page
2. Select "Encrypt" tab
3. Choose key and algorithm
4. Enter plaintext in hex format
5. Click "Encrypt"
6. View ciphertext and performance metrics

### 5. Analyze Key Quality
1. Go to Analysis page
2. Select a key
3. View entropy metrics
4. Check NIST test results
5. Compare algorithms performance

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Development with auto-reload
docker-compose up

# Production mode
docker-compose --profile production up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Access Services
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Nginx (production): http://localhost:80

### Build Custom Image

```bash
# Backend image
docker build -t iot-backend:1.0 ./backend

# Frontend image
docker build -t iot-frontend:1.0 ./frontend

# Run containers
docker run -p 8000:8000 iot-backend:1.0
docker run -p 5173:3000 iot-frontend:1.0
```

### Environment Variables for Docker
```env
# Backend
DATABASE_URL=sqlite:///./iot_keygen.db
SECRET_KEY=prod-secret-key
ALGORITHM=HS256

# Frontend
VITE_API_URL=http://backend:8000
```

## 🔄 CI/CD Pipeline (GitHub Actions Example)

```yaml
name: Build and Deploy

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build backend
        run: docker build ./backend
      - name: Build frontend
        run: docker build ./frontend
      - name: Run tests
        run: npm test --prefix frontend
```

## 📊 Database Schema

### User Model
- id (primary key)
- username (unique)
- email (unique)
- password_hash
- created_at
- updated_at

### IoTDevice Model
- id (primary key)
- user_id (foreign key)
- device_id (unique)
- device_name
- device_type
- status
- last_seen
- created_at

### CryptographicKey Model
- id (primary key)
- user_id (foreign key)
- device_id (foreign key, optional)
- key_id (unique)
- key_value
- key_length_bits
- generation_method
- algorithm_used
- shannon_entropy
- randomness_score
- created_at

### Operation Model
- id (primary key)
- user_id (foreign key)
- key_id (foreign key)
- operation_type (encrypt/decrypt)
- algorithm
- execution_time_ms
- throughput_kbs
- status
- created_at

### AnalysisResult Model
- id (primary key)
- key_id (foreign key)
- analysis_type
- shannon_entropy
- min_entropy
- collision_entropy
- randomness_score
- passes_all_tests
- created_at

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest tests/ -v
```

### Frontend Testing
```bash
cd frontend
npm test
```

### E2E Testing
```bash
cd frontend
npm run test:e2e
```

## 📝 API Rate Limiting

- Authenticated users: 1000 requests/hour
- Anonymous users: 100 requests/hour
- Key generation: 10 requests/minute per user
- Encryption operations: 100 requests/minute per user

## 🔐 Security Best Practices

1. **Change SECRET_KEY in Production**: Never use default values
2. **Use HTTPS**: Enable SSL/TLS in production
3. **Database Security**: Use strong PostgreSQL passwords
4. **CORS Configuration**: Restrict to trusted domains
5. **Input Validation**: All inputs validated with Pydantic
6. **Token Expiration**: Implement refresh token mechanism
7. **Rate Limiting**: Enable request throttling
8. **Logging**: Monitor suspicious activities

## 🐛 Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Change port in .env or kill existing process
- **Database locked**: Delete .db file and restart
- **Import errors**: Reinstall requirements: `pip install -r requirements.txt --force-reinstall`

### Frontend Issues
- **Vite not starting**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- **API connection failed**: Check VITE_API_URL in .env matches backend URL
- **Module not found**: Run `npm install` in frontend directory

### Docker Issues
- **Container won't start**: Check logs: `docker-compose logs`
- **Port conflicts**: Change port mappings in docker-compose.yml
- **Database issues**: Remove volumes: `docker-compose down -v`

## 📚 Reference & Research

### Cryptographic Standards
- NIST SP 800-90A: Recommendation for DRBG
- ASCON: Lightweight Authenticated Encryption
- SPECK: Lightweight Block Cipher
- AES: Federal Information Processing Standards

### Performance Metrics
- Measured in: milliseconds (execution time), KB/s (throughput)
- Benchmarked on: Standard developer hardware
- Variants: ASCON, AES, SPECK

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👥 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API documentation at `/docs`

## 🎓 Citation

If used for academic purposes, please cite:

```bibtex
@thesis{iot_keygen_2024,
  title={IoT Key Generation Platform: Lightweight Encryption for Resource-Constrained Devices},
  author={Your Name},
  school={Your University},
  year={2024}
}
```

## 🔄 Version History

- **v1.0.0** (2024-01-15): Initial release
  - Core encryption algorithms (ASCON, AES, SPECK)
  - Key generation methods (DRBG, TRNG, PUF)
  - Complete web interface
  - API documentation
  - Docker deployment

---

**Built with ❤️ for IoT Security**

*Professional full-stack platform for secure key generation in IoT systems*
