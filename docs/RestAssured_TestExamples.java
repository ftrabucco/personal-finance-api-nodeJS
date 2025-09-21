package com.finanzas.test;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test scenarios específicos para la API de Finanzas Personales
 * Basado en RestAssured_TestScenarios.json
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class RestAssuredTestExamples {
    
    public static final String API_BASE_URL = "http://localhost:3030";
    public static final String MCP_BASE_URL = "http://localhost:3031";
    
    private static Integer createdGastoUnicoId;
    private static Integer createdGastoId;
    
    @BeforeAll
    static void setup() {
        RestAssured.baseURI = API_BASE_URL;
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
        
        // Verify services are running
        given()
            .when()
            .get("/api/gastos-unicos?limit=1")
            .then()
            .statusCode(200);
            
        given()
            .baseUri(MCP_BASE_URL)
            .when()
            .get("/mcp/health")
            .then()
            .statusCode(200);
    }
    
    @Test
    @Order(1)
    @DisplayName("Test Smart Pagination - All Results")
    void testSmartPaginationAllResults() {
        given()
            .when()
            .get("/api/gastos-unicos")
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data", not(empty()))
            .body("meta.total", greaterThan(0))
            .body("meta.type", equalTo("collection"))
            .body("meta.pagination", nullValue()); // No pagination metadata when no limit
    }
    
    @Test
    @Order(2) 
    @DisplayName("Test Smart Pagination - With Limit")
    void testSmartPaginationWithLimit() {
        given()
            .param("limit", 5)
            .param("offset", 10)
            .when()
            .get("/api/gastos-unicos")
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.size()", lessThanOrEqualTo(5))
            .body("meta.pagination.limit", equalTo(5))
            .body("meta.pagination.offset", equalTo(10))
            .body("meta.pagination.hasPrev", equalTo(true));
    }
    
    @Test
    @Order(3)
    @DisplayName("Create Gasto Único - Business Logic Test")
    void testCreateGastoUnicoBusinessLogic() {
        String payload = """
            {
                "descripcion": "Test RestAssured Business Logic",
                "monto": 2500.50,
                "fecha": "2025-01-20",
                "categoria_gasto_id": 2,
                "importancia_gasto_id": 1,
                "tipo_pago_id": 1,
                "procesado": false
            }
            """;
            
        Response response = given()
            .contentType("application/json")
            .body(payload)
            .when()
            .post("/api/gastos-unicos")
            .then()
            .statusCode(201)
            .body("success", equalTo(true))
            .body("data.gastoUnico.descripcion", equalTo("Test RestAssured Business Logic"))
            .body("data.gastoUnico.monto", equalTo("2500.50"))
            .body("data.gastoUnico.procesado", equalTo(false))
            .body("data.gasto", notNullValue()) // Business rule: creates real gasto too
            .extract().response();
            
        // Store IDs for cleanup and follow-up tests
        createdGastoUnicoId = response.path("data.gastoUnico.id");
        createdGastoId = response.path("data.gasto.id");
        
        assertNotNull(createdGastoUnicoId);
        assertNotNull(createdGastoId);
    }
    
    @Test
    @Order(4)
    @DisplayName("Verify Real Gasto Was Created")
    void testVerifyRealGastoCreated() {
        assertNotNull(createdGastoId, "Previous test should have created a real gasto");
        
        given()
            .when()
            .get("/api/gastos/" + createdGastoId)
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.descripcion", equalTo("Test RestAssured Business Logic"))
            .body("data.tipo_origen", equalTo("gasto_unico"));
    }
    
    @Test
    @Order(5)
    @DisplayName("Test Filtering by Category")
    void testFilteringByCategory() {
        given()
            .param("categoria_gasto_id", 2)
            .param("limit", 10)
            .when()
            .get("/api/gastos-unicos")
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.findAll { it.categoria_gasto_id != 2 }", empty()) // All items should have category 2
            .body("meta.pagination.limit", equalTo(10));
    }
    
    @Test
    @Order(6)
    @DisplayName("Test Date Range Filtering")
    void testDateRangeFiltering() {
        given()
            .param("fecha_desde", "2025-01-01")
            .param("fecha_hasta", "2025-01-31")
            .param("limit", 20)
            .when()
            .get("/api/gastos-unicos")
            .then()
            .statusCode(200)
            .body("success", equalTo(true));
            // Note: Date validation in Groovy/RestAssured can be complex
            // Consider adding custom matchers for date validation
    }
    
    @Test
    @Order(7)
    @DisplayName("Test Compras with Pending Installments")
    void testComprasPendingInstallments() {
        given()
            .param("pendiente_cuotas", true)
            .param("limit", 5)
            .when()
            .get("/api/compras")
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.findAll { it.pendiente_cuotas != true }", empty()) // All should have pending installments
            .body("data.size()", lessThanOrEqualTo(5));
    }
    
    @Test
    @Order(8)
    @DisplayName("Test Validation - Missing Required Fields")
    void testValidationMissingFields() {
        String incompletePayload = """
            {
                "descripcion": "Test incompleto"
            }
            """;
            
        given()
            .contentType("application/json")
            .body(incompletePayload)
            .when()
            .post("/api/gastos-unicos")
            .then()
            .statusCode(400)
            .body("success", equalTo(false))
            .body("error", notNullValue());
    }
    
    @Test
    @Order(9)
    @DisplayName("Test Validation - Invalid Date Format")
    void testValidationInvalidDate() {
        String invalidPayload = """
            {
                "descripcion": "Test fecha inválida",
                "monto": 1000,
                "fecha": "invalid-date",
                "categoria_gasto_id": 1,
                "importancia_gasto_id": 1,
                "tipo_pago_id": 1
            }
            """;
            
        given()
            .contentType("application/json")
            .body(invalidPayload)
            .when()
            .post("/api/gastos-unicos")
            .then()
            .statusCode(400)
            .body("success", equalTo(false));
    }
    
    @Test
    @Order(10)
    @DisplayName("Test 404 - Non-existent Resource")
    void testNonExistentResource() {
        given()
            .when()
            .get("/api/gastos-unicos/99999")
            .then()
            .statusCode(404)
            .body("success", equalTo(false))
            .body("error", containsStringIgnoringCase("no encontrado"));
    }
    
    @Test
    @Order(11)
    @DisplayName("Test MCP Health Check")
    void testMCPHealthCheck() {
        given()
            .baseUri(MCP_BASE_URL)
            .when()
            .get("/mcp/health")
            .then()
            .statusCode(200)
            .body("status", equalTo("ok"))
            .body("server", equalTo("finanzas-api-mcp"));
    }
    
    @Test
    @Order(12)
    @DisplayName("Test MCP API Endpoints Tool")
    void testMCPApiEndpointsTool() {
        given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{}")
            .when()
            .post("/mcp/tools/get_api_endpoints")
            .then()
            .statusCode(200)
            .body("content", notNullValue())
            .body("content[0].text", containsString("gastos_unicos"));
    }
    
    @Test
    @Order(13)
    @DisplayName("Test MCP API Call Proxy")
    void testMCPApiCallProxy() {
        String mcpPayload = """
            {
                "method": "GET",
                "endpoint": "/api/gastos-unicos?limit=3"
            }
            """;
            
        Response mcpResponse = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body(mcpPayload)
            .when()
            .post("/mcp/tools/execute_api_call")
            .then()
            .statusCode(200)
            .body("content", notNullValue())
            .extract().response();
            
        // Parse the nested JSON response
        String nestedResponse = mcpResponse.path("content[0].text");
        Response parsedResponse = given()
            .contentType("application/json")
            .body(nestedResponse)
            .when()
            .post("http://httpbin.org/anything") // Helper to parse JSON
            .then()
            .extract().response();
            
        // Verify the proxied API call was successful
        assertEquals(200, parsedResponse.path("json.status"));
    }
    
    @Test
    @Order(14)
    @DisplayName("Test Performance - Large Page Size")
    void testPerformanceLargePageSize() {
        long startTime = System.currentTimeMillis();
        
        given()
            .param("limit", 100)
            .param("offset", 0)
            .when()
            .get("/api/gastos-unicos")
            .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data.size()", lessThanOrEqualTo(100));
            
        long responseTime = System.currentTimeMillis() - startTime;
        assertTrue(responseTime < 2000, "Response time should be under 2 seconds, was: " + responseTime + "ms");
    }
    
    @Test
    @Order(15)
    @DisplayName("Test Create Compra en Cuotas")
    void testCreateCompraEnCuotas() {
        String compraPayload = """
            {
                "descripcion": "Compra en cuotas RestAssured",
                "monto_total": 12000,
                "cantidad_cuotas": 6,
                "fecha_compra": "2025-01-20",
                "categoria_gasto_id": 3,
                "importancia_gasto_id": 2,
                "tipo_pago_id": 3,
                "tarjeta_id": 1
            }
            """;
            
        given()
            .contentType("application/json")
            .body(compraPayload)
            .when()
            .post("/api/compras")
            .then()
            .statusCode(201)
            .body("success", equalTo(true))
            .body("data.descripcion", equalTo("Compra en cuotas RestAssured"))
            .body("data.cantidad_cuotas", equalTo(6))
            .body("data.pendiente_cuotas", equalTo(true));
    }
    
    @AfterAll
    static void cleanup() {
        // Clean up created test data
        if (createdGastoUnicoId != null) {
            given()
                .when()
                .delete("/api/gastos-unicos/" + createdGastoUnicoId)
                .then()
                .statusCode(anyOf(is(200), is(404))); // 404 is OK if already deleted
        }
        
        if (createdGastoId != null) {
            given()
                .when()
                .delete("/api/gastos/" + createdGastoId)
                .then()
                .statusCode(anyOf(is(200), is(404))); // 404 is OK if already deleted
        }
    }
    
    // Helper methods
    private RequestSpecification givenMCP() {
        return given().baseUri(MCP_BASE_URL);
    }
    
    private void waitForAsyncOperation() {
        try {
            Thread.sleep(100); // Wait for async operations
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}