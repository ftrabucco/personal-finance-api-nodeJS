# API Gastos - Endpoints y Casos de Uso

Este documento describe el comportamiento completo de los endpoints de la API `/api/gastos` después de la estandarización implementada.

## 📋 Resumen de Endpoints (Estado Real)

| Endpoint | Método | Propósito | Estado | Respuesta |
|----------|---------|-----------|--------|-----------|
| `/api/gastos` | GET | Obtener gastos con filtros opcionales y paginación | ✅ IMPLEMENTADO | Lista filtrada |
| `/api/gastos/:id` | GET | Obtener un gasto específico | ✅ IMPLEMENTADO | Gasto individual |
| `/api/gastos/summary` | GET | Estadísticas agregadas por período | ✅ IMPLEMENTADO | Resumen estadístico |
| `/api/gastos/generate` | GET | Generar gastos pendientes | ✅ IMPLEMENTADO | Resultado de generación |
| `/api/gastos` | POST | Crear nuevo gasto | ✅ IMPLEMENTADO | Gasto creado |
| `/api/gastos/:id` | PUT | Actualizar gasto existente | ✅ IMPLEMENTADO | Gasto actualizado |
| `/api/gastos/:id` | DELETE | Eliminar gasto | ✅ IMPLEMENTADO | Confirmación |
| `/api/gastos/all` | GET | Obtener todos los gastos sin filtros | ❌ NO IMPLEMENTADO | - |
| `/api/gastos/search` | POST | Búsquedas complejas con paginación | ❌ NO IMPLEMENTADO* | - |

> *Nota: La lógica de búsqueda existe en el controlador pero no está expuesta en las rutas.

---

## 🔍 Detalle de Endpoints

### ❌ Endpoints No Implementados

Los siguientes endpoints están documentados pero **NO están implementados** en el código actual:

- `GET /api/gastos/all` - Obtener todos los gastos sin filtros
- `POST /api/gastos/search` - Búsquedas complejas (lógica existe, ruta no)

---

### 1. GET `/api/gastos`
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

### 2. GET `/api/gastos/:id`
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

### 4. GET `/api/gastos/summary`
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

### 5. GET `/api/gastos/generate`
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

### 6. POST `/api/gastos`
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

### 7. PUT `/api/gastos/:id` & DELETE `/api/gastos/:id`
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
17. **Consulta sin límite** - `/api/gastos` (sin parámetro limit)
18. **Paginación con offset alto** - `/api/gastos?limit=10&offset=10000`
19. **Múltiples filtros simultáneos** - Combinación de todos los filtros
20. **Consulta con resumen de datos grandes** - `/api/gastos/summary` con rangos amplios

### Pruebas de Consistencia
21. **Verificar estructura de respuesta** - Todos los endpoints devuelven formato estándar
22. **Verificar metadata** - `meta` incluye información correcta
23. **Verificar paginación** - `hasNext/hasPrev` calculados correctamente  
24. **Verificar timestamps** - Errores incluyen timestamp válido
25. **Verificar relaciones** - Objetos relacionados incluidos correctamente

---

## 💡 Recomendaciones para Validar Gastos Generados

### Para validar que se generó el gasto real después de crear un gasto único:

**✅ Recomendado:** `GET /api/gastos/:id` (Más específico)
```javascript
// 1. Crear gasto único
const gastoUnicoResponse = await POST('/api/gastos-unicos', data);
const gastoRealId = gastoUnicoResponse.data.gasto.id;

// 2. Validar que el gasto real existe
const gastoReal = await GET(`/api/gastos/${gastoRealId}`);
assert(gastoReal.data.tipo_origen === 'gasto_unico');
assert(gastoReal.data.descripcion === data.descripcion);
```

