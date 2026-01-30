# 🧪 Guía de Testing Multi-Moneda para RestAssured

> **Para:** Proyecto de tests RestAssured (Java)
> **Última actualización:** 2025-10-19
> **Relacionado:** [multi-currency-standard.md](../architecture/multi-currency-standard.md)

---

## 🚨 Cambios Requeridos en Tests

### **Problema Identificado**

Los tests actuales están enviando campos que ahora son **FORBIDDEN** por el sistema multi-moneda:

```java
// ❌ INCORRECTO (tests actuales)
GastoUnico gastoUnico = new GastoUnico();
gastoUnico.setMonto(1989.9);
gastoUnico.setMonedaOrigen(null);          // ❌ null no es válido
gastoUnico.setMontoArs(null);              // ❌ FORBIDDEN
gastoUnico.setMontoUsd(null);              // ❌ FORBIDDEN
gastoUnico.setTipoCambioUsado(null);       // ❌ FORBIDDEN
```

**Error resultante:**
```json
{
  "success": false,
  "error": "Error de validación",
  "details": [
    {
      "field": "moneda_origen",
      "message": "\"moneda_origen\" must be one of [ARS, USD]"
    },
    {
      "field": "monto_ars",
      "message": "\"monto_ars\" is not allowed"
    }
  ]
}
```

---

## ✅ Solución: Actualizar Modelo y Tests

### **1. Actualizar Clase `GastoUnico.java`**

```java
public class GastoUnico {
    private Integer id;
    private String descripcion;

    // ✅ Campos que el cliente ENVÍA
    private Double monto;              // Monto en la moneda elegida
    private String monedaOrigen;       // "ARS" o "USD" (NOT NULL, default "ARS")

    // ❌ Campos que el cliente NO DEBE ENVIAR (son calculados por backend)
    // REMOVER estos campos de los setters usados en tests de CREATE/UPDATE:
    // private Double montoArs;
    // private Double montoUsd;
    // private Double tipoCambioUsado;

    // ✅ Pero SÍ deben estar en los getters para leer responses:
    @JsonProperty("monto_ars")
    private Double montoArs;           // Solo para lectura

    @JsonProperty("monto_usd")
    private Double montoUsd;           // Solo para lectura

    @JsonProperty("tipo_cambio_usado")
    private Double tipoCambioUsado;    // Solo para lectura

    private LocalDate fecha;
    private Integer categoriaGastoId;
    private Integer importanciaGastoId;
    private Integer tipoPagoId;
    private Integer tarjetaId;
    private Boolean procesado;

    // Getters y Setters...

    // ⚠️ IMPORTANTE: Usar @JsonInclude en campos calculados
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Double getMontoArs() {
        return montoArs;
    }

    // NO incluir setMontoArs() en requests de CREATE/UPDATE
    // Solo usar para mapear responses
}
```

### **2. Estrategia: Separar Request y Response DTOs**

**Opción Recomendada:**

```java
// Para CREATE/UPDATE requests
public class GastoUnicoRequest {
    private String descripcion;
    private Double monto;                    // ✅ OBLIGATORIO
    private String monedaOrigen = "ARS";     // ✅ Default "ARS"
    private LocalDate fecha;
    private Integer categoriaGastoId;
    private Integer importanciaGastoId;
    private Integer tipoPagoId;
    private Integer tarjetaId;

    // Solo getters y setters para estos campos
}

// Para leer responses (GET)
public class GastoUnicoResponse extends GastoUnicoRequest {
    private Integer id;
    private Double montoArs;                 // ✅ Calculado por backend
    private Double montoUsd;                 // ✅ Calculado por backend
    private Double tipoCambioUsado;          // ✅ Calculado por backend
    private Boolean procesado;

    // Getters para campos adicionales
}
```

---

## 📝 Actualizar Tests

### **Test 1: Crear GastoUnico en ARS**

