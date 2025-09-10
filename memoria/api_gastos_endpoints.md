# API Gastos - Endpoints y Casos de Uso

Este documento describe el comportamiento completo de los endpoints de la API `/api/gastos` después de la estandarización implementada.

## 📋 Resumen de Endpoints

| Endpoint | Método | Propósito | Respuesta |
|----------|---------|-----------|-----------|
| `/api/gastos/all` | GET | Obtener todos los gastos sin filtros | Lista completa |
| `/api/gastos` | GET | Obtener gastos con filtros opcionales y paginación | Lista filtrada |
| `/api/gastos/:id` | GET | Obtener un gasto específico | Gasto individual |
| `/api/gastos/search` | POST | Búsquedas complejas con paginación | Lista paginada |
| `/api/gastos/summary` | GET | Estadísticas agregadas por período | Resumen estadístico |
| `/api/gastos/generate` | GET | Generar gastos pendientes | Resultado de generación |
| `/api/gastos` | POST | Crear nuevo gasto | Gasto creado |
| `/api/gastos/:id` | PUT | Actualizar gasto existente | Gasto actualizado |
| `/api/gastos/:id` | DELETE | Eliminar gasto | Confirmación |

---

## 🔍 Detalle de Endpoints

### 1. GET `/api/gastos/all`
**Propósito:** Obtener todos los gastos sin aplicar filtros ni paginación.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fecha": "2024-01-14",
      "monto_ars": "500.00",
      "monto_usd": null,
      "descripcion": "Reparación auto",
      "categoria": {...},
      "importancia": {...},
      "tipoPago": {...}
    }
  ],
  "meta": {
    "total": 150,
    "type": "collection"
  }
}
```

**Casos de uso:**
- Dashboard inicial con todos los gastos
- Exportación completa de datos
- Vista general sin restricciones

---

### 2. GET `/api/gastos`
**Propósito:** Obtener gastos con filtros opcionales y paginación inteligente.

**Parámetros de Query:**
| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `categoria_gasto_id` | number | Filtrar por categoría | `5` |
| `importancia_gasto_id` | number | Filtrar por importancia | `1` |
| `tipo_pago_id` | number | Filtrar por tipo de pago | `3` |
| `tarjeta_id` | number | Filtrar por tarjeta | `2` |
| `fecha_desde` | date (ISO) | Fecha inicio | `2024-01-01` |
| `fecha_hasta` | date (ISO) | Fecha fin | `2024-12-31` |
| `monto_min_ars` | number | Monto mínimo ARS | `100` |
| `monto_max_ars` | number | Monto máximo ARS | `5000` |
| `monto_min_usd` | number | Monto mínimo USD | `10` |
| `monto_max_usd` | number | Monto máximo USD | `500` |
| `limit` | number (1-1000) | Cantidad de resultados | `20` |
| `offset` | number (≥0) | Saltar resultados | `40` |
| `orderBy` | string | Campo ordenamiento | `fecha`, `monto_ars`, `descripcion`, `createdAt` |
| `orderDirection` | string | Dirección orden | `ASC`, `DESC` (default: `DESC`) |

**Comportamiento:**
- **Sin `limit`**: Devuelve todos los resultados filtrados (respuesta estándar)
- **Con `limit`**: Devuelve respuesta paginada con metadata de navegación

**Respuesta sin paginación:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 25,
    "type": "collection"
  }
}
```