**⚠️ Alternativo:** `GET /api/gastos` con filtros (Más robusta pero menos eficiente)
```javascript
// Buscar gastos que vengan de este gasto único específico
const gastos = await GET(`/api/gastos?fecha_desde=${data.fecha}&fecha_hasta=${data.fecha}&categoria_gasto_id=${data.categoria_gasto_id}`);
const gastoEncontrado = gastos.data.find(g => g.descripcion === data.descripcion);
assert(gastoEncontrado !== undefined);
```

---

## 💱 API Tipo de Cambio - Sistema Multi-Moneda

### Resumen de Endpoints

| Endpoint | Método | Propósito | Estado | Autenticación |
|----------|---------|-----------|--------|---------------|
| `/api/tipo-cambio` | GET | Obtener historial de tipos de cambio | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio/actual` | GET | Obtener tipo de cambio más reciente | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio/fecha/:fecha` | GET | Obtener TC por fecha específica | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio/:id` | GET | Obtener TC por ID | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio` | POST | Crear TC manualmente | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio/:id` | DELETE | Eliminar TC | ✅ IMPLEMENTADO | Requerida |
| `/api/tipo-cambio/actualizar` | POST | Forzar actualización desde APIs externas | ✅ IMPLEMENTADO | Requerida |

---

### 1. GET `/api/tipo-cambio`
**Propósito:** Obtener historial de tipos de cambio USD/ARS con filtros opcionales.

**Parámetros de Query:**
| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `fecha` | date (ISO) | Filtrar por fecha específica | `2024-01-15` |
| `fecha_desde` | date (ISO) | Fecha inicio del rango | `2024-01-01` |
| `fecha_hasta` | date (ISO) | Fecha fin del rango | `2024-01-31` |
| `fuente` | string | Filtrar por fuente | `BCRA`, `DolarAPI` |
| `limit` | number (1-100) | Límite de resultados | `30` (default) |
| `offset` | number (≥0) | Offset para paginación | `0` (default) |

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fecha": "2024-01-15",
      "valor_compra": 995.50,
      "valor_venta": 1005.50,
      "fuente": "BCRA",
      "createdAt": "2024-01-15T00:05:00Z",
      "updatedAt": "2024-01-15T00:05:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "type": "collection"
  }
}
```

**Casos de uso:**
```bash
# Historial del último mes
GET /api/tipo-cambio?fecha_desde=2024-01-01&fecha_hasta=2024-01-31

# Solo tipos de cambio del BCRA
GET /api/tipo-cambio?fuente=BCRA&limit=10

# Tipo de cambio de una fecha específica
GET /api/tipo-cambio?fecha=2024-01-15
```

---

### 2. GET `/api/tipo-cambio/actual`
**Propósito:** Obtener el tipo de cambio más reciente (última fecha registrada).

**Parámetros:** Ninguno

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2024-01-15",
    "valor_compra": 995.50,
    "valor_venta": 1005.50,
    "fuente": "BCRA"
  },
  "meta": {
    "type": "single"
  }
}
```

**Respuesta cuando no hay datos (404):**
```json
{
  "success": false,
  "error": "No se encontró ningún tipo de cambio",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Casos de uso:**
- Consultar TC antes de crear un gasto/compra en USD
- Mostrar TC actual en dashboard
- Calcular conversión en tiempo real para el usuario

---

### 3. GET `/api/tipo-cambio/fecha/:fecha`
**Propósito:** Obtener tipo de cambio de una fecha específica con fallback automático.

**Parámetros:**
- `fecha` (path): Fecha en formato YYYY-MM-DD

**Comportamiento con fallback:**
- Si existe registro para esa fecha → lo devuelve
- Si NO existe → devuelve el más cercano anterior (fallback)
- Si no hay ninguno anterior → error 404

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2024-01-15",
    "valor_compra": 995.50,
    "valor_venta": 1005.50,
    "fuente": "BCRA"
  },
  "meta": {
    "type": "single"
  }
}
```

**Casos de uso:**
```bash
# TC de una fecha específica
GET /api/tipo-cambio/fecha/2024-01-15

