# 💱 Guía Completa: Servicio de Tipo de Cambio

> **Última actualización:** 2025-10-20
> **Estado:** ✅ 100% Funcional
> **Responsable:** Exchange Rate Scheduler

---

## 📊 **ESTADO ACTUAL DEL SERVICIO**

### ✅ **Completitud: 100%**

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **Modelo** | ✅ 100% | [TipoCambio.model.js](../../src/models/TipoCambio.model.js) |
| **Service** | ✅ 100% | [ExchangeRateService](../../src/services/exchangeRate.service.js) |
| **Controller** | ✅ 100% | [TipoCambioController](../../src/controllers/api/tipoCambio.controller.js) |
| **Endpoints** | ✅ 100% | 5 endpoints REST funcionando |
| **Scheduler** | ✅ 100% | [ExchangeRateScheduler](../../src/schedulers/exchangeRateScheduler.js) |
| **Integración APIs** | ✅ 100% | DolarAPI + BCRA |
| **Caché** | ✅ 100% | TTL 1 hora |
| **Documentación** | ✅ 100% | Swagger + Endpoints.md |

### 📈 **Datos en Base de Datos**

```
Total de registros: 4
Rango de fechas: 2025-10-17 hasta 2025-10-20
Fuentes: api_dolar_api, manual
Registros activos: 4
```

---

## 🏗️ **ARQUITECTURA**

### **Componentes Principales:**

```
┌─────────────────────────────────────────────────────────────┐
│                    TIPO DE CAMBIO SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│  Controller  │────────▶│   Service    │
│              │         │              │         │              │
│ POST /manual │         │ Validación   │         │ Lógica de    │
│ GET /actual  │         │ Autenticación│         │ Negocio      │
│ POST /convert│         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                 │                        │
                                 ▼                        ▼
                         ┌──────────────┐         ┌──────────────┐
                         │  TipoCambio  │         │  APIs        │
                         │   Model      │         │  Externas    │
                         │  (Sequelize) │         │              │
                         │              │         │ DolarAPI     │
                         │ PostgreSQL   │         │ BCRA         │
                         └──────────────┘         └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│              EXCHANGE RATE SCHEDULER (Cron)                  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 00:00 diario (antes de ExpenseScheduler 00:05)        │  │
│  │                                                         │  │
│  │  1. Actualizar TC desde API (DolarAPI → BCRA)         │  │
│  │  2. Recalcular GastoRecurrente (tipo_cambio_ref)      │  │
│  │  3. Recalcular DebitoAutomatico (tipo_cambio_ref)     │  │
│  │  4. Recalcular Compras pendientes                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 **ENDPOINTS DISPONIBLES**

### **1. GET /api/tipo-cambio/actual**
Obtiene el tipo de cambio actual (más reciente y activo).

**Request:**
```http
GET /api/tipo-cambio/actual
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "fecha": "2025-10-20",
    "valor_compra_usd_ars": 1040.00,
    "valor_venta_usd_ars": 1050.00,
    "fuente": "api_dolar_api",
    "activo": true,
    "ultima_actualizacion": "2025-10-20T03:00:15.234Z"
  }
}
```

**Casos de uso:**
- Mostrar TC actual en el dashboard
- Calcular conversiones en tiempo real en el frontend
- Validar si hay TC disponible antes de crear gastos

---

### **2. GET /api/tipo-cambio/historico**
Obtiene el historial de tipos de cambio con filtros opcionales.

**Request:**
```http
GET /api/tipo-cambio/historico?fecha_desde=2025-10-01&fecha_hasta=2025-10-20&fuente=api_dolar_api&limit=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `fecha_desde` (opcional): Filtrar desde fecha (YYYY-MM-DD)
- `fecha_hasta` (opcional): Filtrar hasta fecha (YYYY-MM-DD)
- `fuente` (opcional): Filtrar por fuente ('manual', 'api_dolar_api', 'api_bcra')
- `limit` (opcional): Cantidad de registros (default: 30)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 4,
    "filtros": {
      "fecha_desde": "2025-10-01",
      "fecha_hasta": "2025-10-20",
      "fuente": "api_dolar_api",
      "limit": "30"
    },
    "datos": [
      {
        "fecha": "2025-10-20",
        "valor_compra_usd_ars": 1040.00,
        "valor_venta_usd_ars": 1050.00,
        "fuente": "api_dolar_api",
        "activo": true
      },
      {
        "fecha": "2025-10-19",
        "valor_compra_usd_ars": 1035.00,
        "valor_venta_usd_ars": 1045.00,
        "fuente": "api_dolar_api",
        "activo": true
      }
    ]
  }
}
```

**Casos de uso:**
- Gráfico de evolución del TC
- Reportes históricos
- Análisis de tendencias

---

### **3. POST /api/tipo-cambio/manual**
Configura un tipo de cambio manualmente.

**Request:**
```http
POST /api/tipo-cambio/manual
Authorization: Bearer <token>
Content-Type: application/json

