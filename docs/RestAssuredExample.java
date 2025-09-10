package com.finanzas.test;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

/**
 * Ejemplo de integración RestAssured con MCP Server
 * para testing de la API de finanzas personales
 */
public class RestAssuredExample {
    
    public static final String MCP_BASE_URL = "http://localhost:3031";
    public static final String API_BASE_URL = "http://localhost:3030";
    
    @BeforeAll
    public static void setup() {
        // Configuración global de RestAssured
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }
    
    @BeforeEach
    public void checkServices() {
        // Verificar que MCP Server esté disponible
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
    public void testMCPGetAPIDocumentation() {
        System.out.println("=== Test: Obtener documentación API vía MCP ===");
        
        // Obtener documentación Swagger desde MCP
        Response response = given()
            .baseUri(MCP_BASE_URL)
        .when()
            .get("/mcp/api-docs")
        .then()
            .statusCode(200)
            .contentType(containsString("yaml"))
            .extract().response();
        
        System.out.println("Swagger YAML obtenido exitosamente");
        System.out.println("Tamaño de respuesta: " + response.getBody().asString().length() + " caracteres");
    }
    
    @Test
    public void testMCPGetEndpointsList() {
        System.out.println("=== Test: Obtener lista de endpoints vía MCP ===");
        
        Response response = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{}")
        .when()
            .post("/mcp/tools/get_api_endpoints")
        .then()
            .statusCode(200)
            .body("content[0].text", containsString("gastos"))
            .body("content[0].text", containsString("compras"))
            .extract().response();
        
        String endpoints = response.jsonPath().getString("content[0].text");
        System.out.println("Endpoints obtenidos:");
        System.out.println(endpoints);
    }
    
    @Test
    public void testMCPGetTestScenarios() {
        System.out.println("=== Test: Obtener escenarios de test para compras ===");
        
        Response response = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{\"category\": \"compras\"}")
        .when()
            .post("/mcp/tools/get_test_scenarios")
        .then()
            .statusCode(200)
            .body("content[0].text", containsString("compras"))
            .extract().response();
        
        String scenarios = response.jsonPath().getString("content[0].text");
        System.out.println("Escenarios de test para compras:");
        System.out.println(scenarios);
    }
    
    @Test 
    public void testMCPProxyAPICall() {
        System.out.println("=== Test: Ejecutar llamada a API vía MCP proxy ===");
        
        // Ejecutar GET /api/gastos/all a través del proxy MCP
        Response response = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("""
                {
                    "method": "GET",
                    "endpoint": "/api/gastos/all"
                }
                """)
        .when()
            .post("/mcp/tools/execute_api_call")
        .then()
            .statusCode(200)
            .body("content[0].text", containsString("status"))
            .extract().response();
        
        String apiResponse = response.jsonPath().getString("content[0].text");
        System.out.println("Respuesta de API vía MCP proxy:");
        System.out.println(apiResponse);
    }
    
    @Test
    public void testDirectAPICall() {
        System.out.println("=== Test: Llamada directa a API (comparación) ===");
        
        // Llamada directa a la API para comparar
        Response response = given()
            .baseUri(API_BASE_URL)
        .when()
            .get("/api/gastos/all")
        .then()
            .statusCode(200)
            .body("success", equalTo(true))
            .body("data", notNullValue())
            .extract().response();
        
        System.out.println("Respuesta directa de API:");
        System.out.println("Success: " + response.jsonPath().getBoolean("success"));
        System.out.println("Data type: " + response.jsonPath().getString("meta.type"));
        System.out.println("Total items: " + response.jsonPath().getInt("meta.total"));
    }
    
    @Test
    public void testMCPToolsList() {
        System.out.println("=== Test: Obtener herramientas disponibles en MCP ===");
        
        Response response = given()
            .baseUri(MCP_BASE_URL)
        .when()
            .get("/mcp/tools")
        .then()
            .statusCode(200)
            .body("tools", notNullValue())
            .body("tools.size()", greaterThan(0))
            .extract().response();
        
        System.out.println("Herramientas MCP disponibles:");
        response.jsonPath().getList("tools").forEach(tool -> {
            System.out.println("- " + tool);
        });
    }
    
    @Test
    public void testIntegrationWorkflow() {
        System.out.println("=== Test: Flujo de trabajo integrado ===");
        
        // 1. Obtener escenarios de test
        Response scenariosResponse = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{\"category\": \"job\"}")
        .when()
            .post("/mcp/tools/get_test_scenarios")
        .then()
            .statusCode(200)
            .extract().response();
        
        System.out.println("✓ Escenarios obtenidos");
        
        // 2. Ejecutar job de generación vía MCP proxy
        Response jobResponse = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("""
                {
                    "method": "GET",
                    "endpoint": "/api/gastos/generate"
                }
                """)
        .when()
            .post("/mcp/tools/execute_api_call")
        .then()
            .statusCode(200)
            .extract().response();
        
        System.out.println("✓ Job ejecutado vía MCP");
        
        // 3. Verificar resultado
        String jobResult = jobResponse.jsonPath().getString("content[0].text");
        System.out.println("Resultado del job:");
        System.out.println(jobResult);
        
        assert jobResult.contains("\"status\":200") : "El job debería completarse exitosamente";
        System.out.println("✓ Flujo integrado completado exitosamente");
    }
}