# TC histórico (usa fallback si no existe esa fecha exacta)
GET /api/tipo-cambio/fecha/2024-01-20
```

---

### 4. GET `/api/tipo-cambio/:id`
**Propósito:** Obtener un tipo de cambio específico por su ID.

**Parámetros:**
- `id` (path): ID numérico del registro de tipo de cambio

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2024-01-15",
    "valor_compra": 995.50,
    "valor_venta": 1005.50,
    "fuente": "BCRA"
  }
}
```

**Casos de uso:**
- Ver detalles de un TC específico
- Auditoría de registros históricos
- Referencias desde gastos/compras que usan ese TC

---

### 5. POST `/api/tipo-cambio`
**Propósito:** Crear un tipo de cambio manualmente (para correcciones o cuando falla la API externa).

**Cuerpo de la petición:**
```json
{
  "fecha": "2024-01-15",       // Requerido, formato YYYY-MM-DD
  "valor_compra": 995.50,      // Requerido, positivo
  "valor_venta": 1005.50,      // Requerido, positivo
  "fuente": "manual"           // Opcional, default: "manual"
}
```

**Validaciones:**
- `fecha` debe ser válida (YYYY-MM-DD)
- `valor_compra` y `valor_venta` deben ser números positivos
- `fuente` es opcional (default: "manual")

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2024-01-15",
    "valor_compra": 995.50,
    "valor_venta": 1005.50,
    "fuente": "manual",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Casos de uso:**
- Corregir datos históricos
- Agregar TC manualmente cuando fallan las APIs externas
- Cargar datos de un período anterior al inicio del sistema

---

### 6. DELETE `/api/tipo-cambio/:id`
**Propósito:** Eliminar un registro de tipo de cambio.

**⚠️ Advertencia:** Eliminar tipos de cambio históricos puede afectar la integridad de gastos/compras que los utilizaron. Solo usar en casos de corrección de errores.

**Parámetros:**
- `id` (path): ID del registro a eliminar

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "message": "Tipo de cambio eliminado correctamente"
  }
}
```

**Casos de uso:**
- Eliminar duplicados
- Corregir errores de carga
- Limpieza de datos de prueba

---

### 7. POST `/api/tipo-cambio/actualizar`
**Propósito:** Forzar una actualización del tipo de cambio desde las APIs externas.

**⚠️ Nota:** El scheduler ejecuta esto automáticamente a las 00:00 diariamente. Este endpoint es para actualizaciones manuales.

**Fuentes consultadas (en orden):**
1. **DolarAPI.com** (primaria) - Dólar oficial
2. **BCRA** (fallback) - Si falla DolarAPI

**Parámetros:** Ninguno

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "message": "Tipo de cambio actualizado exitosamente",
    "tipoCambio": {
      "id": 1,
      "fecha": "2024-01-15",
      "valor_compra": 995.50,
      "valor_venta": 1005.50,
      "fuente": "DolarAPI"
    },
    "fuente": "DolarAPI"
  }
}
```

