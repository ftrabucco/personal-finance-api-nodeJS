# Personal Finance API

A complete REST API for personal finance management, built with Node.js, Express and PostgreSQL.

## 🚀 Features

- **Complete expense management** (one-time, recurring, installment purchases)
- **Automatic debits** (subscriptions, services)
- **Multi-currency support** (USD/ARS) with automatic conversion and historical snapshots
- **Category system** (rent, groceries, transportation, etc.)
- **Importance control** (essential, nice to have, dispensable)
- **Multiple payment methods** (cash, debit, credit, transfer)
- **Credit card management** with closing and due dates
- **Daily exchange rate updates** from external APIs (DolarAPI Blue + BCRA)
- **Web interface** with Handlebars for visualization
- **PostgreSQL database** with Docker for development

## 🛠️ Tech Stack

- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL 15 with Docker
- **ORM**: Sequelize 6
- **Validation**: Joi for data schemas
- **Logging**: Winston for structured logs
- **Frontend**: Handlebars for HTML views
- **Architecture**: Strategy Pattern + BaseService + Clean Architecture
- **Testing**: Jest with centralized test structure
- **MCP Integration**: Model Context Protocol for external access

## 📚 Documentation

For complete documentation, architecture details, API reference, and testing guides:

👉 **[Complete Documentation](./docs/README.md)**

Quick links:
- 🏗️ **[Architecture Overview](./docs/architecture/README.md)** - Strategy Pattern, services, database design
- 🔌 **[API Reference](./docs/api/)** - Endpoints, schemas, and examples
- 🧪 **[Testing Guide](./docs/testing/)** - Test structure and MCP integration
- 🤖 **[MCP Server](./docs/testing/mcp-integration.md)** - Model Context Protocol setup

## 📋 Prerequisites

- **Node.js** 18+
- **Docker Desktop** for macOS/Windows
- **npm** or **yarn**

## 🚀 Installation and Setup

### 1. Clone repository
```bash
git clone https://github.com/ftrabucco/personal-finance-api-nodeJS.git
cd personal-finance-api-nodeJS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
# Copy example file
cp env.example .env

# Edit .env if you need to change configuration
# Default values:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=finanzas_personal
# DB_USER=postgres
# DB_PASSWORD=postgres123
```

### 4. Start database with Docker
```bash
# Start PostgreSQL and pgAdmin
npm run docker:up

# Wait for them to be ready (30 seconds)
sleep 30

# Verify they're running
docker ps
```

### 5. Insert initial data
```bash
npm run seed-db
```

### 6. Start development server
```bash
npm run dev
```

## 🌐 Access to tools

- **API**: http://localhost:3030
- **pgAdmin**: http://localhost:8080
  - Email: `admin@finanzas.com`
  - Password: `admin123`
- **PostgreSQL**: localhost:5432

## 🗄️ Explore the Database

### Option 1: pgAdmin (Recommended for development)
1. Go to http://localhost:8080
2. Login: `admin@finanzas.com` / `admin123`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `finanzas_personal`
   - Username: `postgres`
   - Password: `postgres123`

### Option 2: Command line
```bash
# Connect from container
docker exec -it finanzas_postgres psql -U postgres -d finanzas_personal

# Useful commands:
\dt finanzas.*          # See all tables
\d finanzas.gastos      # See gastos table structure
SELECT * FROM finanzas.categorias_gasto;  # See categories
\q                      # Exit
```

### Option 3: External GUI clients
- **TablePlus** (macOS): https://tableplus.com/
- **DBeaver** (free): https://dbeaver.io/

## 📚 Available commands

```bash
# Development
npm run dev              # Server with nodemon
npm start               # Production server

# Database
npm run docker:up       # Start PostgreSQL + pgAdmin
npm run docker:down     # Stop services
npm run docker:logs     # View Docker logs
npm run docker:restart  # Restart services
npm run seed-db         # Insert initial data
npm run reset-db        # Reset DB (deletes data)

# Migrations
npm run db:migrate                  # Run migrations
npm run db:migrate:multi-currency   # Run multi-currency migrations

# Security
npm run generate-secrets            # Generate secure JWT/Session secrets

# Testing
npm test                           # Run all tests
npm run test:watch                 # Run tests in watch mode
npm run test:coverage              # Run tests with coverage
```

## 🏗️ Project Structure

```
src/
├── controllers/         # API controllers
│   ├── api/           # API endpoints
│   └── views/         # View controllers
├── db/                # Database configuration
│   ├── postgres.js    # PostgreSQL configuration
│   └── seed.js        # Initial data
├── middlewares/       # Express middlewares
├── models/            # Sequelize models
│   └── associations.js # Model relationships
├── routes/            # Route definitions
├── services/          # Business logic
├── utils/             # Utilities (logger, helpers)
└── validations/       # Joi validation schemas
```

## 🔧 API Endpoints

### Expenses (Gastos)
- `GET /api/gastos` - Get expenses with filters
- `GET /api/gastos/all` - Get all expenses
- `GET /api/gastos/:id` - Get expense by ID
- `POST /api/gastos` - Create new expense
- `PUT /api/gastos/:id` - Update expense
- `DELETE /api/gastos/:id` - Delete expense
- `GET /api/gastos/summary` - Get expense summary
- `GET /api/gastos/generate` - Generate pending expenses

