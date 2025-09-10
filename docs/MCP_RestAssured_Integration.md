# MCP + RestAssured Integration Guide

## Configuración de MCP (Model Context Protocol) para RestAssured

### 1. Levantar el servidor MCP

Tu aplicación ya tiene configurado un servidor MCP que puede exponerse vía HTTP para que RestAssured pueda acceder.

#### Comandos disponibles:

```bash
# Modo stdio (para uso directo con Claude Code)
npm run mcp:start

# Modo HTTP (para RestAssured y otras herramientas)
npm run mcp:http

# Modo desarrollo con auto-reload
npm run mcp:dev
```

#### Servidor MCP HTTP activo en:
- **URL Base**: `http://localhost:3031`
- **Puerto**: 3031 (configurable con `MCP_PORT=xxxx`)

### 2. Endpoints disponibles del MCP Server

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/mcp/health` | GET | Estado del servidor MCP |
| `/mcp/tools` | GET | Lista de herramientas disponibles |
| `/mcp/tools/{toolName}` | POST | Ejecutar herramienta específica |
| `/mcp/api-docs` | GET | Documentación Swagger/OpenAPI |

### 3. Herramientas MCP disponibles

- **`get_business_rules`**: Reglas de negocio del sistema
- **`get_api_endpoints`**: Lista de endpoints de la API principal
- **`get_gastos_api_docs`**: Documentación detallada de endpoints de gastos
- **`get_swagger_docs`**: Documentación OpenAPI/Swagger completa
- **`get_test_scenarios`**: Escenarios de test predefinidos por categoría
- **`execute_api_call`**: Proxy para ejecutar llamadas a la API principal

### 4. Configuración Java RestAssured

#### Dependencias Maven

```xml
<dependencies>
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>rest-assured</artifactId>
        <version>5.4.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.16.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

#### Configuración Base RestAssured

```java
package com.finanzas.test.config;

import io.restassured.RestAssured;
import io.restassured.config.ObjectMapperConfig;
import io.restassured.mapper.ObjectMapperType;
import org.junit.jupiter.api.BeforeAll;

public class MCPTestConfig {
    
    public static final String MCP_BASE_URL = "http://localhost:3031";
    public static final String API_BASE_URL = "http://localhost:3030";
    
    @BeforeAll
    public static void setup() {
        // Configuración para MCP Server
        RestAssured.config = RestAssured.config()
            .objectMapperConfig(ObjectMapperConfig.objectMapperConfig()
                .defaultObjectMapperType(ObjectMapperType.JACKSON_2));
    }
}
```

#### Ejemplo de Test usando MCP

```java
package com.finanzas.test;

import io.restassured.response.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class MCPIntegrationTest extends MCPTestConfig {
    
    @BeforeEach
    public void checkMCPHealth() {
        // Verificar que MCP esté disponible
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
    public void testGetAPIEndpoints() {
        // Obtener lista de endpoints disponibles vía MCP
        Response response = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
        .when()
            .post("/mcp/tools/get_api_endpoints")
        .then()
            .statusCode(200)
            .extract().response();
        
        System.out.println("API Endpoints: " + response.asString());
    }
    
    @Test
    public void testGetTestScenarios() {
        // Obtener escenarios de test para compras
        given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{\"category\": \"compras\"}")
        .when()
            .post("/mcp/tools/get_test_scenarios")
        .then()
            .statusCode(200)
            .body("content[0].text", containsString("compras"));
    }
    
    @Test
    public void testExecuteAPICallViaMP() {
        // Ejecutar llamada a API a través del MCP proxy
        given()
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
            .statusCode(200);
    }
    
    @Test
    public void testGetSwaggerDocs() {
        // Obtener documentación Swagger vía MCP
        given()
            .baseUri(MCP_BASE_URL)
        .when()
            .get("/mcp/api-docs")
        .then()
            .statusCode(200)
            .contentType(containsString("yaml"));
    }
}
```

#### Ejemplo de Test Suite Completa