```java
@Test
public void testCrearGastoUnicoEnARS() {
    // Arrange
    GastoUnicoRequest gastoUnico = new GastoUnicoRequest();
    gastoUnico.setDescripcion("Heavy Duty Leather Knife");
    gastoUnico.setMonto(1989.9);                    // ✅ Monto en ARS
    gastoUnico.setMonedaOrigen("ARS");              // ✅ Explícito
    gastoUnico.setFecha(LocalDate.of(2025, 10, 14));
    gastoUnico.setCategoriaGastoId(1);
    gastoUnico.setImportanciaGastoId(2);
    gastoUnico.setTipoPagoId(2);

    // ❌ NO setear: montoArs, montoUsd, tipoCambioUsado

    // Act
    GastoUnicoResponse response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(gastoUnico)
        .when()
        .post("/api/gastos-unicos")
        .then()
        .statusCode(201)
        .extract()
        .jsonPath()
        .getObject("data", GastoUnicoResponse.class);

    // Assert
    assertNotNull(response.getId());
    assertEquals("Heavy Duty Leather Knife", response.getDescripcion());
    assertEquals(1989.9, response.getMonto(), 0.01);
    assertEquals("ARS", response.getMonedaOrigen());

    // ✅ Verificar que el backend calculó los campos
    assertEquals(1989.9, response.getMontoArs(), 0.01);  // monto_ars = monto (mismo valor)
    assertNotNull(response.getMontoUsd());                // Debe calcular USD
    assertNotNull(response.getTipoCambioUsado());         // Debe tener TC

    // Ejemplo: si TC = 1050, entonces montoUsd ≈ 1.90
    assertEquals(1.90, response.getMontoUsd(), 0.1);
}
```

---

### **Test 2: Crear GastoUnico en USD**

```java
@Test
public void testCrearGastoUnicoEnUSD() {
    // Arrange
    GastoUnicoRequest gastoUnico = new GastoUnicoRequest();
    gastoUnico.setDescripcion("iPhone 15 Pro");
    gastoUnico.setMonto(1200.0);                    // ✅ Monto en USD
    gastoUnico.setMonedaOrigen("USD");              // ✅ Explícito
    gastoUnico.setFecha(LocalDate.now());
    gastoUnico.setCategoriaGastoId(5);
    gastoUnico.setImportanciaGastoId(2);
    gastoUnico.setTipoPagoId(3);

    // Act
    GastoUnicoResponse response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(gastoUnico)
        .when()
        .post("/api/gastos-unicos")
        .then()
        .statusCode(201)
        .extract()
        .jsonPath()
        .getObject("data", GastoUnicoResponse.class);

    // Assert
    assertEquals(1200.0, response.getMonto(), 0.01);
    assertEquals("USD", response.getMonedaOrigen());

    // ✅ Verificar conversión USD → ARS
    assertEquals(1200.0, response.getMontoUsd(), 0.01);   // monto_usd = monto
    assertNotNull(response.getMontoArs());                 // Debe calcular ARS

    // Ejemplo: si TC = 1050, entonces montoArs ≈ 1,260,000
    assertEquals(1260000.0, response.getMontoArs(), 100.0);
}
```

---

### **Test 3: Validación - Rechazar moneda_origen inválida**

```java
@Test
public void testRechazarMonedaOrigenInvalida() {
    // Arrange
    GastoUnicoRequest gastoUnico = new GastoUnicoRequest();
    gastoUnico.setDescripcion("Test");
    gastoUnico.setMonto(100.0);
    gastoUnico.setMonedaOrigen("EUR");  // ❌ Inválido (solo ARS o USD)
    gastoUnico.setFecha(LocalDate.now());
    gastoUnico.setCategoriaGastoId(1);
    gastoUnico.setImportanciaGastoId(1);
    gastoUnico.setTipoPagoId(1);

    // Act & Assert
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(gastoUnico)
        .when()
        .post("/api/gastos-unicos")
        .then()
        .statusCode(400)
        .body("success", equalTo(false))
        .body("error", containsString("validación"))
        .body("details[0].field", equalTo("moneda_origen"))
        .body("details[0].message", containsString("must be one of [ARS, USD]"));
}
```

---

### **Test 4: Validación - Rechazar campos FORBIDDEN**

