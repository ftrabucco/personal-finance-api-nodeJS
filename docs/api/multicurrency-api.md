# 💱 Sistema Multi-Moneda USD/ARS - API Documentation

> **Version:** 1.0.0
> **Last Updated:** October 2025
> **Branch:** feature/multi-currency-system

## Overview

El sistema multi-moneda permite gestionar gastos en **pesos argentinos (ARS)** y **dólares estadounidenses (USD)** con conversión automática basada en tipos de cambio actualizados diariamente.

### Key Features
- ✅ Automatic ARS ↔ USD conversion when creating expenses
- ✅ Dual storage of amounts (`monto_ars` + `monto_usd`)
- ✅ Exchange rate snapshot stored with each transaction
- ✅ Daily automatic exchange rate updates (00:00 AM)
- ✅ Realistic projections with updated exchange rates
- ✅ Integration with external APIs (DolarAPI + BCRA)
- ✅ Manual exchange rate configuration support
- ✅ Backward compatibility with legacy data

---

## API Endpoints

### Exchange Rate Management

#### GET /api/tipo-cambio/actual
Get the current active exchange rate.

**Auth:** Required (JWT Bearer token)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "fecha": "2025-10-15",
    "valor_compra_usd_ars": 1195.50,
    "valor_venta_usd_ars": 1205.50,
    "fuente": "api_dolar_api",
    "activo": true,
    "ultima_actualizacion": "2025-10-15T03:00:00Z"
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "No hay tipo de cambio configurado"
}
```

---

#### GET /api/tipo-cambio/historico
Get historical exchange rates with optional filters.

**Auth:** Required (JWT Bearer token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fecha_desde | string (YYYY-MM-DD) | No | Start date filter |
| fecha_hasta | string (YYYY-MM-DD) | No | End date filter |
| fuente | enum | No | Source filter: 'manual', 'api_bcra', 'api_dolar_api' |
| limit | integer | No | Limit results (default: 30, max: 100) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "filtros": {
      "fecha_desde": "2025-10-01",
      "fecha_hasta": "2025-10-15",
      "fuente": null,
      "limit": 30
    },
    "datos": [
      {
        "fecha": "2025-10-15",
        "valor_compra_usd_ars": 1195.50,
        "valor_venta_usd_ars": 1205.50,
        "fuente": "api_dolar_api",
        "activo": true
      }
    ]
  }
}
```

---

#### POST /api/tipo-cambio/manual
Manually configure an exchange rate for a specific date.

**Auth:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "fecha": "2025-10-15",              // Optional (default: today)
  "valor_compra_usd_ars": 1195.50,    // Optional
  "valor_venta_usd_ars": 1205.50      // Required
}
```

**Validation Rules:**
- `valor_venta_usd_ars` is required and must be > 0
- `valor_compra_usd_ars` defaults to `valor_venta_usd_ars` if not provided
- `fecha` defaults to current date if not provided
- If an exchange rate already exists for the date, it will be updated

**Response 201:**
```json
{
  "success": true,
  "data": {
    "mensaje": "Tipo de cambio configurado exitosamente",
    "tipo_cambio": {
      "fecha": "2025-10-15",
      "valor_compra_usd_ars": 1195.50,
      "valor_venta_usd_ars": 1205.50,
      "fuente": "manual",
      "activo": true
    }
  }
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "Validación fallida",
  "details": "valor_venta_usd_ars debe ser un número positivo"
}
```

---

#### POST /api/tipo-cambio/actualizar
Update exchange rate from external API.

**Auth:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "fuente": "auto"  // Options: 'auto', 'bcra', 'dolarapi'
}
```

**Source Options:**
- `auto`: Try DolarAPI first, fallback to BCRA if it fails
- `dolarapi`: Only use DolarAPI
- `bcra`: Only use BCRA API

**Response 200:**
```json
{
  "success": true,
  "data": {
    "mensaje": "Tipo de cambio actualizado exitosamente",
    "tipo_cambio": {
      "fecha": "2025-10-15",
      "valor_compra_usd_ars": 1195.50,
      "valor_venta_usd_ars": 1205.50,
      "fuente": "api_dolar_api",
      "activo": true
    }
  }
}
```

**Response 503:**
```json
{
  "success": false,
  "error": "Error al actualizar tipo de cambio",
  "details": "No se pudo obtener el tipo de cambio de ninguna fuente externa"
}
```

---

#### POST /api/tipo-cambio/convertir
Convert an amount between currencies using current exchange rate.

