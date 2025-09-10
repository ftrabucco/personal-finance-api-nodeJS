# Test Cases para REST Assured (Java)

Este documento contiene los test cases diseñados para validar las business rules implementadas en la API de finanzas personales usando RestAssured en Java.

## Configuración Base

```java
public class FinanzasApiTestBase {
    protected static final String BASE_URL = "http://localhost:3030/api";
    protected static final String CONTENT_TYPE = "application/json";
    
    @BeforeClass
    public void setup() {
        RestAssured.baseURI = BASE_URL;
        RestAssured.defaultParser = Parser.JSON;
    }
}
```

---

## 1. Test Cases - Compras con Tipos de Pago

### TC001: Compra en Efectivo - Generación Inmediata
**Objetivo:** Validar que compras en efectivo se generan en fecha de compra

```java
@Test
public void testCompraEfectivoGeneracionInmediata() {
    String fechaHoy = LocalDate.now().toString();
    
    // Crear compra en efectivo para HOY
    CompraRequest compra = CompraRequest.builder()
        .descripcion("Compra efectivo test")
        .montoTotal(5000.00)
        .cantidadCuotas(1)
        .fechaCompra(fechaHoy)
        .categoriaGastoId(2)
        .importanciaGastoId(2) 
        .tipoPagoId(1) // Efectivo
        .build();
    
    Response response = given()
        .contentType(CONTENT_TYPE)
        .body(compra)
    .when()
        .post("/compras")
    .then()
        .statusCode(201)
        .body("compra.pendiente_cuotas", equalTo(true))
        .body("gasto", nullValue()) // No se genera inmediatamente en controller
        .extract().response();
    
    // Ejecutar job de generación
    given()
    .when()
        .get("/gastos/generate")
    .then()
        .statusCode(200)
        .body("summary.total_generated", equalTo(1))
        .body("summary.breakdown.compras", equalTo(1));
    
    // Verificar que la compra ya no está pendiente
    Integer compraId = response.path("compra.id");
    given()
    .when()
        .get("/compras/" + compraId)
    .then()
        .statusCode(200)
        .body("pendiente_cuotas", equalTo(false));
}
```

### TC002: Compra con Tarjeta de Crédito - Generación en Vencimiento
**Objetivo:** Validar que compras con crédito se generan en fecha de vencimiento

```java
@Test
public void testCompraCreditoGeneracionEnVencimiento() {
    String fechaCompra = LocalDate.now().toString();
    
    // Crear compra con tarjeta de crédito
    CompraRequest compra = CompraRequest.builder()
        .descripcion("Compra crédito test")
        .montoTotal(8000.00)
        .cantidadCuotas(1)
        .fechaCompra(fechaCompra)
        .categoriaGastoId(2)
        .importanciaGastoId(2)
        .tipoPagoId(3) // Crédito
        .tarjetaId(2)  // Tarjeta con dia_vencimiento = 25
        .build();
    
    Response response = given()
        .contentType(CONTENT_TYPE)
        .body(compra)
    .when()
        .post("/compras")
    .then()
        .statusCode(201)
        .body("compra.pendiente_cuotas", equalTo(true))
        .body("gasto", nullValue())
        .extract().response();
    
    // Ejecutar job ANTES del vencimiento - no debería generar
    given()
    .when()
        .get("/gastos/generate")
    .then()
        .statusCode(200)
        .body("summary.total_generated", equalTo(0))
        .body("summary.breakdown.compras", equalTo(0));
    
    // La compra debería seguir pendiente
    Integer compraId = response.path("compra.id");
    given()
    .when()
        .get("/compras/" + compraId)
    .then()
        .statusCode(200)
        .body("pendiente_cuotas", equalTo(true));
}
```

---

## 2. Test Cases - Gastos Recurrentes con Frecuencia Anual

### TC003: Gasto Recurrente Anual - Validación mes_de_pago
**Objetivo:** Validar que gastos anuales requieren mes_de_pago