```java
@Test
public void testRechazarCamposForbidden() {
    // Arrange - Intentar enviar campos calculados
    String requestBody = """
        {
            "descripcion": "Test",
            "monto": 100.0,
            "moneda_origen": "ARS",
            "fecha": "2025-10-19",
            "categoria_gasto_id": 1,
            "importancia_gasto_id": 1,
            "tipo_pago_id": 1,
            "monto_ars": 100.0,
            "monto_usd": 0.10,
            "tipo_cambio_usado": 1050.0
        }
        """;

    // Act & Assert
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(requestBody)
        .when()
        .post("/api/gastos-unicos")
        .then()
        .statusCode(400)
        .body("success", equalTo(false))
        .body("details.field", hasItems("monto_ars", "monto_usd", "tipo_cambio_usado"))
        .body("details[0].message", containsString("not allowed"));
}
```

---

### **Test 5: Actualizar GastoUnico (cambiar moneda)**

```java
@Test
public void testActualizarMonedaDeGastoUnico() {
    // Arrange - Crear gasto en ARS
    Integer gastoId = crearGastoEnARS();

    // Act - Actualizar a USD
    GastoUnicoRequest updateRequest = new GastoUnicoRequest();
    updateRequest.setMonto(50.0);           // Ahora 50 USD
    updateRequest.setMonedaOrigen("USD");   // Cambio de ARS a USD

    GastoUnicoResponse response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(updateRequest)
        .when()
        .put("/api/gastos-unicos/" + gastoId)
        .then()
        .statusCode(200)
        .extract()
        .jsonPath()
        .getObject("data", GastoUnicoResponse.class);

    // Assert
    assertEquals("USD", response.getMonedaOrigen());
    assertEquals(50.0, response.getMonto(), 0.01);
    assertEquals(50.0, response.getMontoUsd(), 0.01);

    // El backend recalculó monto_ars con el nuevo TC
    assertNotNull(response.getMontoArs());
    assertTrue(response.getMontoArs() > 50000);  // 50 USD * ~1050 TC
}
```

---

## 🔄 Tests para Otras Entidades

### **Compra (POST /api/compras)**

```java
@Test
public void testCrearCompraEnUSD() {
    CompraRequest compra = new CompraRequest();
    compra.setDescripcion("MacBook Pro");
    compra.setMonto(1500.0);                    // ✅ monto_total en USD
    compra.setMonedaOrigen("USD");              // ✅
    compra.setCantidadCuotas(12);
    compra.setFechaCompra(LocalDate.now());
    compra.setCategoriaGastoId(5);
    compra.setImportanciaGastoId(2);
    compra.setTipoPagoId(3);
    compra.setTarjetaId(1);

    // ❌ NO enviar: monto_total_ars, monto_total_usd, tipo_cambio_usado

    CompraResponse response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(compra)
        .when()
        .post("/api/compras")
        .then()
        .statusCode(201)
        .extract()
        .jsonPath()
        .getObject("data.compra", CompraResponse.class);

    // Assert
    assertEquals(1500.0, response.getMontoTotalUsd(), 0.01);
    assertNotNull(response.getMontoTotalArs());
    assertNotNull(response.getTipoCambioUsado());
}
```

### **GastoRecurrente (POST /api/gastos-recurrentes)**

```java
@Test
public void testCrearGastoRecurrenteEnARS() {
    GastoRecurrenteRequest gasto = new GastoRecurrenteRequest();
    gasto.setDescripcion("Alquiler");
    gasto.setMonto(250000.0);                   // ✅ monto en ARS
    gasto.setMonedaOrigen("ARS");               // ✅
    gasto.setDiaDePago(5);
    gasto.setFrecuenciaGastoId(1);  // Mensual
    gasto.setCategoriaGastoId(1);
    gasto.setImportanciaGastoId(1);
    gasto.setTipoPagoId(4);

    // ❌ NO enviar: monto_ars, monto_usd, tipo_cambio_referencia

    GastoRecurrenteResponse response = given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(gasto)
        .when()
        .post("/api/gastos-recurrentes")
        .then()
        .statusCode(201)
        .extract()
        .jsonPath()
        .getObject("data", GastoRecurrenteResponse.class);

    // Assert
    assertEquals(250000.0, response.getMontoArs(), 0.01);
    assertNotNull(response.getMontoUsd());
    assertNotNull(response.getTipoCambioReferencia());
}
```

