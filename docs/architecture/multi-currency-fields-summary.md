# 📊 Resumen de Campos Multi-Moneda por Entidad

> **Última actualización:** 2025-10-19
> **Pregunta:** ¿Son los mismos campos obligatorios en todas las entidades?

---

## ✅ **RESPUESTA RÁPIDA**

**SÍ**, el patrón es **100% CONSISTENTE** en todas las entidades:

### **Campos que el USUARIO/FRONTEND envía:**

| Campo | Tipo | Obligatorio | Valores | Descripción |
|-------|------|-------------|---------|-------------|
| `monto` | Number | ✅ **SÍ** | > 0 | El monto en la moneda elegida |
| `moneda_origen` | String | ⚠️ **Opcional** | "ARS" \| "USD" | Default: "ARS" |

**Nota:** `moneda_origen` es **técnicamente opcional** porque tiene default "ARS", pero es **recomendado enviarlo siempre** explícitamente.

### **Campos que el BACKEND calcula (FORBIDDEN):**

| Campo | Tipo | Calculado | Descripción |
|-------|------|-----------|-------------|
| `monto_ars` | Number | ✅ **SIEMPRE** | Monto en pesos argentinos |
| `monto_usd` | Number | ✅ **SIEMPRE** | Monto en dólares estadounidenses |
| `tipo_cambio_usado` * | Number | ✅ **SIEMPRE** | Snapshot del tipo de cambio usado |

\* En entidades recurrentes se llama `tipo_cambio_referencia`

---

## 📋 **Tabla de Consistencia por Entidad**

| Entidad | Campo Input | Obligatorio | Campos Calculados | Variante de TC |
|---------|-------------|-------------|-------------------|----------------|
| **GastoUnico** | `monto` | ✅ Required | `monto_ars`, `monto_usd` | `tipo_cambio_usado` |
| **Compra** | `monto_total` | ✅ Required | `monto_total_ars`, `monto_total_usd` | `tipo_cambio_usado` |
| **GastoRecurrente** | `monto` | ✅ Required | `monto_ars`, `monto_usd` | `tipo_cambio_referencia` |
| **DebitoAutomatico** | `monto` | ✅ Required | `monto_ars`, `monto_usd` | `tipo_cambio_referencia` |
| **Gasto** (final) | N/A | N/A | `monto_ars`, `monto_usd` | `tipo_cambio_usado` |

---

## 🔍 **Diferencias Sutiles (Nomenclatura)**

### **1. Nombre del campo "monto"**

```javascript
// GastoUnico, GastoRecurrente, DebitoAutomatico:
{
  "monto": 100,  // ✅
}

// Compra (usa monto_total porque hay cantidad_cuotas):
{
  "monto_total": 1200,  // ✅ Monto total de la compra
  "cantidad_cuotas": 12
}
```

**Razón:** En `Compra`, el `monto_total` se divide en cuotas. En las demás entidades es un `monto` simple.

---

### **2. Nombre del campo de tipo de cambio**

```javascript
// GastoUnico, Compra, Gasto (entidades "snapshot"):
{
  "tipo_cambio_usado": 1050.00  // ✅ TC usado en ese momento específico
}

// GastoRecurrente, DebitoAutomatico (entidades recurrentes):
{
  "tipo_cambio_referencia": 1050.00  // ✅ TC de referencia (se actualiza)
}
```

**Razón:**
- **`tipo_cambio_usado`**: Se guarda 1 vez y **nunca cambia** (snapshot histórico)
- **`tipo_cambio_referencia`**: Se **actualiza diariamente** por el scheduler (siempre tiene el TC más reciente)

---

## 📝 **Reglas de Validación (idénticas en todas)**

### **Joi Validation Pattern (CREATE):**

```javascript
// ✅ CONSISTENTE en todas las entidades
export const createSchema = Joi.object({
  // Campos que el usuario ENVÍA:
  monto: Joi.number().positive().required(),              // ✅ Obligatorio
  moneda_origen: Joi.string().valid('ARS', 'USD').default('ARS'),  // ⚠️ Default ARS

  // Campos que el usuario NO PUEDE ENVIAR:
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden(),  // o tipo_cambio_referencia

  // ... otros campos específicos de la entidad
});
```

### **Joi Validation Pattern (UPDATE):**

```javascript
// ✅ CONSISTENTE en todas las entidades
export const updateSchema = Joi.object({
  // Campos que el usuario PUEDE ACTUALIZAR:
  monto: Joi.number().positive(),                         // ⚠️ Opcional en UPDATE
  moneda_origen: Joi.string().valid('ARS', 'USD'),        // ⚠️ Opcional en UPDATE

  // Campos que el usuario NO PUEDE ENVIAR:
  monto_ars: Joi.forbidden(),
  monto_usd: Joi.forbidden(),
  tipo_cambio_usado: Joi.forbidden(),

  // ... otros campos específicos de la entidad
});
```

