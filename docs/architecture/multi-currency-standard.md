# 💱 Patrón Estándar Multi-Moneda (USD/ARS)

> **Última actualización:** 2025-10-19
> **Estado:** ✅ Implementado y estandarizado en todas las entidades

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Patrón para el Frontend](#patrón-para-el-frontend)
3. [Patrón del Backend](#patrón-del-backend)
4. [Entidades Soportadas](#entidades-soportadas)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen Ejecutivo

El sistema multi-moneda permite a los usuarios ingresar gastos/compras en **ARS (Pesos Argentinos)** o **USD (Dólares Estadounidenses)**. El backend se encarga de:

1. ✅ Convertir automáticamente a ambas monedas
2. ✅ Guardar snapshot del tipo de cambio usado
3. ✅ Mantener integridad histórica de los datos
4. ✅ Soportar backward compatibility con datos legacy

---

## 🖥️ Patrón para el Frontend

### **¿Qué debe enviar el usuario?**

El usuario **SOLAMENTE** debe enviar:

```javascript
{
  // Campos que el usuario elige:
  "monto": 100,              // ✅ El monto en la moneda que eligió
  "moneda_origen": "USD",    // ✅ La moneda elegida ('ARS' o 'USD')

  // ... otros campos de la entidad (descripcion, categoria, etc.)
}
```

### **¿Qué NO debe enviar el usuario?**

El frontend **NUNCA** debe enviar estos campos (son calculados por el backend):

```javascript
{
  "monto_ars": 105000,           // ❌ FORBIDDEN - calculado automáticamente
  "monto_usd": 100,              // ❌ FORBIDDEN - calculado automáticamente
  "tipo_cambio_usado": 1050.00   // ❌ FORBIDDEN - snapshot automático
}
```

Si el frontend intenta enviar estos campos, **la validación Joi los rechazará**.

---

### **UI/UX Recomendada**

```html
<!-- Selector de moneda -->
<select name="moneda_origen" required>
  <option value="ARS" selected>Pesos Argentinos (ARS)</option>
  <option value="USD">Dólares Estadounidenses (USD)</option>
</select>

<!-- Input de monto (cambia placeholder según moneda) -->
<input
  type="number"
  name="monto"
  placeholder="Ingrese el monto en la moneda seleccionada"
  step="0.01"
  min="0.01"
  required
/>
```

**JavaScript sugerido:**
```javascript
// Cambiar placeholder dinámicamente
const monedaSelect = document.querySelector('[name="moneda_origen"]');
const montoInput = document.querySelector('[name="monto"]');

monedaSelect.addEventListener('change', (e) => {
  if (e.target.value === 'USD') {
    montoInput.placeholder = 'Ejemplo: 100 (USD)';
  } else {
    montoInput.placeholder = 'Ejemplo: 105000 (ARS)';
  }
});
```

---

## ⚙️ Patrón del Backend

### **Campos en los Modelos**

Todas las entidades multi-moneda tienen estos campos:

```javascript
// Campo LEGACY (backward compatibility)
monto: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  comment: 'Monto en la moneda origen (legacy + input del usuario)'
},

// Campo de selección del usuario
moneda_origen: {
  type: DataTypes.ENUM('ARS', 'USD'),
  allowNull: false,
  defaultValue: 'ARS',
  comment: 'Moneda en la que se ingresó originalmente'
},

// Campos CALCULADOS automáticamente
monto_ars: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,  // ⚠️ Obligatorio para entidades "fuente"
  comment: 'Monto en pesos argentinos (calculado)'
},

monto_usd: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,  // Puede ser null si no hay TC disponible
  comment: 'Monto en dólares estadounidenses (calculado)'
},

tipo_cambio_usado: {  // o tipo_cambio_referencia para recurrentes
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,
  comment: 'Snapshot del tipo de cambio usado en la conversión'
}
```

---

### **Validaciones Joi**

Patrón estándar para **CREATE**:

```javascript
export const createSchema = Joi.object({
  // Campo que el usuario envía:
  monto: Joi.number().positive().required(),
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),

  // Campos calculados (FORBIDDEN):
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden(),

  // ... otros campos de la entidad
});
```

Patrón estándar para **UPDATE**:

```javascript
export const updateSchema = Joi.object({
  // Campo que el usuario puede actualizar:
  monto: Joi.number().positive(),
  moneda_origen: Joi.string().valid('ARS', 'USD'),

  // Campos calculados (FORBIDDEN):
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden(),

  // ... otros campos de la entidad
});
```

---

### **Lógica en Controllers**

Patrón estándar en el método `create()`:

```javascript
async create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Extraer datos del usuario
    const monto = req.body.monto;
    const monedaOrigen = req.body.moneda_origen || 'ARS';

    // 2. Preparar datos base
    let entityData = {
      ...req.body,
      usuario_id: req.user.id,
      moneda_origen: monedaOrigen
    };

    // 3. Calcular ambas monedas automáticamente
    try {
      const { monto_ars, monto_usd, tipo_cambio_usado } =
        await ExchangeRateService.calculateBothCurrencies(monto, monedaOrigen);

      entityData = {
        ...entityData,
        monto_ars,
        monto_usd,
        tipo_cambio_usado  // o tipo_cambio_referencia
      };

      logger.debug('Multi-currency conversion applied', {
        moneda_origen: monedaOrigen,
        monto,
        monto_ars,
        monto_usd,
        tipo_cambio_usado
      });
    } catch (exchangeError) {
      // Fallback si no hay TC disponible
      logger.warn('Exchange rate conversion failed', {
        error: exchangeError.message
      });

      entityData.monto_ars = monto;  // Asumir ARS
      entityData.monto_usd = null;   // ✅ null, NO 0
    }

    // 4. Crear entidad en BD
    const entity = await this.model.create(entityData, { transaction });

    await transaction.commit();
    return sendSuccess(res, entity, 201);

  } catch (error) {
    await transaction.rollback();
    return sendError(res, 500, 'Error al crear entidad', error.message);
  }
}
```

**⚠️ IMPORTANTE:** En el fallback, usar `monto_usd = null` (NO `= 0`)

---

## 📦 Entidades Soportadas

| Entidad | Modelo | Validación | Controller | Service | Status |
|---------|--------|------------|------------|---------|--------|
| **Compra** | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| **GastoUnico** | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| **GastoRecurrente** | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| **DebitoAutomatico** | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| **Gasto** (tabla final) | ✅ | ✅ | N/A | N/A | ✅ 100% |

**Nota:** La tabla `Gasto` (gastos reales generados) se puebla automáticamente mediante las **Strategies** de generación.

---

## 📚 Ejemplos de Uso

### **Ejemplo 1: Crear Compra en USD**

**Request (Frontend → Backend):**
```http
POST /api/compras
Content-Type: application/json
Authorization: Bearer <token>

{
  "descripcion": "MacBook Pro",
  "monto": 1500,
  "moneda_origen": "USD",
  "cantidad_cuotas": 12,
  "fecha_compra": "2025-10-19",
  "categoria_gasto_id": 5,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 3,
  "tarjeta_id": 1
}
```

**Response (Backend → Frontend):**
```json
{
  "success": true,
  "data": {
    "compra": {
      "id": 42,
      "descripcion": "MacBook Pro",
      "monto": 1500,
      "moneda_origen": "USD",
      "monto_total_ars": 1575000.00,
      "monto_total_usd": 1500.00,
      "tipo_cambio_usado": 1050.00,
      "cantidad_cuotas": 12,
      "fecha_compra": "2025-10-19",
      "pendiente_cuotas": true
    }
  }
}
```

**Explicación:**
- Usuario envió `monto: 1500` con `moneda_origen: "USD"`
- Backend calculó:
  - `monto_total_ars = 1500 USD × 1050 (TC) = 1,575,000 ARS`
  - `monto_total_usd = 1500 USD` (valor original)
  - `tipo_cambio_usado = 1050.00` (snapshot del TC usado)

---

### **Ejemplo 2: Crear Gasto Recurrente en ARS**

**Request:**
```json
{
  "descripcion": "Alquiler",
  "monto": 250000,
  "moneda_origen": "ARS",
  "dia_de_pago": 5,
  "frecuencia_gasto_id": 1,
  "categoria_gasto_id": 1,
  "importancia_gasto_id": 1,
  "tipo_pago_id": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "descripcion": "Alquiler",
    "monto": 250000,
    "moneda_origen": "ARS",
    "monto_ars": 250000.00,
    "monto_usd": 238.10,
    "tipo_cambio_referencia": 1050.00,
    "activo": true
  }
}
```

**Explicación:**
- Usuario envió `monto: 250000` con `moneda_origen: "ARS"`
- Backend calculó:
  - `monto_ars = 250000 ARS` (valor original)
  - `monto_usd = 250000 ARS ÷ 1050 (TC) = 238.10 USD`
  - `tipo_cambio_referencia = 1050.00`

---

### **Ejemplo 3: Fallback sin Tipo de Cambio**

**Escenario:** No hay TC configurado en la BD.

**Request:**
```json
{
  "descripcion": "Compra sin TC",
  "monto": 100,
  "moneda_origen": "USD",
  "fecha": "2025-10-19",
  "categoria_gasto_id": 2,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 55,
    "descripcion": "Compra sin TC",
    "monto": 100,
    "moneda_origen": "USD",
    "monto_ars": 100.00,
    "monto_usd": null,
    "tipo_cambio_usado": null
  }
}
```

**Explicación:**
- No hay TC disponible → Fallback
- `monto_ars = 100` (asume valor en ARS)
- `monto_usd = null` (no se pudo calcular)
- Backend registró warning en logs

---

## 🔍 Troubleshooting

### **Error: "null value in column 'monto_total_ars'"**

**Causa:** El backend no pudo calcular `monto_ars` y el fallback falló.

**Solución:**
1. Verificar que haya un tipo de cambio activo en la BD:
   ```sql
   SELECT * FROM finanzas.tipos_cambio WHERE activo = true ORDER BY fecha DESC LIMIT 1;
   ```
2. Si no hay TC, crear uno manualmente:
   ```http
   POST /api/tipo-cambio
   {
     "fecha": "2025-10-19",
     "valor_venta_usd_ars": 1050.00,
     "valor_compra_usd_ars": 1040.00,
     "fuente": "manual"
   }
   ```

---

### **Error: "Validation error: monto_ars is forbidden"**

**Causa:** El frontend está enviando `monto_ars`, `monto_usd` o `tipo_cambio_usado`.

**Solución:** Remover esos campos del request. Solo enviar:
```javascript
{
  "monto": <valor>,
  "moneda_origen": "ARS" | "USD"
}
```

---

### **Error: Frontend muestra monto_usd = 0**

**Causa:** Bug en versiones anteriores del backend (ya corregido).

**Solución:**
- ✅ Backend actualizado: ahora usa `monto_usd = null` en lugar de `0`
- Frontend debe interpretar `null` como "conversión no disponible"

---

## 🎯 Mejores Prácticas

### **Para Frontend:**
1. ✅ Siempre enviar `moneda_origen` explícitamente
2. ✅ Nunca enviar campos calculados (`monto_ars`, `monto_usd`, `tipo_cambio_usado`)
3. ✅ Manejar `monto_usd = null` en la UI (mostrar "N/D" o similar)
4. ✅ Validar que `monto > 0` antes de enviar

### **Para Backend:**
1. ✅ Usar `ExchangeRateService.calculateBothCurrencies()` para conversión
2. ✅ Siempre loguear conversiones con `logger.debug()`
3. ✅ En fallback, usar `monto_usd = null` (NO `= 0`)
4. ✅ Usar transacciones para garantizar atomicidad

### **Para Base de Datos:**
1. ✅ Mantener al menos un TC activo en todo momento
2. ✅ Usar scheduler para actualizar TC diariamente
3. ✅ Verificar constraints: `monto_ars NOT NULL` en entidades fuente

---

## 📞 Soporte

Para consultas sobre el sistema multi-moneda:
- Documentación API: http://localhost:3030/api-docs
- Business Rules: `/docs/architecture/business-rules.md`
- Endpoints: `/docs/api/endpoints.md`

---

**Generado por:** Sistema Personal Finance API v1.0
**Licencia:** ISC
**Contribuidores:** Claude Code IA Assistant
