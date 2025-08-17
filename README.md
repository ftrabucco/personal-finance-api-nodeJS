# Personal Finance API

A complete REST API for personal finance management, built with Node.js, Express and PostgreSQL.

## 🚀 Features

- **Complete expense management** (one-time, recurring, installment purchases)
- **Automatic debits** (subscriptions, services)
- **Category system** (rent, groceries, transportation, etc.)
- **Importance control** (essential, nice to have, dispensable)
- **Multiple payment methods** (cash, debit, credit, transfer)
- **Credit card management** with closing and due dates
- **Web interface** with Handlebars for visualization
- **PostgreSQL database** with Docker for development

## 🛠️ Tech Stack

- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL 15 with Docker
- **ORM**: Sequelize 6
- **Validation**: Joi for data schemas
- **Logging**: Winston for structured logs
- **Frontend**: Handlebars for HTML views
- **Pattern**: MVC with reusable base controllers

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

# Others
npm run db:migrate      # Run migrations
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

## 🧪 Testing

```bash
# To be implemented
npm test
```

## 🚀 Deployment

### Environment variables for production
```bash
NODE_ENV=production
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=finanzas_prod
DB_USER=prod_user
DB_PASSWORD=secure_password
```

### With Docker
```bash
# Build image
docker build -t finanzas-api .

# Run
docker run -p 3030:3030 --env-file .env finanzas-api
```

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