**Respuesta de error (500):**
```json
{
  "success": false,
  "error": "Error al obtener tipo de cambio desde APIs externas",
  "details": "Ambas fuentes (DolarAPI y BCRA) fallaron",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Casos de uso:**
- Botón "Actualizar TC" en dashboard
- Actualización inmediata después de un deploy
- Forzar actualización si el scheduler falló
- Testing de integración con APIs externas

---

## 💱 Campos Multi-Moneda en Endpoints de Gastos

Los siguientes endpoints ahora incluyen soporte multi-moneda (USD/ARS):

### Campos añadidos a modelos:

**GastoUnico, GastoRecurrente, DebitoAutomatico:**
```json
{
  "monto": 100.00,              // Monto en moneda original
  "moneda_origen": "USD",       // "ARS" o "USD" (default: "ARS")
  "monto_ars": 100000.00,       // Calculado automáticamente
  "monto_usd": 100.00,          // Calculado automáticamente
  "tipo_cambio_usado": 1000.00  // TC usado para conversión (snapshot)
}
```

**Compra:**
```json
{
  "monto_total": 120000.00,           // Monto total en moneda original
  "moneda_origen": "ARS",             // "ARS" o "USD" (default: "ARS")
  "monto_total_ars": 120000.00,       // Calculado automáticamente
  "monto_total_usd": 120.00,          // Calculado automáticamente
  "tipo_cambio_usado": 1000.00        // TC usado para conversión
}
```

### Validación Joi:

**Campos permitidos para el usuario:**
- `monto` (o `monto_total` para compras) - Requerido
- `moneda_origen` - Opcional (default: "ARS")

**Campos calculados por el backend (Joi.forbidden()):**
- `monto_ars` / `monto_total_ars`
- `monto_usd` / `monto_total_usd`
- `tipo_cambio_usado` / `tipo_cambio_referencia`

Si el usuario intenta enviar campos calculados, recibirá error 400:
```json
{
  "success": false,
  "error": "Error de validación",
  "details": [
    {
      "field": "monto_usd",
      "message": "\"monto_usd\" is not allowed"
    }
  ]
}
```

### Ejemplo de creación con multi-moneda:

**Crear gasto en USD:**
```bash
POST /api/gastos-unicos
{
  "descripcion": "Suscripción Netflix",
  "monto": 15.00,
  "moneda_origen": "USD",        # El backend calculará automáticamente ARS
  "fecha": "2024-01-15",
  "categoria_gasto_id": 5,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 3
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "descripcion": "Suscripción Netflix",
    "monto": 15.00,
    "moneda_origen": "USD",
    "monto_ars": 15075.00,         # Calculado: 15 * 1005
    "monto_usd": 15.00,
    "tipo_cambio_usado": 1005.00,  # Snapshot del TC al momento de creación
    "fecha": "2024-01-15",
    ...
  }
}
```

---

## 🧪 Casos de Prueba Multi-Moneda

### Pruebas Funcionales - Tipo de Cambio
1. **Obtener TC actual** - `GET /api/tipo-cambio/actual`
2. **Obtener TC por fecha existente** - `GET /api/tipo-cambio/fecha/2024-01-15`
3. **Obtener TC con fallback** - `GET /api/tipo-cambio/fecha/2024-01-16` (fecha sin registro)
4. **Crear TC manualmente** - `POST /api/tipo-cambio`
5. **Actualizar TC desde API externa** - `POST /api/tipo-cambio/actualizar`
6. **Filtrar TC por fuente** - `GET /api/tipo-cambio?fuente=BCRA`
7. **Paginación de TC** - `GET /api/tipo-cambio?limit=10&offset=10`

### Pruebas Funcionales - Gastos Multi-Moneda
8. **Crear gasto en USD** - Verificar conversión automática a ARS
9. **Crear gasto en ARS** - Verificar conversión automática a USD
10. **Crear compra en USD** - Verificar cálculo de cuotas en ambas monedas
11. **Verificar snapshot de TC** - El TC usado no cambia si se actualiza el TC actual

### Pruebas de Validación - Multi-Moneda
12. **Enviar monto_ars explícito** - Debe rechazarse (Joi.forbidden)
13. **Enviar monto_usd explícito** - Debe rechazarse (Joi.forbidden)
14. **Moneda origen inválida** - Debe aceptar solo "ARS" o "USD"
15. **Crear gasto sin TC disponible** - Debe usar fallback o error claro

### Pruebas de Integridad
16. **TC usado permanece constante** - Gasto creado con TC=1000 no cambia si TC actual pasa a 1100
17. **Gastos recurrentes actualizan TC** - Cada vez que se genera, usa el TC actual (se actualiza diariamente)
18. **Conversión bidireccional correcta** - `monto_ars / tipo_cambio = monto_usd`