**Respuesta con paginación:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "type": "collection",
    "pagination": {
      "limit": 20,
      "offset": 40,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

**Casos de uso:**
```bash
# Gastos de entretenimiento, últimos 10
GET /api/gastos?categoria_gasto_id=5&limit=10

# Gastos del mes actual por monto descendente  
GET /api/gastos?fecha_desde=2024-01-01&fecha_hasta=2024-01-31&orderBy=monto_ars&orderDirection=DESC

# Página 3 de gastos esenciales
GET /api/gastos?importancia_gasto_id=1&limit=20&offset=40

# Gastos entre $100-$1000 ordenados por fecha
GET /api/gastos?monto_min_ars=100&monto_max_ars=1000&orderBy=fecha
```

---

### 3. GET `/api/gastos/:id`
**Propósito:** Obtener un gasto específico con todas sus relaciones.

**Parámetros:**
- `id` (path): ID numérico del gasto

**Respuestas:**
```json
// Éxito (200)
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2024-01-14",
    "monto_ars": "500.00",
    "categoria": {...},
    "importancia": {...},
    "tipoPago": {...},
    "tarjeta": {...}
  }
}

// No encontrado (404)
{
  "success": false,
  "error": "Gasto no encontrado",
  "timestamp": "2025-09-10T00:35:00.434Z"
}
```

**Casos de uso:**
- Detalle de gasto individual
- Formulario de edición
- Vista modal de gasto

---

### 4. POST `/api/gastos/search`
**Propósito:** Búsquedas complejas con filtros avanzados y paginación obligatoria.

**Cuerpo de la petición:**
```json
{
  "categoria_gasto_id": 5,
  "importancia_gasto_id": 1,
  "frecuencia_gasto_id": null,
  "tipo_pago_id": 3,
  "tarjeta_id": 2,
  "fecha_desde": "2024-01-01",
  "fecha_hasta": "2024-12-31",
  "monto_min_ars": 100,
  "monto_max_ars": 5000,
  "monto_min_usd": 10,
  "monto_max_usd": 500,
  "limit": 20,
  "offset": 0,
  "orderBy": "fecha",
  "orderDirection": "DESC"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 63,
    "type": "collection",
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Casos de uso:**
- Búsquedas desde formularios complejos
- Filtros avanzados con múltiples criterios
- Aplicaciones SPA con estado de búsqueda
- Búsquedas guardadas/favoritas

---

### 5. GET `/api/gastos/summary`
**Propósito:** Obtener estadísticas agregadas y resúmenes por período.

**Parámetros de Query:**
| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| `fecha_desde` | date (ISO) | Fecha inicio del período | Primer día del mes actual |
| `fecha_hasta` | date (ISO) | Fecha fin del período | Último día del mes actual |

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "desde": "2025-09-01",
      "hasta": "2025-09-30"
    },
    "total_ars": 3317375.34,
    "total_usd": 0,
    "cantidad_gastos": 20,
    "por_categoria": {
      "Entretenimiento": {
        "total_ars": 1302398.16,
        "total_usd": 0,
        "cantidad": 7
      }
    },
    "por_importancia": {
      "Esencial": {
        "total_ars": 101700,
        "total_usd": 0,
        "cantidad": 6
      }
    },
    "por_tipo_pago": {
      "Efectivo": {
        "total_ars": 287764.08,
        "total_usd": 0,
        "cantidad": 10
      }
    }
  }
}
```

**Casos de uso:**
```bash
# Resumen del mes actual
GET /api/gastos/summary

# Resumen del año 2024
GET /api/gastos/summary?fecha_desde=2024-01-01&fecha_hasta=2024-12-31

# Resumen del último trimestre
GET /api/gastos/summary?fecha_desde=2024-10-01&fecha_hasta=2024-12-31
```

- Dashboards con gráficos y métricas
- Reportes financieros
- Análisis de gastos por período
- KPIs y estadísticas

---

### 6. GET `/api/gastos/generate`
**Propósito:** Ejecutar la generación automática de gastos pendientes.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_generated": 5,
      "total_errors": 0,
      "breakdown": {
        "recurrentes": 2,
        "debitos": 1,
        "compras": 2,
        "unicos": 0
      }
    },
    "details": {
      "success": [
        {"type": "recurrente", "id": 123},
        {"type": "compra", "id": 456}
      ],
      "errors": []
    }
  },
  "message": "Generación de gastos completada exitosamente"
}
```

**Casos de uso:**
- Ejecución manual del job de generación
- Botón "Generar gastos pendientes" en dashboard
- Webhook o trigger desde sistema externo
- Testing de generación automática

---

### 7. POST `/api/gastos`
**Propósito:** Crear un nuevo gasto en la tabla principal.

**Validación del cuerpo:**
```json
{
  "fecha": "2024-01-15",           // Requerido, no puede ser futura
  "monto_ars": 500.50,             // Opcional, positivo
  "monto_usd": 25.30,              // Opcional, positivo
  "descripcion": "Nuevo gasto",    // Requerido, 3-255 caracteres
  "categoria_gasto_id": 5,         // Requerido, debe existir
  "importancia_gasto_id": 1,       // Requerido, debe existir
  "frecuencia_gasto_id": 2,        // Opcional, debe existir si se proporciona
  "cantidad_cuotas_totales": 6,    // Opcional, 1-60
  "cantidad_cuotas_pagadas": 2,    // Opcional, ≤ cuotas_totales
  "tipo_pago_id": 3,               // Opcional, debe existir
  "tarjeta_id": 2,                 // Opcional, debe existir
  "usuario_id": 1,                 // Opcional, debe existir
  "tipo_origen": "unico",          // Requerido: unico|recurrente|debito_automatico|compra
  "id_origen": 123                 // Requerido, debe existir en tabla origen
}
```

**Validaciones:**
- Al menos `monto_ars` o `monto_usd` debe proporcionarse
- Todos los IDs de referencia deben existir en sus respectivas tablas
- `cantidad_cuotas_pagadas` ≤ `cantidad_cuotas_totales`

---

### 8. PUT `/api/gastos/:id` & DELETE `/api/gastos/:id`
**Propósito:** Actualizar o eliminar gastos existentes.

**Comportamiento:**
- PUT: Misma validación que POST, actualiza campos proporcionados
- DELETE: Eliminación física del registro
- Ambos devuelven error 404 si el ID no existe

---

## ⚠️ Manejo de Errores Estandardizado

### Errores de Validación (400)
```json
{
  "success": false,
  "error": "Error de validación",
  "details": [
    {
      "field": "categoria_gasto_id",
      "message": "\"categoria_gasto_id\" must be a number",
      "value": "invalid"
    }
  ],
  "timestamp": "2025-09-10T00:41:36.418Z"
}
```

### Recurso No Encontrado (404)
```json
{
  "success": false,
  "error": "Gasto no encontrado",
  "timestamp": "2025-09-10T00:35:00.434Z"
}
```

### Error del Servidor (500)
```json
{
  "success": false,
  "error": "Error al obtener gastos",
  "details": "Database connection failed",
  "timestamp": "2025-09-10T00:35:00.434Z"
}
```

---

## 🧪 Casos de Prueba Recomendados

### Pruebas de Funcionalidad
1. **Obtener todos los gastos** - `/api/gastos/all`
2. **Filtrar por categoría** - `/api/gastos?categoria_gasto_id=5`
3. **Paginación básica** - `/api/gastos?limit=10&offset=20`
4. **Ordenamiento** - `/api/gastos?orderBy=monto_ars&orderDirection=DESC`
5. **Filtros combinados** - `/api/gastos?categoria_gasto_id=5&fecha_desde=2024-01-01&limit=5`
6. **Búsqueda compleja** - `POST /api/gastos/search`
7. **Gasto individual existente** - `/api/gastos/1`
8. **Gasto individual inexistente** - `/api/gastos/999`
9. **Resumen del mes** - `/api/gastos/summary`
10. **Generar gastos** - `/api/gastos/generate`

### Pruebas de Validación
11. **Parámetros inválidos** - `/api/gastos?limit=invalid`
12. **Límite excedido** - `/api/gastos?limit=2000`
13. **Fechas inválidas** - `/api/gastos?fecha_desde=invalid-date`
14. **Rangos inválidos** - `/api/gastos?monto_min_ars=1000&monto_max_ars=100`
15. **Crear gasto sin datos** - `POST /api/gastos {}`
16. **Crear gasto con IDs inexistentes** - `POST /api/gastos {categoria_gasto_id: 999}`

### Pruebas de Rendimiento
17. **Consulta sin límite** - `/api/gastos/all`
18. **Paginación con offset alto** - `/api/gastos?limit=10&offset=10000`
19. **Múltiples filtros simultáneos** - Combinación de todos los filtros
20. **Búsqueda compleja con resultados grandes** - `POST /api/gastos/search`

### Pruebas de Consistencia
21. **Verificar estructura de respuesta** - Todos los endpoints devuelven formato estándar
22. **Verificar metadata** - `meta` incluye información correcta
23. **Verificar paginación** - `hasNext/hasPrev` calculados correctamente  
24. **Verificar timestamps** - Errores incluyen timestamp válido
25. **Verificar relaciones** - Objetos relacionados incluidos correctamente