---

## 📋 Checklist de Migración

### **1. Actualizar DTOs**
- [ ] Remover setters de `montoArs`, `montoUsd`, `tipoCambioUsado` de Request DTOs
- [ ] Agregar getters de estos campos en Response DTOs
- [ ] Asegurar que `monedaOrigen` sea String con valores "ARS" o "USD"
- [ ] Establecer default `monedaOrigen = "ARS"` en constructores

### **2. Actualizar Tests de CREATE**
- [ ] GastoUnico: Enviar `monto` + `moneda_origen`
- [ ] Compra: Enviar `monto_total` + `moneda_origen`
- [ ] GastoRecurrente: Enviar `monto` + `moneda_origen`
- [ ] DebitoAutomatico: Enviar `monto` + `moneda_origen`

### **3. Actualizar Tests de UPDATE**
- [ ] Permitir cambiar `monto` y `moneda_origen` juntos
- [ ] NO enviar campos calculados

### **4. Actualizar Assertions**
- [ ] Verificar que responses incluyan `monto_ars`, `monto_usd`, `tipo_cambio_usado`
- [ ] Validar conversiones con margen de error (±1% por decimales)

### **5. Tests de Validación**
- [ ] Test: `moneda_origen` inválida (ej: "EUR") → 400
- [ ] Test: `moneda_origen` null → 400
- [ ] Test: Enviar `monto_ars` → 400 "not allowed"
- [ ] Test: Enviar `tipo_cambio_usado` → 400 "not allowed"

### **6. Tests de Edge Cases**
- [ ] Test: Crear gasto cuando no hay TC en BD → 500 o fallback
- [ ] Test: Conversión USD a ARS con TC alto (ej: TC > 10000)
- [ ] Test: Conversión ARS a USD con monto muy bajo (ej: 1 ARS)

---

## 🔍 Ejemplo de Request/Response Completo

### **Request (Java → API)**

```json
POST /api/gastos-unicos
{
  "descripcion": "Heavy Duty Leather Knife",
  "monto": 1989.9,
  "moneda_origen": "ARS",
  "fecha": "2025-10-14",
  "categoria_gasto_id": 1,
  "importancia_gasto_id": 2,
  "tipo_pago_id": 2
}
```

### **Response (API → Java)**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "descripcion": "Heavy Duty Leather Knife",
    "monto": 1989.9,
    "moneda_origen": "ARS",
    "monto_ars": 1989.9,
    "monto_usd": 1.9,
    "tipo_cambio_usado": 1050.0,
    "fecha": "2025-10-14",
    "categoria_gasto_id": 1,
    "importancia_gasto_id": 2,
    "tipo_pago_id": 2,
    "procesado": false
  }
}
```

---

## 🚀 Resumen de Cambios

| Campo | Antes | Ahora |
|-------|-------|-------|
| `moneda_origen` | `null` permitido | ✅ Obligatorio: "ARS" o "USD" |
| `monto` | Siempre en ARS | ✅ En moneda elegida |
| `monto_ars` | Enviado por cliente | ❌ Calculado por backend |
| `monto_usd` | Enviado por cliente | ❌ Calculado por backend |
| `tipo_cambio_usado` | Enviado por cliente | ❌ Calculado por backend |

---

## 📞 Soporte

- **Documentación Multi-Moneda:** [multi-currency-standard.md](../architecture/multi-currency-standard.md)
- **API Documentation:** http://localhost:3030/api-docs
- **Endpoints:** [endpoints.md](../api/endpoints.md)

---

**Generado por:** Sistema Personal Finance API v1.0
**Para proyecto:** RestAssured Testing Suite
**Fecha:** 2025-10-19