{
  "fecha": "2025-10-20",
  "valor_compra_usd_ars": 1040.00,
  "valor_venta_usd_ars": 1050.00
}
```

**Campos:**
- `fecha` (opcional): Fecha del TC (default: hoy)
- `valor_compra_usd_ars` (opcional): Valor de compra (default: igual a venta)
- `valor_venta_usd_ars` (**obligatorio**): Valor de venta

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "mensaje": "Tipo de cambio configurado exitosamente",
    "tipo_cambio": {
      "fecha": "2025-10-20",
      "valor_compra_usd_ars": 1040.00,
      "valor_venta_usd_ars": 1050.00,
      "fuente": "manual",
      "activo": true
    }
  }
}
```

**Casos de uso:**
- Configurar TC inicial del sistema
- Corregir TC incorrecto
- Override del TC automático por uno más preciso
- Testing y desarrollo

---

### **4. POST /api/tipo-cambio/actualizar**
Actualiza el tipo de cambio desde una API externa.

**Request:**
```http
POST /api/tipo-cambio/actualizar
Authorization: Bearer <token>
Content-Type: application/json

{
  "fuente": "auto"
}
```

**Campos:**
- `fuente` (opcional): "auto" | "dolarapi" | "bcra" (default: "auto")
  - `auto`: Intenta DolarAPI, luego BCRA
  - `dolarapi`: Solo DolarAPI
  - `bcra`: Solo BCRA

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "mensaje": "Tipo de cambio actualizado exitosamente",
    "tipo_cambio": {
      "fecha": "2025-10-20",
      "valor_compra_usd_ars": 1040.00,
      "valor_venta_usd_ars": 1050.00,
      "fuente": "api_dolar_api",
      "activo": true
    }
  }
}
```

**Casos de uso:**
- Actualización manual bajo demanda
- Testing de integración con APIs
- Forzar actualización fuera del scheduler

---

### **5. POST /api/tipo-cambio/convertir**
Convierte un monto entre monedas usando el TC actual.

**Request:**
```http
POST /api/tipo-cambio/convertir
Authorization: Bearer <token>
Content-Type: application/json

{
  "monto": 1500,
  "moneda_origen": "USD"
}
```

**Campos:**
- `monto` (**obligatorio**): Monto a convertir (> 0)
- `moneda_origen` (**obligatorio**): "ARS" o "USD"

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "monto_original": 1500,
    "moneda_origen": "USD",
    "conversion": {
      "monto_ars": 1575000.00,
      "monto_usd": 1500.00,
      "tipo_cambio_usado": 1050.00,
      "fecha_tipo_cambio": "2025-10-20"
    }
  }
}
```

**Casos de uso:**
- Calculadora de conversión en el frontend
- Preview de conversión antes de crear gasto
- Validación de cálculos

---

## ⏰ **EXCHANGE RATE SCHEDULER**

### **Configuración:**

```javascript
// Ubicación: src/schedulers/exchangeRateScheduler.js

// Schedule: 00:00 diario (timezone: America/Argentina/Buenos_Aires)
Cron: '0 0 * * *'

// Orden de ejecución:
// 1. ExchangeRateScheduler → 00:00
// 2. ExpenseScheduler      → 00:05

// Esto garantiza que los gastos se generen con el TC más reciente
```

### **Proceso de Actualización Diaria:**

```
┌─────────────────────────────────────────────────────────┐
│          EXCHANGE RATE SCHEDULER - 00:00                │
└─────────────────────────────────────────────────────────┘

1️⃣  Actualizar TC desde API Externa
    ├─ Intenta DolarAPI (más confiable, gratuita)
    ├─ Si falla → intenta BCRA
    └─ Si ambas fallan → usa último TC conocido

2️⃣  Recalcular Gastos Recurrentes Activos
    ├─ Busca todos los GastoRecurrente con activo=true
    ├─ Para cada uno:
    │  ├─ Calcula monto_ars y monto_usd con nuevo TC
    │  └─ Actualiza tipo_cambio_referencia
    └─ Log: "✅ N gastos recurrentes actualizados"

3️⃣  Recalcular Débitos Automáticos Activos
    ├─ Busca todos los DebitoAutomatico con activo=true
    ├─ Para cada uno:
    │  ├─ Calcula monto_ars y monto_usd con nuevo TC
    │  └─ Actualiza tipo_cambio_referencia
    └─ Log: "✅ N débitos automáticos actualizados"

4️⃣  Recalcular Compras con Cuotas Pendientes
    ├─ Busca todas las Compra con pendiente_cuotas=true
    ├─ Para cada una:
    │  ├─ Calcula monto_total_ars y monto_total_usd con nuevo TC
    │  └─ Actualiza tipo_cambio_usado
    └─ Log: "✅ N compras actualizadas"

✅ Resultado: Todo listo para que ExpenseScheduler genere
   gastos con el TC actualizado del día
```

