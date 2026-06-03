# 🤝 Contributing Guidelines

Thank you for considering contributing to the IoT Key Generation Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Respect different opinions and experiences
- Report harassment or inappropriate behavior

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- Docker (optional)
- Basic understanding of FastAPI and React

### Development Setup

1. **Fork the Repository**
```bash
git clone https://github.com/yourname/iot-keygen.git
cd iot-keygen
```

2. **Create Development Branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install pytest black flake8 mypy
```

4. **Setup Frontend**
```bash
cd ../frontend
npm install
npm install --save-dev eslint prettier
```

## Development Workflow

### 1. Code Style

**Backend (Python):**
- Follow PEP 8
- Use Black for formatting: `black app/`
- Use Flake8 for linting: `flake8 app/`
- Use MyPy for type checking: `mypy app/`
- Maximum line length: 100 characters
- Use type hints for all functions

Example:
```python
def encrypt_data(plaintext: str, key_id: int, algorithm: str) -> EncryptionResponse:
    """Encrypt plaintext using specified algorithm and key.
    
    Args:
        plaintext: Plaintext data in hex format
        key_id: ID of the key to use
        algorithm: Algorithm name (AES, ASCON, SPECK)
    
    Returns:
        EncryptionResponse with ciphertext and metrics
    """
    # Implementation
    pass
```

**Frontend (JavaScript/React):**
- Follow Airbnb JavaScript style guide
- Use Prettier for formatting: `npx prettier --write src/`
- Use ESLint for linting: `npx eslint src/`
- Maximum line length: 100 characters
- Use functional components with hooks
- Add PropTypes or TypeScript

Example:
```jsx
function KeyCard({ key, onDelete, onExport }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="card">
      {/* Component content */}
    </div>
  );
}

KeyCard.propTypes = {
  key: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};
```

### 2. Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `ci`: CI/CD changes
- `chore`: Build/dependency changes

**Examples:**
```
feat(crypto): Add BLAKE2 hashing algorithm

fix(auth): Resolve token expiration validation bug

docs(readme): Update installation instructions

style(frontend): Format component files with Prettier
```

### 3. Testing

**Backend Testing:**
```bash
cd backend

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test
pytest tests/test_auth.py::test_register_user -v
```

**Frontend Testing:**
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run watch mode
npm test -- --watch
```

**Test Structure:**