```java
@Test
public void testGastoRecurrenteAnualRequiereMesDePago() {
    GastoRecurrenteRequest gastoAnual = GastoRecurrenteRequest.builder()
        .descripcion("Seguro anual")
        .monto(120000.00)
        .diaDePago(15)
        .mesDePago(null) // ERROR: anual requiere mes
        .frecuenciaGastoId(4) // Anual
        .categoriaGastoId(1)
        .importanciaGastoId(1)
        .tipoPagoId(1)
        .activo(true)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(gastoAnual)
    .when()
        .post("/gastos-recurrentes")
    .then()
        .statusCode(400)
        .body("error", containsString("mes_de_pago"));
}
```

### TC004: Gasto Recurrente Mensual - mes_de_pago debe ser null
**Objetivo:** Validar que gastos mensuales no deben tener mes_de_pago

```java
@Test
public void testGastoRecurrenteMensualSinMesDePago() {
    GastoRecurrenteRequest gastoMensual = GastoRecurrenteRequest.builder()
        .descripcion("Alquiler mensual")
        .monto(50000.00)
        .diaDePago(5)
        .mesDePago(3) // ERROR: mensual no debe tener mes específico
        .frecuenciaGastoId(2) // Mensual
        .categoriaGastoId(1)
        .importanciaGastoId(1)
        .tipoPagoId(1)
        .activo(true)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(gastoMensual)
    .when()
        .post("/gastos-recurrentes")
    .then()
        .statusCode(400)
        .body("error", containsString("mes_de_pago"));
}
```

---

## 3. Test Cases - Validaciones de Tarjetas de Crédito

### TC005: Tarjeta de Crédito - Validación dias requeridos
**Objetivo:** Validar que tarjetas de crédito requieren dia_cierre y dia_vencimiento

```java
@Test
public void testTarjetaCreditoRequiereFechas() {
    TarjetaRequest tarjeta = TarjetaRequest.builder()
        .nombre("Visa Sin Fechas")
        .tipo("credito")
        .banco("Banco Test")
        .diaCierre(null) // ERROR: crédito requiere fechas
        .diaVencimiento(null)
        .permiteCuotas(true)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(tarjeta)
    .when()
        .post("/tarjetas")
    .then()
        .statusCode(400)
        .body("error", containsString("fechas"));
}
```

### TC006: Tarjeta de Débito - No requiere fechas
**Objetivo:** Validar que tarjetas de débito no requieren fechas de cierre

```java
@Test
public void testTarjetaDebitoNoRequiereFechas() {
    TarjetaRequest tarjeta = TarjetaRequest.builder()
        .nombre("Débito Test")
        .tipo("debito")
        .banco("Banco Test")
        .diaCierre(null) // OK: débito no requiere fechas
        .diaVencimiento(null)
        .permiteCuotas(false)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(tarjeta)
    .when()
        .post("/tarjetas")
    .then()
        .statusCode(201)
        .body("tipo", equalTo("debito"))
        .body("dia_cierre", nullValue())
        .body("dia_vencimiento", nullValue());
}
```

---

## 4. Test Cases - Job de Generación Automática

### TC007: Job Generación - Respuesta correcta
**Objetivo:** Validar estructura de respuesta del job de generación

```java
@Test
public void testJobGeneracionEstructuraRespuesta() {
    given()
    .when()
        .get("/gastos/generate")
    .then()
        .statusCode(200)
        .body("message", notNullValue())
        .body("summary", notNullValue())
        .body("summary.total_generated", greaterThanOrEqualTo(0))
        .body("summary.total_errors", greaterThanOrEqualTo(0))
        .body("summary.breakdown", notNullValue())
        .body("summary.breakdown.recurrentes", greaterThanOrEqualTo(0))
        .body("summary.breakdown.debitos", greaterThanOrEqualTo(0))
        .body("summary.breakdown.compras", greaterThanOrEqualTo(0))
        .body("summary.breakdown.unicos", greaterThanOrEqualTo(0))
        .body("details", notNullValue())
        .body("details.success", notNullValue())
        .body("details.errors", notNullValue());
}
```

### TC008: Job Generación - Idempotencia
**Objetivo:** Validar que ejecutar el job múltiples veces el mismo día no duplica gastos