### **Estadísticas del Scheduler:**

```javascript
// Obtener stats en runtime:
const stats = ExchangeRateScheduler.getStats();

// Respuesta:
{
  lastExecution: "2025-10-20T03:00:00.000Z",
  lastSuccess: "2025-10-20T03:00:15.234Z",
  lastError: null,
  totalExecutions: 45,
  successfulExecutions: 44,
  failedExecutions: 1,
  isRunning: true,
  nextExecution: "2025-10-21T03:00:00.000Z"
}
```

---

## 🧪 **CÓMO VALIDAR EL SERVICIO**

### **Test 1: Verificar que hay TC disponible**

```bash
# Opción A: Via API
curl -X GET http://localhost:3030/api/tipo-cambio/actual \
  -H "Authorization: Bearer <token>"

# Opción B: Via Base de Datos
docker exec finanzas_postgres psql -U postgres -d finanzas_personal \
  -c "SELECT * FROM finanzas.tipos_cambio ORDER BY fecha DESC LIMIT 5;"
```

**Resultado esperado:**
- ✅ Response 200 con TC actual
- ✅ Fecha reciente (máximo 1-2 días atrás)
- ✅ `activo: true`
- ✅ Valores > 0

---

### **Test 2: Configurar TC manual**

```bash
curl -X POST http://localhost:3030/api/tipo-cambio/manual \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_venta_usd_ars": 1050.00,
    "valor_compra_usd_ars": 1040.00
  }'
```

**Resultado esperado:**
- ✅ Response 201 Created
- ✅ TC guardado con fuente="manual"
- ✅ Verificar en BD que se creó el registro

---

### **Test 3: Actualizar desde API externa**

```bash
curl -X POST http://localhost:3030/api/tipo-cambio/actualizar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fuente": "auto"}'
```

**Resultado esperado:**
- ✅ Response 200 OK
- ✅ TC actualizado con fuente="api_dolar_api" o "api_bcra"
- ✅ Valor realista (ej: entre 900-1200 en 2025)

---

### **Test 4: Conversión de montos**

```bash
curl -X POST http://localhost:3030/api/tipo-cambio/convertir \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 100,
    "moneda_origen": "USD"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "monto_original": 100,
    "moneda_origen": "USD",
    "conversion": {
      "monto_ars": 105000.00,     // ✅ 100 * 1050
      "monto_usd": 100.00,         // ✅ Valor original
      "tipo_cambio_usado": 1050.00,
      "fecha_tipo_cambio": "2025-10-20"
    }
  }
}
```

---

### **Test 5: Validar Scheduler funcionando**

```bash
# Revisar logs del servidor
docker logs finanzas_api | grep "Exchange Rate Scheduler"

# O ver en la consola del npm run dev:
# Buscar líneas como:
# "🚀 Exchange Rate Scheduler iniciado exitosamente"
# "💱 INICIANDO ACTUALIZACIÓN DIARIA DE TIPO DE CAMBIO"
```

**Resultado esperado:**
- ✅ "Exchange Rate Scheduler iniciado exitosamente"
- ✅ "nextExecution: <fecha futura>"
- ✅ Si ya corrió hoy: "✅ ACTUALIZACIÓN DIARIA COMPLETADA EXITOSAMENTE"

---

### **Test 6: Verificar que recurrentes se actualizan**

```bash
# Crear un gasto recurrente con moneda USD
curl -X POST http://localhost:3030/api/gastos-recurrentes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Suscripción Netflix",
    "monto": 15.99,
    "moneda_origen": "USD",
    "dia_de_pago": 5,
    "frecuencia_gasto_id": 1,
    "categoria_gasto_id": 4,
    "importancia_gasto_id": 2,
    "tipo_pago_id": 3
  }'

# Verificar que tiene tipo_cambio_referencia
# Luego esperar a la medianoche (00:00) y verificar que se actualizó
```

**Resultado esperado:**
- ✅ Al crear: `tipo_cambio_referencia = <TC actual>`
- ✅ Después de scheduler: `tipo_cambio_referencia = <TC nuevo>`
- ✅ `monto_ars` y `monto_usd` recalculados

---

## ❌ **TROUBLESHOOTING**

### **Problema 1: No hay tipo de cambio disponible**

**Error:**
```json
{
  "success": false,
  "error": "No hay tipo de cambio configurado"
}
```

**Solución:**
```bash
# Configurar TC manual
curl -X POST http://localhost:3030/api/tipo-cambio/manual \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"valor_venta_usd_ars": 1050.00}'
```