Backend (`tests/test_auth.py`):
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_user_registration():
    """Test user registration endpoint"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPass123"
        }
    )
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"

def test_user_login():
    """Test user login endpoint"""
    # Setup
    client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPass123"
        }
    )
    
    # Test
    response = client.post(
        "/auth/login",
        json={
            "username": "testuser",
            "password": "TestPass123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

Frontend (`src/__tests__/LoginPage.test.jsx`):
```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('submits login form', async () => {
    render(<LoginPage />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByText('Login'));
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

### 4. Documentation

**Code Comments:**
```python
def shannon_entropy(data: bytes) -> float:
    """Calculate Shannon entropy of binary data.
    
    Shannon entropy measures the average information content in data.
    Formula: H(X) = -Σ P(x) * log2(P(x))
    
    Args:
        data: Binary data to analyze
        
    Returns:
        Shannon entropy value (0-8 for bytes)
        
    Raises:
        ValueError: If data is empty
        
    Example:
        >>> entropy = shannon_entropy(b'hello world')
        >>> print(f'Entropy: {entropy:.2f}')
        Entropy: 4.87
    """
    if not data:
        raise ValueError("Data cannot be empty")
    # Implementation
```

**Docstring Style:**
- Use Google/NumPy style docstrings
- Include Args, Returns, Raises, Example sections
- Keep documentation up-to-date with code changes

## Types of Contributions

### 1. Bug Reports

**How to Report:**
1. Check if bug already exists in Issues
2. Click "New Issue"
3. Use bug report template
4. Provide:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs
   - System information

**Example:**
```markdown
## Bug Description
Encryption operation fails with SPECK algorithm

## Steps to Reproduce
1. Generate 128-bit key
2. Try to encrypt "hello" with SPECK algorithm
3. Observe error

## Expected Behavior
Data should be encrypted successfully

## Actual Behavior
Error: "Invalid algorithm parameters"

## Logs
[Include relevant error logs]

## System Info
- OS: Ubuntu 22.04
- Python: 3.11.2
- Node: 18.14.0
```

### 2. Feature Requests

**How to Request:**
1. Click "New Issue"
2. Use feature request template
3. Provide:
   - Clear description
   - Use cases/benefits
   - Possible implementation approach
   - Related issues

**Example:**
```markdown
## Feature Description
Add support for RSA key generation

## Use Cases
- Asymmetric encryption support
- Digital signatures
- IoT device authentication

## Possible Implementation
- Implement RSA-2048 class
- Add to key generation methods
- Create API endpoint

## Related Issues
Closes #45
```

### 3. Code Contributions

**Pull Request Process:**

1. **Create Branch**
```bash
git checkout -b feat/my-feature
```

2. **Make Changes**
- Write clean, well-documented code
- Add tests for new functionality
- Update documentation
- Follow code style guidelines

3. **Test Locally**
```bash
# Backend
cd backend
pytest tests/ -v
black app/
flake8 app/

# Frontend
cd frontend
npm test
npx prettier --write src/
npx eslint src/
```

4. **Commit Changes**
```bash
git add .
git commit -m "feat(crypto): Add BLAKE2 hashing support"
```

5. **Push to Fork**
```bash
git push origin feat/my-feature
```

6. **Create Pull Request**
- Use PR template
- Provide clear description
- Link related issues
- Request review

7. **Review Process**
- Maintainers will review code
- Address feedback
- Update PR as needed
- Merge when approved

### 4. Documentation Contributions

**Files to Update:**
- `README.md`: Main documentation
- `INSTALL.md`: Installation guide
- `CONTRIBUTING.md`: This file
- `API.md`: API documentation
- Inline code comments
- Docstrings

**How to Contribute:**
1. Update relevant files
2. Ensure clarity and accuracy
3. Add examples where helpful
4. Check formatting with Prettier
5. Create PR with "docs:" prefix

## Project Structure

```
iot-keygen/
├── backend/
│   ├── app/
│   │   ├── models/       # Database models
│   │   ├── routes/       # API endpoints
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── auth/         # Authentication
│   │   └── utils/        # Utilities
│   ├── tests/            # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # Context providers
│   │   ├── services/     # API services
│   │   └── __tests__/    # Tests
│   ├── package.json
│   └── vite.config.js
├── crypto/               # Cryptographic algorithms
└── tests/               # Integration tests
```

## Development Workflow

### Working on a Feature

1. **Assign Yourself**
   - Comment on issue: "I'll work on this"
   - Maintainer will assign you

2. **Create Feature Branch**
```bash
git checkout -b feat/feature-name
```

3. **Implement Feature**
   - Follow code style
   - Add tests
   - Update documentation
   - Test thoroughly

4. **Create Pull Request**
   - Reference issue: "Closes #123"
   - Provide clear description
   - Request review

5. **Address Feedback**
   - Make requested changes
   - Push updates
   - Reply to comments

6. **Merge**
   - Squash commits if needed
   - Merge to main branch
   - Delete feature branch

## Performance Considerations

### Backend
- Use database indexes for frequently queried fields
- Implement caching for expensive operations
- Profile code before optimization
- Use async operations for I/O

### Frontend
- Lazy load routes and components
- Memoize expensive computations
- Optimize re-renders with React.memo
- Bundle size monitoring

## Security Guidelines

1. **Never commit secrets**
   - Don't commit .env files
   - Don't commit API keys
   - Don't commit passwords

2. **Input Validation**
   - Validate all user inputs
   - Use Pydantic for backend validation
   - Sanitize frontend inputs

3. **Dependencies**
   - Keep dependencies updated
   - Review security advisories
   - Use tools like `npm audit` and `safety check`

4. **Error Handling**
   - Don't expose sensitive information in errors
   - Log errors securely
   - Handle exceptions gracefully

## Release Process

### Version Numbering
We follow Semantic Versioning: `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes
- `MINOR`: New features
- `PATCH`: Bug fixes

### Release Steps
1. Update version in all files
2. Update CHANGELOG.md
3. Create git tag
4. Create GitHub release
5. Build Docker images
6. Push to registries

## Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)

### Tools
- [Black - Python Formatter](https://black.readthedocs.io/)
- [Prettier - JavaScript Formatter](https://prettier.io/)
- [Pytest - Python Testing](https://docs.pytest.org/)
- [Vitest - JavaScript Testing](https://vitest.dev/)

### Cryptography
- [NIST SP 800-90A - DRBG](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-90a.pdf)
- [ASCON Documentation](https://ascon.iaik.tugraz.at/)
- [SPECK Cipher](https://csrc.nist.gov/publications/detail/sp/800-38d/final)

## Community

### Communication
- **GitHub Issues**: Bug reports and features
- **GitHub Discussions**: General questions
- **Email**: Send to maintainers

### Getting Help
1. Check existing issues/discussions
2. Review documentation
3. Ask in GitHub discussions
4. Contact maintainers directly

## Attribution

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website

## Questions?

Feel free to:
- Open an issue with question tag
- Start a GitHub discussion
- Contact maintainers
- Review existing documentation

---

## Summary

Thank you for contributing! 🎉

1. Follow the guidelines above
2. Write clean, tested code
3. Update documentation
4. Be respectful to other contributors
5. Have fun!

**Happy contributing!**