**Auth:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "monto": 100,
  "moneda_origen": "USD"  // 'ARS' or 'USD'
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "monto_original": 100,
    "moneda_origen": "USD",
    "conversion": {
      "monto_ars": 120550.00,
      "monto_usd": 100.00,
      "tipo_cambio_usado": 1205.50,
      "fecha_tipo_cambio": "2025-10-15"
    }
  }
}
```

---

## Multi-Currency Fields in Existing Endpoints

### POST /api/gastos-unicos
Create a one-time expense with multi-currency support.

**New Optional Fields:**
```json
{
  "descripcion": "Compra en Amazon",
  "monto": 100,
  "moneda_origen": "USD",  // 💱 New field (default: 'ARS')
  "fecha": "2025-10-15",
  "categoria_gasto_id": 1,
  "importancia_gasto_id": 1,
  "tipo_pago_id": 1,
  "tarjeta_id": 1  // Optional
}
```

**Automatic Conversion:**
The system automatically calculates:
- `monto_ars` = 100 × 1205.50 = 120,550
- `monto_usd` = 100
- `tipo_cambio_usado` = 1205.50

**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "moneda_origen": "USD",
    "monto_ars": 120550.00,
    "monto_usd": 100.00,
    "tipo_cambio_usado": 1205.50,
    // ... other fields
  }
}
```

---

### POST /api/compras
Create an installment purchase with multi-currency support.

**New Optional Fields:**
```json
{
  "descripcion": "Compra en cuotas",
  "monto_total": 50000,
  "moneda_origen": "ARS",  // 💱 New field
  "cantidad_cuotas": 12,
  "fecha_compra": "2025-10-15",
  "categoria_gasto_id": 1,
  "importancia_gasto_id": 1,
  "tipo_pago_id": 3,
  "tarjeta_id": 1
}
```

**Response includes:**
```json
{
  "data": {
    "moneda_origen": "ARS",
    "monto_total_ars": 50000.00,
    "monto_total_usd": 41.46,  // 50000 / 1205.50
    "tipo_cambio_usado": 1205.50,
    // ... other fields
  }
}
```

---

### POST /api/gastos-recurrentes
Create a recurring expense with multi-currency support.

**New Optional Fields:**
```json
{
  "descripcion": "Alquiler mensual",
  "monto": 920000,
  "moneda_origen": "ARS",  // 💱 New field
  "dia_de_pago": 5,
  "frecuencia_gasto_id": 4,
  "categoria_gasto_id": 1,
  "importancia_gasto_id": 1,
  "tipo_pago_id": 4
}
```

**Important:** Recurring expenses are **updated daily** by the scheduler to reflect current exchange rates.

---

### POST /api/debitos-automaticos
Create an automatic debit with multi-currency support.

**New Optional Fields:**
```json
{
  "descripcion": "Netflix",
  "monto": 15,
  "moneda_origen": "USD",  // 💱 New field
  "dia_de_pago": 10,
  "frecuencia_gasto_id": 4,
  "categoria_gasto_id": 8,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 3,
  "tarjeta_id": 1
}
```

---

## Database Schema

### New Table: tipos_cambio

```sql
CREATE TABLE finanzas.tipos_cambio (
  fecha DATE PRIMARY KEY,
  valor_compra_usd_ars DECIMAL(10,2) NOT NULL,
  valor_venta_usd_ars DECIMAL(10,2) NOT NULL,
  fuente VARCHAR(20) NOT NULL CHECK (fuente IN ('manual', 'api_bcra', 'api_dolar_api', 'api_otros')),
  activo BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tipos_cambio_fecha ON finanzas.tipos_cambio(fecha DESC);
CREATE INDEX idx_tipos_cambio_activo ON finanzas.tipos_cambio(activo);
```

### Updated Tables

#### gastos_unico
**New columns:**
- `moneda_origen` VARCHAR(3) DEFAULT 'ARS'
- `monto_ars` DECIMAL(10,2)
- `monto_usd` DECIMAL(10,2)
- `tipo_cambio_usado` DECIMAL(10,2)

#### compras
**New columns:**
- `moneda_origen` VARCHAR(3) DEFAULT 'ARS'
- `monto_total_ars` DECIMAL(10,2)
- `monto_total_usd` DECIMAL(10,2)
- `tipo_cambio_usado` DECIMAL(10,2)

#### gastos_recurrentes
**New columns:**
- `moneda_origen` VARCHAR(3) DEFAULT 'ARS'
- `monto_ars` DECIMAL(10,2)
- `monto_usd` DECIMAL(10,2)
- `tipo_cambio_referencia` DECIMAL(10,2)

#### debitos_automaticos
**New columns:**
- `moneda_origen` VARCHAR(3) DEFAULT 'ARS'
- `monto_ars` DECIMAL(10,2)
- `monto_usd` DECIMAL(10,2)
- `tipo_cambio_referencia` DECIMAL(10,2)

---

## Business Rules

### 1. Conversion on Creation
- If `moneda_origen = 'USD'` → calculates `monto_ars` using current exchange rate
- If `moneda_origen = 'ARS'` → calculates `monto_usd` using current exchange rate
- Always saves `tipo_cambio_usado` as a snapshot for historical integrity

### 2. Daily Update (Scheduler)
**Execution:** Every day at 00:00 AM
**Actions:**
1. Update exchange rate from DolarAPI (with BCRA fallback)
2. Recalculate `monto_ars` and `monto_usd` for:
   - Active recurring expenses
   - Active automatic debits
   - Pending installments from purchases

