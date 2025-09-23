# Architecture Documentation

This directory contains comprehensive documentation about the application's architecture, patterns, and design decisions.

## 📁 Contents

- **[Strategy Pattern](./strategy-pattern.md)** - Expense generation strategies
- **[Service Layer](./service-layer.md)** - BaseService and domain services
- **[Database Design](./database-design.md)** - Schema, relationships, and migrations
- **[Business Rules](./business-rules.md)** - Complete business logic documentation
- **[MCP Integration](./mcp-integration.md)** - Model Context Protocol setup and usage

## 🏗️ Current Architecture

The application follows a **clean architecture** approach with clear separation of concerns:

```
┌─────────────────┐
│   Controllers   │  ← HTTP layer (Express)
├─────────────────┤
│    Services     │  ← Business logic layer (BaseService + Domain Services)
├─────────────────┤
│   Strategies    │  ← Expense generation patterns (Strategy Pattern)
├─────────────────┤
│     Models      │  ← Data layer (Sequelize ORM)
├─────────────────┤
│   Database      │  ← PostgreSQL with schema `finanzas`
└─────────────────┘
```

## 🎯 Key Patterns

1. **Strategy Pattern** - For expense generation from different sources
2. **Service Layer** - BaseService eliminates CRUD duplication
3. **Dependency Injection** - Services use strategy instances
4. **Transaction Safety** - All operations use database transactions
5. **SOLID Principles** - Single Responsibility, Open/Closed, etc.

## 📊 Metrics

- **Code Reduction**: ~300 lines of duplicate code eliminated
- **Services**: 4/4 migrated to BaseService pattern
- **Strategies**: 5 specialized expense generation strategies
- **Test Coverage**: Services 41%, Strategies 70%
- **Transaction Safety**: 100% of write operations