---

## 🎯 **Patrón de Modelos (Sequelize)**

```javascript
// ✅ CONSISTENTE en: GastoUnico, GastoRecurrente, DebitoAutomatico
{
  // Campo legacy + input del usuario:
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false  // ✅ OBLIGATORIO
  },

  // Selector de moneda:
  moneda_origen: {
    type: DataTypes.ENUM('ARS', 'USD'),
    allowNull: false,  // ✅ OBLIGATORIO
    defaultValue: 'ARS'
  },

  // Campos CALCULADOS:
  monto_ars: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true  // ⚠️ Puede ser null si falla conversión
  },

  monto_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true  // ⚠️ Puede ser null si falla conversión
  },

  tipo_cambio_usado: {  // o tipo_cambio_referencia
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true  // ⚠️ Puede ser null si no hay TC
  }
}
```

**Única diferencia en Compra:**
```javascript
// Compra usa monto_total en lugar de monto:
{
  monto_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  monto_total_ars: { type: DataTypes.DECIMAL(10, 2), allowNull: false },  // ⚠️ NOT NULL
  monto_total_usd: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  tipo_cambio_usado: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
}
```

**Nota importante:** En `Compra`, `monto_total_ars` es `allowNull: false` porque es la moneda base del sistema.

---

## 💡 **Preguntas y Respuestas**

### **Q1: ¿`moneda_origen` es obligatorio?**

**R:** Técnicamente **NO** (tiene default "ARS"), pero **SÍ deberías enviarlo siempre** en los tests para claridad.

```javascript
// ✅ RECOMENDADO (explícito)
{
  "monto": 100,
  "moneda_origen": "ARS"
}

// ⚠️ FUNCIONA (pero usa default)
{
  "monto": 100
  // moneda_origen → "ARS" (default)
}
```

**Mejor práctica:** Siempre enviar explícitamente.

---

### **Q2: ¿`monto_ars` y `monto_usd` SIEMPRE están calculados?**

**R:** **SÍ**, el backend **SIEMPRE** intenta calcular ambos campos. En caso de error:

```javascript
// Escenario 1: Todo OK (hay TC)
{
  "monto": 100,
  "moneda_origen": "USD",
  "monto_ars": 105000,     // ✅ Calculado con TC
  "monto_usd": 100,        // ✅ Valor original
  "tipo_cambio_usado": 1050
}

// Escenario 2: Fallback (no hay TC)
{
  "monto": 100,
  "moneda_origen": "USD",
  "monto_ars": 100,        // ⚠️ Fallback: asume ARS
  "monto_usd": null,       // ⚠️ No se pudo calcular
  "tipo_cambio_usado": null
}
```

**En producción:** El scheduler mantiene siempre un TC activo, por lo que el Escenario 2 es **muy raro**.

---

### **Q3: ¿Qué pasa si envío `monto_ars` o `monto_usd`?**

**R:** **ERROR 400** (Validation Error)

```json
{
  "success": false,
  "error": "Error de validación",
  "details": [
    {
      "field": "monto_ars",
      "message": "\"monto_ars\" is not allowed"
    }
  ]
}
```

---

### **Q4: ¿En UPDATE puedo cambiar solo `moneda_origen` sin cambiar `monto`?**

**R:** **SÍ**, puedes cambiar solo la moneda:

```javascript
// Original:
{
  "monto": 100,
  "moneda_origen": "ARS"
}

// UPDATE:
PATCH /api/gastos-unicos/42
{
  "moneda_origen": "USD"  // ✅ Solo cambio la moneda
}

// Resultado:
{
  "monto": 100,            // ⚠️ Se mantiene
  "moneda_origen": "USD",   // ✅ Actualizado
  "monto_ars": 105000,     // ✅ Recalculado (100 USD * 1050)
  "monto_usd": 100,        // ✅ Recalculado
  "tipo_cambio_usado": 1050
}
```

**Efecto:** El backend **recalcula** `monto_ars` y `monto_usd` con el nuevo `moneda_origen`.

---

### **Q5: ¿Qué diferencia hay entre `tipo_cambio_usado` y `tipo_cambio_referencia`?**

| Campo | Usado en | Comportamiento | Actualización |
|-------|----------|----------------|---------------|
| `tipo_cambio_usado` | GastoUnico, Compra, Gasto | Snapshot del TC en el momento de creación | ❌ Nunca cambia |
| `tipo_cambio_referencia` | GastoRecurrente, DebitoAutomatico | TC de referencia para generar futuros gastos | ✅ Se actualiza diariamente |