---

### **Problema 2: Scheduler no se ejecuta**

**Diagnóstico:**
```bash
# Ver logs del servidor
docker logs finanzas_api | grep -i "scheduler"

# Verificar configuración
cat .env | grep SCHEDULER
```

**Posibles causas:**
- Config `SCHEDULER_ENABLED=false`
- Error en zona horaria
- Servidor no corriendo 24/7

**Solución:**
```bash
# Habilitar scheduler en .env
SCHEDULER_ENABLED=true
SCHEDULER_RUN_ON_STARTUP=false  # o true para ejecutar al iniciar
SCHEDULER_TIMEZONE=America/Argentina/Buenos_Aires

# Reiniciar servidor
npm run dev
```

---

### **Problema 3: API externa falla (DolarAPI/BCRA)**

**Error:**
```
"❌ No se pudo obtener el tipo de cambio de ninguna fuente externa"
```

**Solución:**
1. Verificar conexión a internet
2. Usar TC manual como fallback:
   ```bash
   curl -X POST http://localhost:3030/api/tipo-cambio/manual \
     -H "Authorization: Bearer <token>" \
     -d '{"valor_venta_usd_ars": 1050.00}'
   ```

---

### **Problema 4: Conversión da resultados incorrectos**

**Ejemplo:** 100 USD → 105 ARS (debería ser ~105,000 ARS)

**Causa:** TC configurado incorrectamente (ej: 1.05 en vez de 1050)

**Solución:**
```bash
# Verificar TC actual
curl -X GET http://localhost:3030/api/tipo-cambio/actual \
  -H "Authorization: Bearer <token>"

# Si está mal, configurar correctamente
curl -X POST http://localhost:3030/api/tipo-cambio/manual \
  -H "Authorization: Bearer <token>" \
  -d '{"valor_venta_usd_ars": 1050.00}'  # ✅ Correcto
```

---

## 📋 **CHECKLIST DE VALIDACIÓN**

### **Setup Inicial:**
- [ ] ✅ Servidor corriendo (`npm run dev`)
- [ ] ✅ PostgreSQL accesible
- [ ] ✅ Al menos 1 TC en BD
- [ ] ✅ TC activo con fecha reciente
- [ ] ✅ Scheduler iniciado (ver logs)

### **Endpoints:**
- [ ] ✅ GET /actual → Response 200 con TC
- [ ] ✅ GET /historico → Response 200 con array
- [ ] ✅ POST /manual → Response 201, TC guardado
- [ ] ✅ POST /actualizar → Response 200, TC desde API
- [ ] ✅ POST /convertir → Response 200, conversión correcta

### **Scheduler:**
- [ ] ✅ Scheduler iniciado al arrancar servidor
- [ ] ✅ Próxima ejecución programada (nextExecution)
- [ ] ✅ Si ya corrió hoy: lastSuccess con timestamp
- [ ] ✅ Stats mostrando ejecuciones exitosas

### **Integración con Multi-Currency:**
- [ ] ✅ Crear GastoUnico en USD → `tipo_cambio_usado` presente
- [ ] ✅ Crear Compra en USD → `tipo_cambio_usado` presente
- [ ] ✅ GastoRecurrente activo → `tipo_cambio_referencia` se actualiza diariamente
- [ ] ✅ Conversiones correctas (USD → ARS y viceversa)

---

## 🎯 **QUÉ FALTA (Mejoras Futuras)**

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| **Bulk Upload** | 🟡 Media | Endpoint para cargar múltiples TCs (datos históricos) |
| **Notificaciones** | 🟡 Media | Alertar si scheduler falla 2+ días seguidos |
| **Gráfico Evolución** | 🟢 Baja | Endpoint `/grafico` con datos para chart.js |
| **Cache Redis** | 🟢 Baja | Reemplazar caché en memoria por Redis |
| **Más APIs** | 🟢 Baja | Integrar con más fuentes (Ambito, InfoDolar) |
| **Predicción TC** | 🟢 Baja | ML para predecir TC futuro (experimental) |

---

## 📚 **REFERENCIAS**

- **Modelo:** [TipoCambio.model.js](../../src/models/TipoCambio.model.js)
- **Service:** [ExchangeRateService](../../src/services/exchangeRate.service.js)
- **Controller:** [TipoCambioController](../../src/controllers/api/tipoCambio.controller.js)
- **Scheduler:** [ExchangeRateScheduler](../../src/schedulers/exchangeRateScheduler.js)
- **Endpoints:** [ENDPOINTS.md](../api/endpoints.md)
- **Swagger:** http://localhost:3030/api-docs

---

**Generado por:** Sistema Personal Finance API v1.0
**Última revisión:** 2025-10-20
**Próxima auditoría:** 2025-11-01
