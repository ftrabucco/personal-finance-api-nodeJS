# CI/CD Setup Guide

## 📋 Overview

This project uses GitHub Actions for Continuous Integration (CI) to ensure code quality, run tests, and maintain security standards.

## 🔧 What the CI Pipeline Does

The CI pipeline automatically runs on:
- **Push** to branches: `main`, `master`, `develop`, `feature/**`
- **Pull Requests** to: `main`, `master`, `develop`

### Pipeline Jobs

1. **Lint** - Code quality checks using ESLint
2. **Test** - Unit and integration tests with Jest
3. **Test Coverage** - Generate and report code coverage
4. **Build** - Verify the application builds and starts correctly
5. **Security** - Audit dependencies for vulnerabilities

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `eslint` - Linting
- `prettier` - Code formatting
- `jest` - Testing framework
- `supertest` - API testing

### Step 2: Configure Environment Variables (Optional)

If you need custom CI configuration, you can set GitHub Secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets (optional):

| Secret Name | Description | Required |
|------------|-------------|----------|
| `CODECOV_TOKEN` | Token for Codecov integration | No |
| `GITHUB_TOKEN` | Automatically provided by GitHub | Auto |

### Step 3: Verify Local Setup

Before pushing, test locally:

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Format code
npm run format
```

### Step 4: Push to GitHub

```bash
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin your-branch-name
```

The CI pipeline will automatically trigger and you'll see the status in:
- GitHub Actions tab
- PR checks (if applicable)

## 📊 CI Pipeline Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Push/PR                        │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┬──────────────┐
           ▼               ▼               ▼              ▼
      ┌────────┐      ┌────────┐      ┌────────┐    ┌──────────┐
      │  Lint  │      │  Test  │      │ Build  │    │ Security │
      └────────┘      └────────┘      └────────┘    └──────────┘
           │               │               │              │
           │               ▼               │              │
           │      ┌─────────────────┐      │              │
           │      │  Test Coverage  │      │              │
           │      └─────────────────┘      │              │
           │               │               │              │
           └───────────────┴───────────────┴──────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  All Checks Passed ✅       │
              └────────────────────────────┘
```

## 🛠️ Available npm Scripts

### Linting & Formatting
```bash
npm run lint           # Check code style
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check if code is formatted
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:debug    # Debug tests
npm run test:setup    # Setup test environment with Docker
```

### Build & Development
```bash
npm start             # Start production server
npm run dev           # Start development server with nodemon
npm run build         # Verify build (placeholder for Node.js)
```

## 📝 ESLint Configuration

ESLint is configured in `.eslintrc.json` with these rules:
- ES2022 syntax
- Node.js environment
- Jest environment for tests
- Standard recommended rules
- Custom spacing and formatting rules

### Disable Linting for Specific Lines

```javascript
// eslint-disable-next-line no-unused-vars
const unusedVar = 'something';

/* eslint-disable no-console */
console.log('This is allowed');
/* eslint-enable no-console */
```

## 🎨 Prettier Configuration

Prettier is configured in `.prettierrc.json`:
- Single quotes
- 2 spaces for indentation
- 100 character line width
- No trailing commas
- Semicolons enabled

## ⚙️ CI Environment

The CI pipeline uses:
- **Node.js**: 18.x
- **PostgreSQL**: 15
- **OS**: Ubuntu Latest

### Test Database

PostgreSQL is automatically provisioned as a service in GitHub Actions:
- Database: `finanzas_personal_test`
- User: `postgres`
- Password: `postgres123`
- Port: `5432`

## 🔍 Troubleshooting

### Lint Failures

```bash
# Check what's failing
npm run lint

# Auto-fix common issues
npm run lint:fix

# Format all files
npm run format
```

### Test Failures

```bash
# Run tests locally with same environment
NODE_ENV=test npm test

# Run specific test file
npm test -- path/to/test.test.js

# Run tests in watch mode for debugging
npm run test:watch
```

### Build Failures

```bash
# Verify app starts locally
npm start

# Check for syntax errors
npm run lint
```

### Database Issues in CI

The CI pipeline automatically:
1. Starts PostgreSQL service
2. Waits for it to be ready
3. Seeds the test database

If tests fail due to database issues, check:
- `src/db/seed.js` for seeding errors
- `.env.ci` for correct credentials
- Test timeout settings in `jest.config.js`

## 📈 Coverage Reports

Coverage reports are generated automatically and:
- Displayed in PR comments (via lcov-reporter)
- Uploaded to Codecov (if token configured)
- Saved as artifacts in GitHub Actions

Minimum coverage thresholds are not enforced by default but can be configured in `jest.config.js`.

## 🔒 Security Audits

The pipeline runs `npm audit` to check for vulnerabilities:
- **Moderate** vulnerabilities: Warning (continues)
- **High/Critical** vulnerabilities: Fails the build

### Fix Security Issues

```bash
# Check for vulnerabilities
npm audit

# Automatically fix if possible
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

## 🎯 Best Practices

1. **Always lint before committing**
   ```bash
   npm run lint:fix && git add .
   ```

2. **Run tests locally before pushing**
   ```bash
   npm test
   ```

3. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

4. **Write meaningful commit messages**
   ```bash
   git commit -m "feat: add user authentication"
   git commit -m "fix: resolve database connection timeout"
   git commit -m "test: add integration tests for expenses API"
   ```

5. **Review CI logs if build fails**
   - Go to GitHub Actions tab
   - Click on the failed workflow
   - Review logs for each job

## 🚦 Status Badges (Optional)

Add to your README.md:

```markdown
[![CI](https://github.com/your-username/your-repo/workflows/CI%20Pipeline/badge.svg)](https://github.com/your-username/your-repo/actions)
[![codecov](https://codecov.io/gh/your-username/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/your-repo)
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prettier Options](https://prettier.io/docs/en/options.html)

## 🤝 Contributing

Before submitting a PR, ensure:
- ✅ All tests pass: `npm test`
- ✅ Code is linted: `npm run lint`
- ✅ Code is formatted: `npm run format`
- ✅ No security vulnerabilities: `npm audit`