**Why:** Ensures realistic future projections (e.g., rent in ARS changes its USD value month by month)

### 3. One-Time Expenses
- **Are NOT updated** after creation (historical snapshot)
- Conversion happens only once at creation time

### 4. Backward Compatibility
- Legacy data without `moneda_origen` → defaults to 'ARS'
- Legacy data without `monto_ars`/`monto_usd` → uses `monto` as ARS amount

---

## External APIs

### DolarAPI (Primary)
**URL:** https://dolarapi.com/v1/dolares/oficial
**Rate Limit:** Unlimited (free tier)
**Response Format:**
```json
{
  "compra": 1195.50,
  "venta": 1205.50,
  "fecha": "2025-10-15"
}
```

### BCRA API (Fallback)
**URL:** https://api.bcra.gob.ar/estadisticas/v1/
**Rate Limit:** Limited
**Usage:** Only when DolarAPI fails

---

## Error Handling

### Common Error Responses

#### 404 - Exchange Rate Not Found
```json
{
  "success": false,
  "error": "No hay tipo de cambio configurado",
  "details": "Por favor configure un tipo de cambio manualmente o ejecute la actualización desde API"
}
```

#### 400 - Validation Error
```json
{
  "success": false,
  "error": "Validación fallida",
  "details": "valor_venta_usd_ars debe ser un número positivo"
}
```

#### 503 - External API Unavailable
```json
{
  "success": false,
  "error": "Error al actualizar tipo de cambio",
  "details": "No se pudo obtener el tipo de cambio de ninguna fuente externa"
}
```

---

## Testing Examples

### Example 1: Create Expense in USD
```bash
curl -X POST http://localhost:3030/api/gastos-unicos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Amazon Purchase",
    "monto": 50,
    "moneda_origen": "USD",
    "fecha": "2025-10-15",
    "categoria_gasto_id": 1,
    "importancia_gasto_id": 1,
    "tipo_pago_id": 3,
    "tarjeta_id": 1
  }'
```

**Expected:**
- `monto_usd` = 50
- `monto_ars` = 50 × current_exchange_rate
- `tipo_cambio_usado` = current_exchange_rate

### Example 2: Set Manual Exchange Rate
```bash
curl -X POST http://localhost:3030/api/tipo-cambio/manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_venta_usd_ars": 1250.00
  }'
```

### Example 3: Get Current Exchange Rate
```bash
curl -X GET http://localhost:3030/api/tipo-cambio/actual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 4: Convert Amount
```bash
curl -X POST http://localhost:3030/api/tipo-cambio/convertir \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 100,
    "moneda_origen": "USD"
  }'
```

---

## Performance Considerations

### Caching
- Exchange rate service uses 1-hour TTL cache
- Reduces database hits for frequently accessed rates
- Cache is invalidated when rates are updated

### Database Indexes
```sql
CREATE INDEX idx_tipos_cambio_fecha ON finanzas.tipos_cambio(fecha DESC);
CREATE INDEX idx_tipos_cambio_activo ON finanzas.tipos_cambio(activo);
```

### Scheduler Performance
- Runs daily at 00:00 AM
- Updates all recurring expenses and debits in batch
- Uses transactions for data consistency

---

## Migration Guide

### Running Migrations
```bash
# Apply all pending migrations
npm run migrate

# Rollback if needed
npm run migrate:undo
```

### Migration Files
- `005_create_tipos_cambio_table.sql` - Creates exchange rate table
- `006_add_multi_currency_to_gastos_unico.sql` - Adds multi-currency to one-time expenses
- `007_add_multi_currency_to_compras.sql` - Adds multi-currency to purchases
- `008_add_multi_currency_to_gastos_recurrentes.sql` - Adds multi-currency to recurring expenses
- `009_add_multi_currency_to_debitos_automaticos.sql` - Adds multi-currency to automatic debits

---

## Support & Troubleshooting

### Common Issues

**Issue:** No exchange rate configured
```
Solution: POST /api/tipo-cambio/manual to set initial rate
```

**Issue:** External API failing
```
Solution: System automatically falls back to BCRA API
          Manual configuration always works as fallback
```

**Issue:** Incorrect conversions
```
Solution: Verify current exchange rate with GET /api/tipo-cambio/actual
          Check tipo_cambio_usado field in created records
```

---

## Changelog

### Version 1.0.0 (October 2025)
- ✅ Initial multi-currency system implementation
- ✅ TipoCambio model and exchange rate service
- ✅ Daily scheduler for automatic updates
- ✅ Integration with DolarAPI and BCRA
- ✅ Multi-currency support in all expense types
- ✅ REST API endpoints for exchange rate management
- ✅ Backward compatibility with legacy data

---

## Related Documentation
- [Business Rules](../architecture/business-rules.md)
- [API Endpoints](./endpoints.md)
- [OpenAPI Specification](./swagger.yaml)
- [Database Schema](../architecture/database-schema.md)