```java
@Test
public void testJobGeneracionIdempotencia() {
    // Primera ejecución
    Response primera = given()
    .when()
        .get("/gastos/generate")
    .then()
        .statusCode(200)
        .extract().response();
    
    int generadosPrimera = primera.path("summary.total_generated");
    
    // Segunda ejecución inmediata
    Response segunda = given()
    .when()
        .get("/gastos/generate")
    .then()
        .statusCode(200)
        .extract().response();
    
    int generadosSegunda = segunda.path("summary.total_generated");
    
    // No debería generar gastos duplicados
    assertThat(generadosSegunda, lessThanOrEqualTo(generadosPrimera));
}
```

---

## 5. Test Cases - Validaciones de Datos

### TC009: Compra - Fecha futura no permitida
**Objetivo:** Validar que no se pueden crear compras con fecha futura

```java
@Test
public void testCompraFechaFuturaNoPermitida() {
    String fechaFutura = LocalDate.now().plusDays(1).toString();
    
    CompraRequest compra = CompraRequest.builder()
        .descripcion("Compra futura")
        .montoTotal(5000.00)
        .cantidadCuotas(1)
        .fechaCompra(fechaFutura) // ERROR: fecha futura
        .categoriaGastoId(2)
        .importanciaGastoId(2)
        .tipoPagoId(1)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(compra)
    .when()
        .post("/compras")
    .then()
        .statusCode(400)
        .body("error", containsString("futura"));
}
```

### TC010: Compra - Validación cantidad cuotas
**Objetivo:** Validar rango de cantidad de cuotas (1-60)

```java
@Test
public void testCompraValidacionCantidadCuotas() {
    CompraRequest compraInvalida = CompraRequest.builder()
        .descripcion("Compra muchas cuotas")
        .montoTotal(5000.00)
        .cantidadCuotas(100) // ERROR: máximo 60
        .fechaCompra(LocalDate.now().toString())
        .categoriaGastoId(2)
        .importanciaGastoId(2)
        .tipoPagoId(1)
        .build();
    
    given()
        .contentType(CONTENT_TYPE)
        .body(compraInvalida)
    .when()
        .post("/compras")
    .then()
        .statusCode(400)
        .body("error", containsString("cuotas"));
}
```

---

## Clases de Datos (DTOs)

```java
@Data
@Builder
public class CompraRequest {
    private String descripcion;
    private Double montoTotal;
    private Integer cantidadCuotas;
    private String fechaCompra;
    private Integer categoriaGastoId;
    private Integer importanciaGastoId;
    private Integer tipoPagoId;
    private Integer tarjetaId;
}

@Data  
@Builder
public class GastoRecurrenteRequest {
    private String descripcion;
    private Double monto;
    private Integer diaDePago;
    private Integer mesDePago;
    private Integer frecuenciaGastoId;
    private Integer categoriaGastoId;
    private Integer importanciaGastoId;
    private Integer tipoPagoId;
    private Integer tarjetaId;
    private Boolean activo;
}

@Data
@Builder
public class TarjetaRequest {
    private String nombre;
    private String tipo;
    private String banco;
    private Integer diaCierre;
    private Integer diaVencimiento;
    private Boolean permiteCuotas;
}
```

---

## Configuración MCP (Model Context Protocol)

Para conectar este proyecto Node.js con tu framework Java RestAssured vía MCP:

### Archivo MCP de configuración (mcp-config.json):
```json
{
  "servers": {
    "finanzas-api": {
      "command": "node",
      "args": ["mcp-server.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3030",
        "NODE_ENV": "test"
      }
    }
  }
}
```

### Comandos para exposición vía MCP:
- `get_business_rules` - Retorna reglas de negocio actualizadas
- `get_api_schema` - Retorna esquemas de validación Joi
- `get_test_data` - Retorna datos de prueba predefinidos
- `execute_generation_job` - Ejecuta job de generación
- `get_database_state` - Retorna estado actual de entidades

¿Te gustaría que implemente el servidor MCP o necesitas más detalles sobre algún test case específico?