# 📦 Installation Guide

Complete step-by-step installation guide for the IoT Key Generation Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Windows Installation](#windows-installation)
- [macOS Installation](#macos-installation)
- [Linux Installation](#linux-installation)
- [Docker Installation](#docker-installation)
- [Configuration](#configuration)
- [First Run](#first-run)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Git**: Latest version

### System Requirements
- **RAM**: Minimum 2GB (4GB recommended)
- **Disk Space**: 1GB for project and dependencies
- **Network**: Internet connection for package downloads

### Optional
- **Docker**: Latest version (for containerized deployment)
- **Docker Compose**: Latest version (for multi-container setup)

## Windows Installation

### Step 1: Install Python 3.11

1. Download from https://www.python.org/downloads/
2. Run the installer
3. **IMPORTANT**: Check "Add Python 3.11 to PATH"
4. Click "Install Now"
5. Verify installation:
```bash
python --version
```

### Step 2: Install Node.js

1. Download from https://nodejs.org/
2. Choose LTS version (18+)
3. Run the installer
4. Accept default settings
5. Verify installation:
```bash
node --version
npm --version
```

### Step 3: Clone Repository

```bash
git clone https://github.com/yourrepo/iot-keygen.git
cd iot-keygen
```

### Step 4: Setup Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env with your settings (optional)
notepad .env
```

### Step 5: Setup Frontend

```bash
# Go back to root, then frontend
cd ..\frontend

# Install dependencies
npm install

# Create .env file (optional)
echo VITE_API_URL=http://localhost:8000 > .env.local
```

### Step 6: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 7: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## macOS Installation

### Step 1: Install Python 3.11

Using Homebrew (recommended):
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11

# Verify
python3 --version
```

Or download from https://www.python.org/downloads/

### Step 2: Install Node.js

Using Homebrew:
```bash
brew install node

# Verify
node --version
npm --version
```

Or download from https://nodejs.org/

### Step 3: Clone Repository

```bash
git clone https://github.com/yourrepo/iot-keygen.git
cd iot-keygen
```

### Step 4: Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit if needed
nano .env
```

### Step 5: Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000" > .env.local
```

### Step 6: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 7: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## Linux Installation

### Step 1: Install Python 3.11

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Verify
python3 --version
```

CentOS/RHEL:
```bash
sudo yum install python311 python311-pip

# Verify
python3.11 --version
```

### Step 2: Install Node.js

Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Verify
node --version
npm --version
```

### Step 3: Clone Repository

```bash
git clone https://github.com/yourrepo/iot-keygen.git
cd iot-keygen
```

### Step 4: Setup Backend

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit if needed
nano .env
```

### Step 5: Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000" > .env.local
```

### Step 6: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 7: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## Docker Installation

### Step 1: Install Docker

**Windows:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop
- Run installer and follow setup wizard

**macOS:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop
- Run installer

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
```

### Step 2: Verify Docker Installation

```bash
docker --version
docker-compose --version
```

### Step 3: Clone Repository

```bash
git clone https://github.com/yourrepo/iot-keygen.git
cd iot-keygen
```

### Step 4: Build and Run Containers

```bash
# Development mode (with auto-reload)
docker-compose up

# Production mode
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 5: Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Step 6: Run Commands Inside Container

```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# View backend logs
docker-compose logs backend -f

# View frontend logs
docker-compose logs frontend -f
```

### Step 7: Data Persistence

Database files are stored in Docker volumes:
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect iot_proect_iot_db

# Backup database
docker cp iot_backend:/app/iot_keygen.db ./backup.db

# Restore database
docker cp ./backup.db iot_backend:/app/iot_keygen.db
```

---

## Configuration

### Backend Environment Variables (.env)

Create `backend/.env` file:

```env
# Database Configuration
DATABASE_URL=sqlite:///./iot_keygen.db
# For PostgreSQL: postgresql://user:password@localhost/iot_keygen

# JWT Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_TITLE=IoT Key Generation Platform
API_VERSION=1.0.0
API_DESCRIPTION=Secure key generation for IoT devices

# Debug Mode (set to False in production)
DEBUG=True

# CORS Settings
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Frontend Environment Variables (.env.local)

Create `frontend/.env.local` file:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=IoT Key Generation Platform
VITE_APP_VERSION=1.0.0
```

### Production Configuration

For production deployment, update:

**backend/.env:**
```env
DATABASE_URL=postgresql://user:password@prod-db:5432/iot_keygen
SECRET_KEY=generate-new-secure-key-using-openssl
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DEBUG=False
CORS_ORIGINS=["https://yourdomain.com"]
```

Generate secure secret key:
```bash
openssl rand -hex 32
```

---

## First Run

### Step 1: Create First User

Navigate to http://localhost:5173 and register:
- Username: `admin`
- Email: `admin@example.com`
- Password: Create a strong password

### Step 2: Create Test Device

1. Click "Devices" in sidebar
2. Click "Add Device"
3. Fill in:
   - Device ID: `IOT-TEST-001`
   - Device Name: `Test Device`
   - Device Type: `sensor`
   - Manufacturer: `TestCorp`
   - CPU Type: `ARM Cortex-M4`
   - Memory (KB): `256`
   - Storage (KB): `1024`
4. Click "Create"

### Step 3: Generate Test Key

1. Click "Keys" in sidebar
2. Click "Generate Key"
3. Select:
   - Key Length: `128-bit`
   - Generation Method: `DRBG`
   - Algorithm: `AES`
4. Click "Generate"
5. View generated key and entropy metrics

### Step 4: Test Encryption

1. Click "Encryption" in sidebar
2. Fill in:
   - Key: Select generated key
   - Plaintext: `48656c6c6f20576f726c64` (hex for "Hello World")
   - Algorithm: `AES`
3. Click "Encrypt"
4. View ciphertext and performance metrics

### Step 5: View Dashboard

1. Click "Dashboard" to see statistics
2. View algorithm comparisons
3. Check performance metrics

---

## Troubleshooting

### Python/Backend Issues

**Issue**: `python` command not found
```bash
# Use python3
python3 --version

# On Windows, ensure Python is in PATH
set PATH=%PATH%;C:\Python311
```

**Issue**: Virtual environment activation fails
```bash
# Windows - Try different activation:
venv\Scripts\activate.bat

# Linux/macOS - Check bash:
bash
source venv/bin/activate
```

**Issue**: `pip install` fails
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install specific version
pip install -r requirements.txt --force-reinstall
```

**Issue**: SQLite database locked
```bash
# Delete and recreate
rm backend/iot_keygen.db

# Restart backend server
```

### Node.js/Frontend Issues

**Issue**: `npm` command not found
```bash
# Check installation
node --version
npm --version

# Reinstall Node.js
```

**Issue**: Port 5173 already in use
```bash
# Use different port
npm run dev -- --port 3000

# Or kill process using port 5173
# Windows: netstat -ano | findstr :5173
# Linux: lsof -i :5173 | kill -9
```

**Issue**: Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

### Docker Issues

**Issue**: Docker daemon not running
```bash
# Start Docker Desktop (Windows/macOS)
# Or Linux:
sudo systemctl start docker
```

**Issue**: Port already in use
```bash
# Edit docker-compose.yml and change port mapping:
ports:
  - "8001:8000"  # Map to different port
```

**Issue**: Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild images
docker-compose build --no-cache
```

**Issue**: Database connection in Docker
```bash
# Ensure services are connected on same network
# Check docker-compose.yml networks configuration

# Access container
docker-compose exec backend bash
# Test database connection inside container
```

### API Connection Issues

**Issue**: Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:8000/docs

# Check .env configuration
cat frontend/.env.local

# Browser console for CORS errors
# Update CORS_ORIGINS in backend .env
```

**Issue**: 401 Unauthorized errors
```bash
# Check token is valid
# Clear browser storage: DevTools > Application > Storage > Clear All

# Login again
# Ensure token is being sent in Authorization header
```

---

## Verification Checklist

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Git repository cloned
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] .env files created and configured
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:8000/docs
- [ ] Can register user account
- [ ] Can create test device
- [ ] Can generate encryption key
- [ ] Can encrypt/decrypt data

---

## Next Steps

1. Read [README.md](README.md) for project overview
2. Check [API.md](API.md) for API documentation
3. Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
4. Explore the application UI and features

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `docker-compose logs`
3. Check browser console (F12)
4. Open an issue on GitHub with error details

---

**Installation Complete!** 🎉

Your IoT Key Generation Platform is ready to use.

Access it at: http://localhost:5173
