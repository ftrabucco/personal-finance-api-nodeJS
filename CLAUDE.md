# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Management
- `npm run docker:up` - Start PostgreSQL + pgAdmin containers
- `npm run docker:down` - Stop database containers
- `npm run seed-db` - Insert initial data (categories, payment types, etc.)
- `npm run seed-db:test` - Insert test data (requires NODE_ENV=test)
- `npm run reset-db` - Reset database (removes all data)

### Development Server
- `npm run dev` - Start development server with nodemon on port 3030
- `npm start` - Start production server

### Testing
- `npm test` - Run Jest tests with experimental VM modules
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:setup` - Setup test environment (Docker + seed test data)

### MCP Server (Model Context Protocol)
- `npm run mcp:start` - Start MCP server with stdio transport (for Claude Code)
- `npm run mcp:http` - Start MCP server with HTTP transport (for RestAssured)
- `npm run mcp:dev` - Start MCP server in development mode with auto-reload

### API Documentation (Swagger/OpenAPI)
- **URL**: http://localhost:3030/api-docs
- **File**: `/docs/api/swagger.yaml`
- **Setup**: Automatically enabled when running `npm run dev`
- **Requirements**: Main server must be running on port 3030

## Architecture Overview

This is a personal finance API built with Node.js, Express, and PostgreSQL. The application follows an MVC architecture with clear separation of concerns.

### Core Structure
- **Models**: Sequelize ORM with PostgreSQL, using `finanzas` schema
- **Controllers**: Split into API controllers (`src/controllers/api/`) and view controllers (`src/controllers/views/`)
- **Services**: Business logic layer for complex operations
- **Database**: PostgreSQL 15 with Docker, configured for Argentina timezone (`-03:00`)

### Key Models and Relationships
The application manages different types of expenses through specialized models:

1. **Gasto** (Base expense model) - Main expense tracking
2. **GastoUnico** - One-time expenses
3. **GastoRecurrente** - Recurring expenses with frequency
4. **DebitoAutomatico** - Automatic debits (subscriptions, services)
5. **Compra** - Installment purchases

All expense models relate to:
- **TipoPago** (Payment methods: cash, debit, credit, transfer)
- **CategoriaGasto** (Categories: rent, groceries, transportation, etc.)
- **ImportanciaGasto** (Importance: essential, nice to have, dispensable)
- **Tarjeta** (Credit cards with closing/due dates)

### Database Configuration
- PostgreSQL runs in Docker with pgAdmin
- Default connection: localhost:5432, database `finanzas_personal`
- Schema: `finanzas` (all tables are namespaced)
- Timezone: Argentina (-03:00)
- Development: Auto-sync with `alter: true`

### Controller Architecture
Uses a base controller pattern (`src/controllers/api/base.controller.js`) with:
- CRUD operations inheritance
- Consistent error handling
- Joi validation integration
- Standard HTTP response patterns

### Service Layer
Business logic is centralized in services:
- **gastoGenerator.service.js** - Generates pending expenses from recurring/automatic debits
- Domain-specific services for complex operations

### Dependency Injection (DI)
The application uses **Awilix** for dependency injection:
- **Container**: `src/container/index.js` - Registers all services, strategies, and models
- **Middleware**: `src/middlewares/container.middleware.js` - Creates request-scoped DI
- **TransactionManager**: `src/container/transactionManager.js` - Clean transaction handling

Services that use DI (like `GastoUnicoService`) receive dependencies via constructor:
```javascript
// Example: Getting a service from the container in a controller
const gastoUnicoService = getService(req, 'gastoUnicoService');
```

DI benefits:
- **Testability**: Services can be easily mocked in tests
- **Separation of concerns**: Controllers coordinate, services handle business logic
- **Transaction safety**: `TransactionManager` provides consistent commit/rollback

### Testing Setup
- Jest with experimental VM modules (ES6 support)
- Supertest for API integration tests
- Separate test database configuration
- Test setup script handles Docker + seeding

### Environment Requirements
- Node.js 18+
- Docker Desktop
- Environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

### Web Interface
- Handlebars templates for HTML views
- Method override for PUT/DELETE from forms
- Dashboard and CRUD interfaces at root path `/`
- API endpoints at `/api`

## Important Notes

- All database operations use the `finanzas` schema
- Date handling is configured for Argentina timezone
- The expense generation system creates future expenses from recurring patterns
- Credit card integration tracks closing dates and due dates for proper expense timing