# Tests Structure

Este proyecto usa una estructura de tests centralizada y organizada por tipo y componente.

## Estructura de Directorios

```
tests/
├── unit/              # Tests unitarios
│   ├── controllers/   # Tests de controllers
│   ├── services/      # Tests de services
│   ├── models/        # Tests de models
│   ├── strategies/    # Tests de strategies
│   └── utils/         # Tests de utilidades
├── integration/       # Tests de integración
└── e2e/              # Tests end-to-end
```

## Configuración

- **Jest Config**: `jest.config.js` en la raíz del proyecto
- **Setup File**: `tests/setup.js` configura el entorno de testing
- **Environment**: Usa archivos `.env.test` para configuración de testing

## Tests Principales

### Tests Unitarios de Services (`tests/unit/services/`)
- `services.basic.test.js`: Tests básicos que verifican que todos los services se instancien correctamente y tengan los métodos esperados

### Tests de Integración (`tests/integration/`)
- `services-strategies.integration.test.js`: Tests que verifican la integración completa entre Services ↔ Strategies ↔ Database

### Tests de Controllers (`tests/unit/controllers/`)
- `gastoUnico.controller.test.js`: Test del controller principal actualizado post-migración

### Tests de Strategies (`tests/unit/strategies/`)
- `strategies.test.js`: Tests de las estrategias de generación de gastos

## Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm test:watch

# Ejecutar tests con coverage
npm test:coverage

# Ejecutar solo tests de la nueva estructura
npm test -- --testPathPatterns="tests/"

# Ejecutar test específico
npm test -- --testNamePattern="Services Basic Tests"
```

## Migración de Tests Legacy

Los tests han sido migrados desde la estructura dispersa (`src/**/__tests__/`) a esta estructura centralizada. Los tests legacy que tenían problemas de compatibilidad con la nueva arquitectura de clases han sido removidos.

### Tests Funcionales Post-Migración
- ✅ **Services Basic Tests**: Verifican instanciación y métodos de todos los services
- ✅ **Integration Tests**: Test principal de orquestación GastoGeneratorService
- ✅ **Controller Tests**: gastoUnico.controller.test.js actualizado para nueva arquitectura

### Coverage Actual
- **Services**: ~6% coverage (tests básicos de instanciación)
- **Strategies**: Variable coverage según complejidad
- **Controllers**: Coverage limitado pero funcional

## Notas de Migración

1. Todos los services ahora son clases que extienden `BaseService`
2. Los tests legacy que usaban exports de funciones han sido actualizados o removidos
3. Los mocks se han actualizado para trabajar con la nueva arquitectura de clases
4. La configuración de Jest incluye tanto la nueva estructura como ubicaciones legacy durante la transición