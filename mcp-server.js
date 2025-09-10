#!/usr/bin/env node

/**
 * MCP Server para API de Finanzas Personales
 * Expone funcionalidades para testing con RestAssured Java
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FinanzasApiMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'finanzas-api-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Lista de herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_business_rules',
            description: 'Retorna las reglas de negocio completas del sistema',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_api_endpoints',
            description: 'Retorna lista de endpoints disponibles para testing',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_gastos_api_docs',
            description: 'Retorna documentación detallada de /api/gastos endpoints con casos de uso, parámetros y escenarios de prueba',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_swagger_docs',
            description: 'Retorna documentación Swagger/OpenAPI para los endpoints de gastos y gastos únicos',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_test_scenarios',
            description: 'Retorna escenarios de test predefinidos',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Categoría de tests: gastos_unicos, compras, recurrentes, tarjetas, job',
                  enum: ['gastos_unicos', 'compras', 'recurrentes', 'tarjetas', 'job', 'all']
                }
              },
            },
          },
          {
            name: 'get_validation_schemas',
            description: 'Retorna esquemas de validación Joi para cada entidad',
            inputSchema: {
              type: 'object',
              properties: {
                entity: {
                  type: 'string',
                  description: 'Entidad específica: gasto_unico, compra, gasto_recurrente, debito_automatico',
                  enum: ['gasto_unico', 'compra', 'gasto_recurrente', 'debito_automatico']
                }
              },
            },
          },
          {
            name: 'get_database_schema',
            description: 'Retorna estructura de base de datos y relaciones',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'execute_api_call',
            description: 'Ejecuta llamada a la API para testing',
            inputSchema: {
              type: 'object',
              properties: {
                method: {
                  type: 'string',
                  enum: ['GET', 'POST', 'PUT', 'DELETE'],
                  description: 'Método HTTP'
                },
                endpoint: {
                  type: 'string',
                  description: 'Endpoint relativo (ej: /api/compras)'
                },
                body: {
                  type: 'object',
                  description: 'Cuerpo de la request (para POST/PUT)'
                }
              },
              required: ['method', 'endpoint']
            },
          }
        ],
      };
    });

    // Manejador de llamadas a herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_business_rules':
            return await this.getBusinessRules();
          
          case 'get_api_endpoints':
            return await this.getApiEndpoints();
            
          case 'get_gastos_api_docs':
            return await this.getGastosApiDocs();
            
          case 'get_swagger_docs':
            return await this.getSwaggerDocs();
          
          case 'get_test_scenarios':
            return await this.getTestScenarios(args.category || 'all');
          
          case 'get_validation_schemas':
            return await this.getValidationSchemas(args.entity);
          
          case 'get_database_schema':
            return await this.getDatabaseSchema();
          
          case 'execute_api_call':
            return await this.executeApiCall(args);
          
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error ejecutando ${name}: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getBusinessRules() {
    try {
      const rulesPath = path.join(__dirname, 'memoria', 'business_rules.md');
      const content = await fs.readFile(rulesPath, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error leyendo business rules: ${error.message}`,
          },
        ],
      };
    }
  }

  async getGastosApiDocs() {
    try {
      const docsPath = path.join(__dirname, 'memoria', 'api_gastos_endpoints.md');
      const content = await fs.readFile(docsPath, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error leyendo documentación de gastos API: ${error.message}`,
          },
        ],
      };
    }
  }

  async getSwaggerDocs() {
    try {
      const swaggerPath = path.join(__dirname, 'memoria', 'swagger_gastos.yaml');
      const content = await fs.readFile(swaggerPath, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error leyendo documentación Swagger: ${error.message}`,
          },
        ],
      };
    }
  }

  async getApiEndpoints() {
    const endpoints = {
      gastos: {
        base: '/api/gastos',
        endpoints: [
          'GET /api/gastos/all - Obtener todos los gastos sin filtros',
          'GET /api/gastos - Obtener gastos con filtros opcionales y paginación inteligente',
          'GET /api/gastos/summary - Resumen de gastos por período',
          'GET /api/gastos/generate - Ejecutar job de generación',
          'GET /api/gastos/:id - Obtener gasto por ID',
          'POST /api/gastos - Crear nuevo gasto',
          'POST /api/gastos/search - Búsqueda avanzada con paginación',
          'PUT /api/gastos/:id - Actualizar gasto',
          'DELETE /api/gastos/:id - Eliminar gasto'
        ]
      },
      gastos_unicos: {
        base: '/api/gastos-unicos',
        endpoints: [
          'GET /api/gastos-unicos - Obtener gastos únicos con filtros opcionales y paginación inteligente',
          'GET /api/gastos-unicos/:id - Obtener gasto único por ID',
          'POST /api/gastos-unicos - Crear nuevo gasto único',
          'PUT /api/gastos-unicos/:id - Actualizar gasto único',
          'DELETE /api/gastos-unicos/:id - Eliminar gasto único'
        ]
      },
      compras: {
        base: '/api/compras',
        endpoints: [
          'GET /api/compras - Obtener compras con filtros opcionales y paginación inteligente',
          'GET /api/compras/:id - Obtener compra por ID',
          'POST /api/compras - Crear nueva compra',
          'PUT /api/compras/:id - Actualizar compra',
          'DELETE /api/compras/:id - Eliminar compra'
        ]
      },
      gastos_recurrentes: {
        base: '/api/gastos-recurrentes',
        endpoints: [
          'GET /api/gastos-recurrentes - Obtener gastos recurrentes con filtros opcionales y paginación inteligente',
          'GET /api/gastos-recurrentes/:id - Obtener por ID',
          'POST /api/gastos-recurrentes - Crear gasto recurrente',
          'PUT /api/gastos-recurrentes/:id - Actualizar',
          'DELETE /api/gastos-recurrentes/:id - Eliminar'
        ]
      },
      debitos_automaticos: {
        base: '/api/debitos-automaticos',
        endpoints: [
          'GET /api/debitos-automaticos - Obtener débitos automáticos con filtros opcionales y paginación inteligente',
          'GET /api/debitos-automaticos/:id - Obtener por ID',
          'POST /api/debitos-automaticos - Crear débito automático',
          'PUT /api/debitos-automaticos/:id - Actualizar',
          'DELETE /api/debitos-automaticos/:id - Eliminar'
        ]
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(endpoints, null, 2),
        },
      ],
    };
  }

  async getTestScenarios(category) {
    const scenarios = {
      gastos_unicos: [
        {
          name: 'Gasto Único Básico',
          description: 'Crear gasto único simple',
          endpoint: 'POST /api/gastos-unicos',
          payload: {
            descripcion: 'Test gasto único',
            monto: 1500,
            fecha: new Date().toISOString().split('T')[0],
            categoria_gasto_id: 2,
            importancia_gasto_id: 2,
            tipo_pago_id: 1,
            procesado: false
          },
          expected: {
            status: 201,
            procesado: false
          }
        },
        {
          name: 'Paginación Gastos Únicos',
          description: 'Test paginación inteligente sin limit (retorna todos)',
          endpoint: 'GET /api/gastos-unicos',
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: 'array',
              meta: { total: 'number', type: 'collection' }
            }
          }
        },
        {
          name: 'Paginación con Límite',
          description: 'Test paginación con limit (retorna metadata de paginación)',
          endpoint: 'GET /api/gastos-unicos?limit=3',
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: 'array',
              meta: { 
                total: 'number', 
                type: 'collection',
                pagination: {
                  limit: 3,
                  offset: 0,
                  hasNext: 'boolean',
                  hasPrev: 'boolean'
                }
              }
            }
          }
        }
      ],
      compras: [
        {
          name: 'Compra Efectivo Inmediata',
          description: 'Compra en efectivo debe generar gasto en fecha de compra',
          endpoint: 'POST /api/compras',
          payload: {
            descripcion: 'Test efectivo',
            monto_total: 5000,
            cantidad_cuotas: 1,
            fecha_compra: new Date().toISOString().split('T')[0],
            categoria_gasto_id: 2,
            importancia_gasto_id: 2,
            tipo_pago_id: 1
          },
          expected: {
            status: 201,
            pendiente_cuotas: true,
            gasto: null
          }
        },
        {
          name: 'Compra Crédito Vencimiento',
          description: 'Compra con crédito debe esperar fecha de vencimiento',
          endpoint: 'POST /api/compras',
          payload: {
            descripcion: 'Test crédito',
            monto_total: 8000,
            cantidad_cuotas: 1,
            fecha_compra: new Date().toISOString().split('T')[0],
            categoria_gasto_id: 2,
            importancia_gasto_id: 2,
            tipo_pago_id: 3,
            tarjeta_id: 2
          },
          expected: {
            status: 201,
            pendiente_cuotas: true,
            gasto: null
          }
        }
      ],
      job: [
        {
          name: 'Job Generación Básico',
          description: 'Ejecutar job de generación y verificar respuesta',
          endpoint: 'GET /api/gastos/generate',
          expected: {
            status: 200,
            fields: ['message', 'summary', 'details'],
            summary_fields: ['total_generated', 'total_errors', 'breakdown']
          }
        }
      ],
      tarjetas: [
        {
          name: 'Tarjeta Crédito Requiere Fechas',
          description: 'Tarjeta de crédito debe tener dias de cierre y vencimiento',
          endpoint: 'POST /api/tarjetas',
          payload: {
            nombre: 'Test Crédito',
            tipo: 'credito',
            banco: 'Test Bank',
            dia_cierre: null,
            dia_vencimiento: null,
            permite_cuotas: true
          },
          expected: {
            status: 400,
            error_contains: 'fechas'
          }
        }
      ]
    };

    const result = category === 'all' ? scenarios : { [category]: scenarios[category] };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async getValidationSchemas(entity) {
    try {
      let schemaPath;
      
      switch (entity) {
        case 'compra':
          schemaPath = 'src/validations/compra.validation.js';
          break;
        case 'gasto_recurrente':
          schemaPath = 'src/validations/gastoRecurrente.validation.js';
          break;
        case 'debito_automatico':
          schemaPath = 'src/validations/debitoAutomatico.validation.js';
          break;
        default:
          // Retornar todos los esquemas
          const allSchemas = await Promise.all([
            fs.readFile(path.join(__dirname, 'src/validations/compra.validation.js'), 'utf-8'),
            fs.readFile(path.join(__dirname, 'src/validations/gastoRecurrente.validation.js'), 'utf-8'),
            fs.readFile(path.join(__dirname, 'src/validations/debitoAutomatico.validation.js'), 'utf-8')
          ]);
          
          return {
            content: [
              {
                type: 'text',
                text: `// Compra Validation\n${allSchemas[0]}\n\n// Gasto Recurrente Validation\n${allSchemas[1]}\n\n// Débito Automático Validation\n${allSchemas[2]}`,
              },
            ],
          };
      }

      const content = await fs.readFile(path.join(__dirname, schemaPath), 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error leyendo esquemas de validación: ${error.message}`,
          },
        ],
      };
    }
  }

  async getDatabaseSchema() {
    const schema = {
      tables: {
        gastos: {
          description: 'Tabla principal de gastos reales',
          fields: [
            'id (PK)', 'fecha', 'monto_ars', 'monto_usd', 'descripcion',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)', 
            'tipo_pago_id (FK)', 'tarjeta_id (FK)', 'frecuencia_gasto_id (FK)',
            'tipo_origen', 'id_origen', 'cantidad_cuotas_totales', 'cantidad_cuotas_pagadas'
          ]
        },
        compras: {
          description: 'Compras en cuotas o inmediatas',
          fields: [
            'id (PK)', 'descripcion', 'monto_total', 'cantidad_cuotas', 'fecha_compra',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'tipo_pago_id (FK)', 'tarjeta_id (FK)', 'pendiente_cuotas'
          ]
        },
        gastos_recurrentes: {
          description: 'Gastos que se repiten periódicamente',
          fields: [
            'id (PK)', 'descripcion', 'monto', 'dia_de_pago', 'mes_de_pago',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'frecuencia_gasto_id (FK)', 'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'activo', 'ultima_fecha_generado'
          ]
        },
        debitos_automaticos: {
          description: 'Débitos automáticos programados',
          fields: [
            'id (PK)', 'descripcion', 'monto', 'dia_de_pago', 'mes_de_pago',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'frecuencia_gasto_id (FK)', 'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'activo', 'ultima_fecha_generado'
          ]
        },
        tarjetas: {
          description: 'Tarjetas de crédito y débito',
          fields: [
            'id (PK)', 'nombre', 'tipo', 'banco', 'dia_cierre', 'dia_vencimiento',
            'permite_cuotas'
          ]
        }
      },
      relationships: {
        'gastos -> categorias_gasto': 'categoria_gasto_id',
        'gastos -> importancias_gasto': 'importancia_gasto_id',
        'gastos -> tipos_pago': 'tipo_pago_id',
        'gastos -> tarjetas': 'tarjeta_id',
        'gastos -> frecuencias_gasto': 'frecuencia_gasto_id'
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  async executeApiCall({ method, endpoint, body }) {
    try {
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3030';
      const url = `${baseUrl}${endpoint}`;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              data: data
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error ejecutando API call: ${error.message}`,
          },
        ],
      };
    }
  }

  async start() {
    // Determinar el transport según argumentos de línea de comandos
    const useHttp = process.argv.includes('--http');
    const port = process.env.MCP_PORT || 3031;
    
    if (useHttp) {
      // HTTP Transport para RestAssured
      const app = express();
      app.use(cors());
      app.use(express.json());
      
      // Endpoint para obtener herramientas disponibles
      app.get('/mcp/tools', async (req, res) => {
        try {
          const tools = [
            {
              name: 'get_business_rules',
              description: 'Retorna las reglas de negocio completas del sistema',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_api_endpoints',
              description: 'Retorna lista de endpoints disponibles para testing',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_gastos_api_docs',
              description: 'Retorna documentación detallada de /api/gastos endpoints',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_swagger_docs',
              description: 'Retorna documentación Swagger/OpenAPI',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_test_scenarios',
              description: 'Retorna escenarios de test predefinidos',
              inputSchema: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: ['gastos_unicos', 'compras', 'recurrentes', 'tarjetas', 'job', 'all']
                  }
                }
              }
            },
            {
              name: 'execute_api_call',
              description: 'Ejecuta llamada a la API para testing',
              inputSchema: {
                type: 'object',
                properties: {
                  method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
                  endpoint: { type: 'string' },
                  body: { type: 'object' }
                },
                required: ['method', 'endpoint']
              }
            }
          ];
          res.json({ tools });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Endpoint para ejecutar herramientas
      app.post('/mcp/tools/:toolName', async (req, res) => {
        try {
          const { toolName } = req.params;
          const args = req.body || {};
          
          let result;
          switch (toolName) {
            case 'get_business_rules':
              result = await this.getBusinessRules();
              break;
            case 'get_api_endpoints':
              result = await this.getApiEndpoints();
              break;
            case 'get_gastos_api_docs':
              result = await this.getGastosApiDocs();
              break;
            case 'get_swagger_docs':
              result = await this.getSwaggerDocs();
              break;
            case 'get_test_scenarios':
              result = await this.getTestScenarios(args.category || 'all');
              break;
            case 'execute_api_call':
              result = await this.executeApiCall(args);
              break;
            default:
              throw new Error(`Herramienta desconocida: ${toolName}`);
          }
          
          res.json(result);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      // Endpoint de salud
      app.get('/mcp/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          server: 'finanzas-api-mcp',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        });
      });
      
      // Endpoint para obtener documentación OpenAPI/Swagger
      app.get('/mcp/api-docs', async (req, res) => {
        try {
          const result = await this.getSwaggerDocs();
          res.set('Content-Type', 'application/x-yaml');
          res.send(result.content[0].text);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      app.listen(port, () => {
        console.error(`Finanzas API MCP Server (HTTP) iniciado en puerto ${port}`);
        console.error(`Endpoints disponibles:`);
        console.error(`  GET  http://localhost:${port}/mcp/health`);
        console.error(`  GET  http://localhost:${port}/mcp/tools`);
        console.error(`  POST http://localhost:${port}/mcp/tools/{toolName}`);
        console.error(`  GET  http://localhost:${port}/mcp/api-docs`);
      });
    } else {
      // Stdio Transport (comportamiento original)
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Finanzas API MCP Server (stdio) iniciado');
    }
  }
}

// Iniciar el servidor MCP
const server = new FinanzasApiMCPServer();
server.start().catch(console.error);