```java
package com.finanzas.test.suite;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.restassured.response.Response;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import java.util.ArrayList;
import java.util.List;
import static io.restassured.RestAssured.*;

public class DynamicMCPTestSuite extends MCPTestConfig {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @TestFactory
    public List<DynamicTest> createTestsFromMCP() throws Exception {
        // Obtener escenarios de test desde MCP
        Response response = given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body("{\"category\": \"all\"}")
        .when()
            .post("/mcp/tools/get_test_scenarios");
        
        String jsonContent = response.jsonPath().getString("content[0].text");
        JsonNode scenarios = objectMapper.readTree(jsonContent);
        
        List<DynamicTest> tests = new ArrayList<>();
        
        // Generar tests dinámicos desde los escenarios MCP
        scenarios.fields().forEachRemaining(entry -> {
            String category = entry.getKey();
            JsonNode categoryTests = entry.getValue();
            
            categoryTests.forEach(testCase -> {
                String testName = testCase.get("name").asText();
                String description = testCase.get("description").asText();
                String endpoint = testCase.get("endpoint").asText();
                
                DynamicTest test = DynamicTest.dynamicTest(
                    category + " - " + testName,
                    () -> executeTestScenario(testCase)
                );
                
                tests.add(test);
            });
        });
        
        return tests;
    }
    
    private void executeTestScenario(JsonNode testCase) {
        String endpoint = testCase.get("endpoint").asText();
        String method = endpoint.split(" ")[0];
        String path = endpoint.split(" ")[1];
        
        // Ejecutar el test scenario via MCP proxy
        given()
            .baseUri(MCP_BASE_URL)
            .contentType("application/json")
            .body(String.format("""
                {
                    "method": "%s",
                    "endpoint": "%s"
                }
                """, method, path))
        .when()
            .post("/mcp/tools/execute_api_call")
        .then()
            .statusCode(200);
    }
}
```

### 5. Usar MCP en proceso de CI/CD

#### Script de setup para tests

```bash
#!/bin/bash
# test-setup.sh

echo "🚀 Iniciando setup para tests con MCP + RestAssured"

# 1. Levantar base de datos
npm run docker:up
sleep 30

# 2. Sembrar datos de test
npm run seed-db:test

# 3. Levantar API principal
npm run dev &
API_PID=$!

# 4. Levantar servidor MCP
npm run mcp:http &
MCP_PID=$!

# 5. Esperar que ambos servicios estén listos
echo "⏳ Esperando servicios..."
sleep 10

# 6. Verificar que MCP esté respondiendo
curl -f http://localhost:3031/mcp/health || {
    echo "❌ Error: MCP server no está disponible"
    exit 1
}

# 7. Verificar que API esté respondiendo
curl -f http://localhost:3030/api/gastos/all || {
    echo "❌ Error: API server no está disponible"
    exit 1
}

echo "✅ Setup completo - Servicios disponibles:"
echo "  - API: http://localhost:3030"
echo "  - MCP: http://localhost:3031"
echo "  - Swagger: http://localhost:3030/api-docs"

# Ejecutar tests Java
mvn test

# Cleanup
kill $API_PID $MCP_PID
npm run docker:down
```

### 6. Beneficios de esta integración

1. **Documentación viva**: Los tests acceden a la documentación real de la API
2. **Escenarios dinámicos**: Los casos de test se generan desde las reglas de negocio
3. **Proxy inteligente**: MCP puede ejecutar llamadas a la API con context adicional
4. **Consistencia**: Un solo punto de verdad para documentación y tests
5. **Evolución automática**: Los tests se actualizan cuando cambia la API

### 7. Comandos rápidos

```bash
# Desarrollo completo
npm run dev & npm run mcp:http &

# Solo MCP para testing
npm run mcp:http

# Verificar estado
curl http://localhost:3031/mcp/health

# Ver herramientas disponibles  
curl http://localhost:3031/mcp/tools

# Obtener documentación
curl http://localhost:3031/mcp/api-docs
```