### Purchases (Compras)
- `GET /api/compras` - Get all purchases
- `GET /api/compras/:id` - Get purchase by ID
- `POST /api/compras` - Create new purchase
- `PUT /api/compras/:id` - Update purchase
- `DELETE /api/compras/:id` - Delete purchase

### Recurring Expenses (Gastos Recurrentes)
- `GET /api/gastos-recurrentes` - Get all recurring expenses
- `GET /api/gastos-recurrentes/:id` - Get recurring expense by ID
- `POST /api/gastos-recurrentes` - Create new recurring expense
- `PUT /api/gastos-recurrentes/:id` - Update recurring expense
- `DELETE /api/gastos-recurrentes/:id` - Delete recurring expense

### Automatic Debits (Débitos Automáticos)
- `GET /api/debitos-automaticos` - Get all automatic debits
- `GET /api/debitos-automaticos/:id` - Get automatic debit by ID
- `POST /api/debitos-automaticos` - Create new automatic debit
- `PUT /api/debitos-automaticos/:id` - Update automatic debit
- `DELETE /api/debitos-automaticos/:id` - Delete automatic debit

### One-time Expenses (Gastos Únicos)
- `GET /api/gastos-unicos` - Get all one-time expenses
- `GET /api/gastos-unicos/:id` - Get one-time expense by ID
- `POST /api/gastos-unicos` - Create new one-time expense
- `PUT /api/gastos-unicos/:id` - Update one-time expense
- `DELETE /api/gastos-unicos/:id` - Delete one-time expense

### Exchange Rates (Tipo de Cambio) 💱
- `GET /api/tipo-cambio` - Get exchange rate history with filters
- `GET /api/tipo-cambio/actual` - Get current exchange rate (latest)
- `GET /api/tipo-cambio/fecha/:fecha` - Get exchange rate by date (with fallback)
- `GET /api/tipo-cambio/:id` - Get exchange rate by ID
- `POST /api/tipo-cambio` - Create exchange rate manually
- `POST /api/tipo-cambio/actualizar` - Force update from external APIs
- `DELETE /api/tipo-cambio/:id` - Delete exchange rate

## 💱 Multi-Currency System

### Features
- **Dual Currency Storage**: All expenses store both ARS and USD amounts
- **Automatic Conversion**: Backend calculates conversions automatically
- **Historical Snapshots**: Exchange rate used is stored with each transaction
- **Daily Updates**: Scheduler fetches latest rates at 00:00 from:
  - DolarAPI.com (primary source - Dólar oficial)
  - BCRA (fallback source)
- **Flexible Input**: Users can create expenses in either ARS or USD
- **Integrity**: Historical exchange rates remain unchanged (snapshot approach)

### Usage Example
```bash
# Create expense in USD (backend converts to ARS automatically)
POST /api/gastos-unicos
{
  "descripcion": "Netflix Subscription",
  "monto": 15.00,
  "moneda_origen": "USD",
  "fecha": "2024-01-15",
  "categoria_gasto_id": 5,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 3
}

# Response includes both currencies and exchange rate snapshot
{
  "id": 123,
  "monto": 15.00,
  "moneda_origen": "USD",
  "monto_ars": 15075.00,      # Calculated: 15 * 1005
  "monto_usd": 15.00,
  "tipo_cambio_usado": 1005.00,  # Snapshot for historical integrity
  ...
}
```

### Documentation
For complete multi-currency documentation:
- **[Multi-Currency API Guide](./docs/api/multicurrency-api.md)** - Complete API reference
- **[Business Rules](./docs/architecture/business-rules.md#4-sistema-multi-moneda-usdars)** - Architecture and business logic

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Current status: 124/129 tests passing (96%)
```

## 🚀 Deployment

**📖 Guías de deployment disponibles:**

- **[DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md)** - ⭐ **RECOMENDADO** - Deployment en Render con Node.js nativo
- **[DEPLOYMENT_RENDER_DOCKER.md](./DEPLOYMENT_RENDER_DOCKER.md)** - Deployment en Render con Docker (avanzado)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía general para cualquier plataforma

### Quick Start - Render (Recomendado)

#### 1. Generar secretos seguros

```bash
npm run generate-secrets
```

#### 2. Crear PostgreSQL Database en Render

- New + → PostgreSQL → Name: `finanzas-db`

#### 3. Crear Web Service en Render

- New + → Web Service → Conecta repo
- Build: `npm ci --only=production`
- Start: `npm start`

#### 4. Configurar Environment Variables

En Render Dashboard, agrega:
- `DATABASE_URL` (Internal DB URL)
- `JWT_SECRET` y `SESSION_SECRET` (del paso 1)
- `CORS_ORIGIN=https://tu-frontend.com`
- `NODE_ENV=production`

#### 5. Setup BD (una sola vez desde tu máquina)

```bash
# Ejecutar migraciones
npm run db:migrate:multi-currency

# Seed data
npm run seed-db

# Tipo de cambio inicial
curl -X POST https://tu-api.onrender.com/api/tipo-cambio/actualizar
```

**✅ Listo!** API live en `https://tu-servicio.onrender.com`

---

**📖 Guía completa**: [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md)

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is under ISC License.

## 👨‍💻 Author

Fran - [trabucco.francisco@gmail.com](mailto:trabucco.francisco@gmail.com)

## 🙏 Acknowledgments

- Sequelize ORM
- Express.js
- PostgreSQL
- Docker