**Ejemplo:**

```javascript
// Día 1: Creo un GastoRecurrente (alquiler)
{
  "monto": 250000,
  "moneda_origen": "ARS",
  "tipo_cambio_referencia": 1050  // TC del día 1
}

// Día 30: Scheduler actualiza el TC
{
  "tipo_cambio_referencia": 1080  // ✅ Actualizado automáticamente
}

// Día 30: Se genera un Gasto desde este GastoRecurrente
{
  "monto_ars": 250000,
  "tipo_cambio_usado": 1080  // ✅ Usa el TC del día 30 (snapshot)
}
```

---

## 📦 **Resumen para Tests RestAssured**

### **Patrón Universal (aplica a TODAS las entidades):**

```java
// ✅ ENVIAR SIEMPRE (CREATE):
request.setMonto(100.0);              // ✅ Obligatorio
request.setMonedaOrigen("ARS");       // ✅ Recomendado (default "ARS")

// ❌ NUNCA ENVIAR (CREATE/UPDATE):
// request.setMontoArs(...);
// request.setMontoUsd(...);
// request.setTipoCambioUsado(...);

// ✅ VERIFICAR EN RESPONSE:
assertNotNull(response.getMontoArs());
assertNotNull(response.getMontoUsd());
assertNotNull(response.getTipoCambioUsado());
```

### **Excepciones de nomenclatura:**

| Entidad | Campo Input | Campos Calculados |
|---------|-------------|-------------------|
| GastoUnico | `monto` | `monto_ars`, `monto_usd`, `tipo_cambio_usado` |
| Compra | `monto_total` | `monto_total_ars`, `monto_total_usd`, `tipo_cambio_usado` |
| GastoRecurrente | `monto` | `monto_ars`, `monto_usd`, `tipo_cambio_referencia` |
| DebitoAutomatico | `monto` | `monto_ars`, `monto_usd`, `tipo_cambio_referencia` |

---

## ✅ **Checklist para Tests**

Para **CADA entidad** (GastoUnico, Compra, GastoRecurrente, DebitoAutomatico):

### **Request (lo que enviás):**
- [ ] ✅ Incluir `monto` (o `monto_total` para Compra)
- [ ] ✅ Incluir `moneda_origen` con valor "ARS" o "USD"
- [ ] ❌ NO incluir `monto_ars`
- [ ] ❌ NO incluir `monto_usd`
- [ ] ❌ NO incluir `tipo_cambio_usado` o `tipo_cambio_referencia`

### **Response (lo que validás):**
- [ ] ✅ Verificar que `monto_ars` no sea null
- [ ] ✅ Verificar que `monto_usd` no sea null
- [ ] ✅ Verificar que `tipo_cambio_usado` (o `referencia`) no sea null
- [ ] ✅ Verificar que los valores de conversión sean lógicos:
  - Si `moneda_origen = "ARS"` → `monto_ars == monto`
  - Si `moneda_origen = "USD"` → `monto_usd == monto`

---

## 🎓 **Ejemplo Completo: Test para TODAS las entidades**

```java
@ParameterizedTest
@ValueSource(strings = {"ARS", "USD"})
public void testCrearEntidadConMonedaDiferente(String moneda) {
    // Arrange
    double monto = moneda.equals("USD") ? 100.0 : 105000.0;

    Request request = new Request();
    request.setMonto(monto);
    request.setMonedaOrigen(moneda);
    request.setDescripcion("Test " + moneda);
    // ... otros campos

    // Act
    Response response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(request)
        .when()
        .post("/api/entidad")  // gastos-unicos, compras, etc.
        .then()
        .statusCode(201)
        .extract()
        .jsonPath()
        .getObject("data", Response.class);

    // Assert
    assertNotNull(response.getMontoArs());
    assertNotNull(response.getMontoUsd());
    assertNotNull(response.getTipoCambioUsado());

    // Verificar lógica de conversión
    if (moneda.equals("ARS")) {
        assertEquals(monto, response.getMontoArs(), 0.01);
    } else {
        assertEquals(monto, response.getMontoUsd(), 0.01);
    }
}
```

---

## 📞 **Referencias**

- [Patrón Estándar Multi-Moneda](./multi-currency-standard.md)
- [Guía RestAssured](../testing/restassured-multi-currency-guide.md)
- [Business Rules](./business-rules.md)
- [API Docs](http://localhost:3030/api-docs)

---

**Generado por:** Sistema Personal Finance API v1.0
**Última revisión:** 2025-10-19
