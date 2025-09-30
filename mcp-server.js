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
                  description: 'Categoría de tests: gastos_unicos, compras, recurrentes, tarjetas, job, auth',
                  enum: ['gastos_unicos', 'compras', 'recurrentes', 'tarjetas', 'job', 'auth', 'all']
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
                  description: 'Entidad específica: gasto_unico, compra, gasto_recurrente, debito_automatico, tarjeta',
                  enum: ['gasto_unico', 'compra', 'gasto_recurrente', 'debito_automatico', 'tarjeta']
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
            name: 'get_auth_endpoints',
            description: 'Retorna documentación de endpoints de autenticación JWT',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_auth_schemas',
            description: 'Retorna esquemas Swagger para autenticación y JWT',
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

          case 'get_auth_endpoints':
            return await this.getAuthEndpoints();

          case 'get_auth_schemas':
            return await this.getAuthSchemas();

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
      const rulesPath = path.join(__dirname, 'docs', 'architecture', 'business-rules.md');
      const content = await fs.readFile(rulesPath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `# Business Rules (Strategy Pattern + BaseService Architecture)\n\n` +
                  `> Last Updated: September 2025 - Post Major Migration\n` +
                  `> Architecture: Clean Architecture with Strategy Pattern\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading business rules: ${error.message}\nPath: docs/architecture/business-rules.md`,
          },
        ],
      };
    }
  }

  async getGastosApiDocs() {
    try {
      const docsPath = path.join(__dirname, 'docs', 'api', 'endpoints.md');
      const content = await fs.readFile(docsPath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `# API Endpoints Documentation (Current)\n\n` +
                  `> Strategy Pattern + BaseService Architecture\n` +
                  `> All endpoints verified and functional\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading API documentation: ${error.message}\nPath: docs/api/endpoints.md`,
          },
        ],
      };
    }
  }

  async getSwaggerDocs() {
    try {
      const swaggerPath = path.join(__dirname, 'docs', 'api', 'swagger.yaml');
      const content = await fs.readFile(swaggerPath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `# OpenAPI/Swagger Specification (Current)\n` +
                  `# Architecture: Strategy Pattern + BaseService\n` +
                  `# Last Updated: September 2025\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading Swagger documentation: ${error.message}\nPath: docs/api/swagger.yaml`,
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
          '✅ GET /api/gastos - Obtener gastos con filtros opcionales y paginación inteligente',
          '✅ GET /api/gastos/summary - Resumen de gastos por período',
          '✅ GET /api/gastos/generate - Ejecutar job de generación automática de gastos',
          '✅ GET /api/gastos/:id - Obtener gasto por ID',
          '✅ POST /api/gastos - Crear nuevo gasto',
          '✅ PUT /api/gastos/:id - Actualizar gasto',
          '✅ DELETE /api/gastos/:id - Eliminar gasto'
        ],
        architecture: 'Strategy Pattern + BaseService',
        generation_types: [
          '🔄 Immediate: Gastos únicos (createWithGastoReal)',
          '🔄 Recurring: Gastos recurrentes con frecuencia',
          '🔄 AutomaticDebit: Débitos automáticos con fecha_fin',
          '🔄 Installment: Compras con cuotas (billing cycle aware)'
        ]
      },
      gastos_unicos: {
        base: '/api/gastos-unicos',
        endpoints: [
          '✅ GET /api/gastos-unicos - Obtener gastos únicos con filtros opcionales y paginación inteligente',
          '✅ GET /api/gastos-unicos/:id - Obtener gasto único por ID',
          '✅ POST /api/gastos-unicos - Crear nuevo gasto único',
          '✅ PUT /api/gastos-unicos/:id - Actualizar gasto único',
          '✅ DELETE /api/gastos-unicos/:id - Eliminar gasto único'
        ]
      },
      compras: {
        base: '/api/compras',
        endpoints: [
          '✅ GET /api/compras - Obtener compras con filtros opcionales y paginación inteligente',
          '✅ GET /api/compras/:id - Obtener compra por ID',
          '✅ POST /api/compras - Crear nueva compra',
          '✅ PUT /api/compras/:id - Actualizar compra',
          '✅ DELETE /api/compras/:id - Eliminar compra'
        ]
      },
      gastos_recurrentes: {
        base: '/api/gastos-recurrentes',
        endpoints: [
          '✅ GET /api/gastos-recurrentes - Obtener gastos recurrentes con filtros opcionales y paginación inteligente',
          '✅ GET /api/gastos-recurrentes/:id - Obtener por ID',
          '✅ POST /api/gastos-recurrentes - Crear gasto recurrente',
          '✅ PUT /api/gastos-recurrentes/:id - Actualizar',
          '✅ DELETE /api/gastos-recurrentes/:id - Eliminar'
        ]
      },
      debitos_automaticos: {
        base: '/api/debitos-automaticos',
        endpoints: [
          '✅ GET /api/debitos-automaticos - Obtener débitos automáticos con filtros opcionales y paginación inteligente',
          '✅ GET /api/debitos-automaticos/:id - Obtener por ID',
          '✅ POST /api/debitos-automaticos - Crear débito automático',
          '✅ PUT /api/debitos-automaticos/:id - Actualizar',
          '✅ DELETE /api/debitos-automaticos/:id - Eliminar'
        ]
      },
      tarjetas: {
        base: '/api/tarjetas',
        endpoints: [
          '✅ GET /api/tarjetas - Obtener tarjetas con filtros opcionales y paginación inteligente',
          '✅ GET /api/tarjetas/stats - Obtener estadísticas de tarjetas del usuario',
          '✅ GET /api/tarjetas/:id - Obtener tarjeta por ID',
          '✅ GET /api/tarjetas/:id/usage - Validar uso de tarjeta en gastos/compras',
          '✅ POST /api/tarjetas - Crear nueva tarjeta',
          '✅ PUT /api/tarjetas/:id - Actualizar tarjeta',
          '✅ DELETE /api/tarjetas/:id - Eliminar tarjeta (solo si no está en uso)'
        ],
        business_logic: [
          '🔧 Validación automática por tipo: crédito requiere fechas, débito no',
          '🔧 Normalización automática de datos según tipo de tarjeta',
          '🔧 Validación de uso antes de eliminar (gastos/compras asociados)',
          '🔧 Estadísticas por usuario: total, crédito, débito, virtual',
          '🔧 Filtros: tipo, banco, permite_cuotas con paginación inteligente'
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
          name: 'Tarjeta Crédito Válida',
          description: 'Crear tarjeta de crédito con todas las validaciones',
          endpoint: 'POST /api/tarjetas',
          payload: {
            nombre: 'Visa Crédito Test',
            tipo: 'credito',
            banco: 'Banco Nación',
            dia_mes_cierre: 15,
            dia_mes_vencimiento: 10
          },
          expected: {
            status: 201,
            response_structure: {
              success: true,
              data: {
                id: 'number',
                nombre: 'Visa Crédito Test',
                tipo: 'credito',
                banco: 'Banco Nación',
                dia_mes_cierre: 15,
                dia_mes_vencimiento: 10,
                permite_cuotas: true
              }
            }
          }
        },
        {
          name: 'Tarjeta Débito Válida',
          description: 'Crear tarjeta de débito sin fechas',
          endpoint: 'POST /api/tarjetas',
          payload: {
            nombre: 'Mastercard Débito Test',
            tipo: 'debito',
            banco: 'Banco Santander'
          },
          expected: {
            status: 201,
            response_structure: {
              success: true,
              data: {
                id: 'number',
                nombre: 'Mastercard Débito Test',
                tipo: 'debito',
                banco: 'Banco Santander',
                dia_mes_cierre: null,
                dia_mes_vencimiento: null,
                permite_cuotas: false
              }
            }
          }
        },
        {
          name: 'Tarjeta Crédito Sin Fechas - Error',
          description: 'Tarjeta de crédito debe tener dias de cierre y vencimiento',
          endpoint: 'POST /api/tarjetas',
          payload: {
            nombre: 'Test Crédito Inválido',
            tipo: 'credito',
            banco: 'Test Bank'
          },
          expected: {
            status: 400,
            response_structure: {
              success: false,
              message: 'Datos de tarjeta inválidos',
              errors: [
                'Las tarjetas de crédito requieren día de cierre',
                'Las tarjetas de crédito requieren día de vencimiento'
              ]
            }
          }
        },
        {
          name: 'Tarjeta Débito Con Fechas - Error',
          description: 'Tarjeta de débito no debe tener fechas de cierre/vencimiento',
          endpoint: 'POST /api/tarjetas',
          payload: {
            nombre: 'Test Débito Inválido',
            tipo: 'debito',
            banco: 'Test Bank',
            dia_mes_cierre: 15,
            dia_mes_vencimiento: 10
          },
          expected: {
            status: 400,
            response_structure: {
              success: false,
              message: 'Datos de tarjeta inválidos',
              errors: [
                'Las tarjetas de débito no deben tener días de cierre o vencimiento'
              ]
            }
          }
        },
        {
          name: 'Filtros Tarjetas por Tipo',
          description: 'Filtrar tarjetas por tipo con paginación inteligente',
          endpoint: 'GET /api/tarjetas?tipo=credito',
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: 'array',
              meta: {
                total: 'number',
                type: 'collection'
              }
            }
          }
        },
        {
          name: 'Estadísticas de Tarjetas',
          description: 'Obtener estadísticas de tarjetas del usuario autenticado',
          endpoint: 'GET /api/tarjetas/stats',
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: {
                estadisticas: {
                  total: 'number',
                  credito: 'number',
                  debito: 'number',
                  virtual: 'number'
                },
                usuario_id: 'number'
              }
            }
          }
        },
        {
          name: 'Validar Uso de Tarjeta',
          description: 'Verificar si tarjeta está en uso antes de eliminar',
          endpoint: 'GET /api/tarjetas/:id/usage',
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: {
                tarjeta: {
                  id: 'number',
                  nombre: 'string',
                  tipo: 'string'
                },
                inUse: 'boolean',
                usage: {
                  gastos: 'number',
                  compras: 'number',
                  total: 'number'
                }
              }
            }
          }
        },
        {
          name: 'Eliminar Tarjeta en Uso - Error',
          description: 'No se debe poder eliminar tarjeta que está siendo utilizada',
          endpoint: 'DELETE /api/tarjetas/:id',
          expected: {
            status: 400,
            response_structure: {
              success: false,
              message: 'No se puede eliminar la tarjeta',
              error: 'La tarjeta está siendo utilizada en X registro(s)'
            }
          }
        },
        {
          name: 'Actualizar Tarjeta Válida',
          description: 'Actualizar datos de tarjeta manteniendo validaciones',
          endpoint: 'PUT /api/tarjetas/:id',
          payload: {
            nombre: 'Visa Actualizada',
            banco: 'Banco Actualizado'
          },
          expected: {
            status: 200,
            response_structure: {
              success: true,
              data: {
                id: 'number',
                nombre: 'Visa Actualizada',
                banco: 'Banco Actualizado'
              }
            }
          }
        }
      ],
      auth: [
        {
          name: 'Registro Usuario Válido',
          description: 'Registrar usuario con datos válidos',
          endpoint: 'POST /api/auth/register',
          payload: {
            nombre: 'Test User',
            email: 'test@example.com',
            password: 'Password123'
          },
          expected: {
            status: 201,
            response_structure: {
              success: true,
              message: 'Usuario registrado exitosamente',
              data: { user: { id: 'number', nombre: 'string', email: 'string' } }
            },
            excludes: ['password']
          }
        },
        {
          name: 'Login Usuario Válido',
          description: 'Login con credenciales correctas devuelve token JWT',
          endpoint: 'POST /api/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'Password123'
          },
          expected: {
            status: 200,
            response_structure: {
              success: true,
              message: 'Login exitoso',
              data: {
                token: 'string (JWT format)',
                user: { id: 'number', nombre: 'string', email: 'string' }
              }
            },
            token_validation: 'JWT should be valid and decodable'
          }
        },
        {
          name: 'Registro Password Débil',
          description: 'Password que no cumple política de seguridad debe fallar',
          endpoint: 'POST /api/auth/register',
          payload: {
            nombre: 'Test User',
            email: 'weak@example.com',
            password: 'weak'
          },
          expected: {
            status: 400,
            response_structure: {
              success: false,
              message: 'Datos de registro inválidos',
              errors: 'array containing password requirements'
            }
          }
        },
        {
          name: 'Login Credenciales Incorrectas',
          description: 'Login con password incorrecto debe fallar',
          endpoint: 'POST /api/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'wrongpassword'
          },
          expected: {
            status: 401,
            response_structure: {
              success: false,
              message: 'Email o contraseña incorrectos',
              error: 'INVALID_CREDENTIALS'
            }
          }
        },
        {
          name: 'Perfil Sin Token',
          description: 'Acceso a perfil sin token debe fallar',
          endpoint: 'GET /api/auth/profile',
          headers: {},
          expected: {
            status: 401,
            response_structure: {
              success: false,
              message: 'Token de acceso requerido',
              error: 'MISSING_TOKEN'
            }
          }
        },
        {
          name: 'Perfil Con Token Válido',
          description: 'Acceso a perfil con token válido debe retornar user data',
          endpoint: 'GET /api/auth/profile',
          headers: {
            'Authorization': 'Bearer <JWT_TOKEN_FROM_LOGIN>'
          },
          expected: {
            status: 200,
            response_structure: {
              success: true,
              message: 'Perfil obtenido exitosamente',
              data: { user: { id: 'number', nombre: 'string', email: 'string' } }
            }
          },
          note: 'Token debe obtenerse desde login exitoso previo'
        },
        {
          name: 'Cambio Password Válido',
          description: 'Cambio de contraseña con datos válidos',
          endpoint: 'POST /api/auth/change-password',
          headers: {
            'Authorization': 'Bearer <JWT_TOKEN_FROM_LOGIN>'
          },
          payload: {
            currentPassword: 'Password123',
            newPassword: 'NewPassword456'
          },
          expected: {
            status: 200,
            response_structure: {
              success: true,
              message: 'Contraseña actualizada exitosamente'
            }
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
        case 'tarjeta':
          // Tarjetas usan validation.middleware.js que contiene todos los esquemas de validación
          const validationPath = path.join(__dirname, 'src/middlewares/validation.middleware.js');
          const validationContent = await fs.readFile(validationPath, 'utf-8');
          return {
            content: [
              {
                type: 'text',
                text: `# Esquemas de Validación de Tarjetas (Joi)\n` +
                      `# Validación condicional por tipo: crédito requiere fechas, débito no\n` +
                      `# Normalización automática de datos según tipo\n\n` +
                      validationContent.split('// Tarjeta validation')[1]?.split('// Export')[0] || 'Esquemas de tarjeta no encontrados',
              },
            ],
          };
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
          description: 'Tabla principal de gastos reales generados por strategies',
          fields: [
            'id (PK)', 'fecha', 'monto_ars', 'monto_usd', 'descripcion',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'tipo_pago_id (FK)', 'tarjeta_id (FK)', 'frecuencia_gasto_id (FK)',
            'tipo_origen (unico|recurrente|debito_automatico|compra)',
            'id_origen (FK to source table)',
            'cantidad_cuotas_totales', 'cantidad_cuotas_pagadas'
          ]
        },
        gastos_unicos: {
          description: 'Gastos únicos procesados con ImmediateExpenseStrategy',
          fields: [
            'id (PK)', 'descripcion', 'monto', 'fecha',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'procesado (boolean - sync with real gasto)'
          ]
        },
        compras: {
          description: 'Compras procesadas con InstallmentExpenseStrategy',
          fields: [
            'id (PK)', 'descripcion', 'monto_total', 'cantidad_cuotas', 'fecha_compra',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'pendiente_cuotas (boolean)', 'fecha_ultima_cuota_generada'
          ]
        },
        gastos_recurrentes: {
          description: 'Gastos procesados con RecurringExpenseStrategy',
          fields: [
            'id (PK)', 'descripcion', 'monto', 'dia_de_pago', 'mes_de_pago',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'frecuencia_gasto_id (FK)', 'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'activo (boolean)', 'ultima_fecha_generado', 'fecha_inicio'
          ]
        },
        debitos_automaticos: {
          description: 'Débitos procesados con AutomaticDebitExpenseStrategy',
          fields: [
            'id (PK)', 'descripcion', 'monto', 'dia_de_pago', 'mes_de_pago',
            'categoria_gasto_id (FK)', 'importancia_gasto_id (FK)',
            'frecuencia_gasto_id (FK)', 'tipo_pago_id (FK)', 'tarjeta_id (FK)',
            'activo (boolean)', 'ultima_fecha_generado',
            'fecha_inicio', 'fecha_fin (specific to debitos)'
          ]
        },
        tarjetas: {
          description: 'Tarjetas con billing cycle logic for InstallmentStrategy + User isolation',
          fields: [
            'id (PK)', 'nombre', 'tipo (debito|credito|virtual)', 'banco',
            'dia_mes_cierre (billing close - required for credito)',
            'dia_mes_vencimiento (due date - required for credito)',
            'permite_cuotas (auto-normalized by tipo)',
            'usuario_id (FK - user isolation)'
          ],
          business_rules: [
            'CREDITO: requiere dia_mes_cierre + dia_mes_vencimiento, permite_cuotas=true',
            'DEBITO: no debe tener fechas, permite_cuotas=false',
            'VIRTUAL: permite_cuotas configurable, fechas opcionales',
            'User isolation: usuarios solo ven/modifican sus propias tarjetas',
            'Usage validation: no se puede eliminar si está en uso en gastos/compras'
          ]
        }
      },
      relationships: {
        'gastos -> categorias_gasto': 'categoria_gasto_id',
        'gastos -> importancias_gasto': 'importancia_gasto_id',
        'gastos -> tipos_pago': 'tipo_pago_id',
        'gastos -> tarjetas': 'tarjeta_id',
        'gastos -> frecuencias_gasto': 'frecuencia_gasto_id',
        'gastos -> source_tables': 'tipo_origen + id_origen (polymorphic)'
      },
      architecture: {
        pattern: 'Strategy Pattern + BaseService',
        strategies: {
          'ImmediateExpenseStrategy': 'gastos_unicos -> gastos (immediate)',
          'RecurringExpenseStrategy': 'gastos_recurrentes -> gastos (scheduled)',
          'AutomaticDebitExpenseStrategy': 'debitos_automaticos -> gastos (scheduled)',
          'InstallmentExpenseStrategy': 'compras -> gastos (billing cycle aware)'
        },
        services: {
          'BaseService': 'Common CRUD operations (200+ lines saved)',
          'GastoGeneratorService': 'Orchestrates all strategies',
          'Scheduler': 'Node-cron daily execution (5:00 AM Argentina)',
          'Transaction Safety': 'All operations use database transactions'
        },
        authentication: {
          'AuthService': 'JWT-based authentication extending BaseService',
          'AuthMiddleware': 'Token validation and user extraction',
          'PasswordHashing': 'bcrypt with 10 salt rounds',
          'UserModel': 'Usuario table with unique email constraint'
        }
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

  async getAuthEndpoints() {
    const endpoints = {
      authentication: {
        base_url: process.env.API_BASE_URL || 'http://localhost:3030',
        endpoints: {
          'POST /api/auth/register': {
            description: 'Registro de nuevo usuario con validación JWT',
            request_body: {
              nombre: 'string (2-100 chars)',
              email: 'string (email format)',
              password: 'string (min 6 chars, 1 uppercase, 1 lowercase, 1 digit)'
            },
            responses: {
              201: 'Usuario creado exitosamente',
              400: 'Datos inválidos o email ya existe',
              500: 'Error interno del servidor'
            },
            test_scenarios: {
              valid_user: {
                nombre: 'Test User',
                email: 'test@example.com',
                password: 'Password123'
              },
              duplicate_email: 'Should return 400',
              invalid_password: 'Should return 400'
            }
          },
          'POST /api/auth/login': {
            description: 'Autenticación de usuario con JWT',
            request_body: {
              email: 'string (email format)',
              password: 'string'
            },
            responses: {
              200: 'Login exitoso con JWT token',
              401: 'Credenciales inválidas',
              400: 'Datos faltantes o inválidos'
            },
            test_scenarios: {
              valid_credentials: {
                email: 'test@example.com',
                password: 'Password123'
              },
              invalid_credentials: 'Should return 401',
              missing_fields: 'Should return 400'
            }
          },
          'GET /api/auth/profile': {
            description: 'Obtener perfil del usuario autenticado',
            headers: {
              Authorization: 'Bearer <JWT_TOKEN>'
            },
            responses: {
              200: 'Perfil de usuario',
              401: 'Token inválido o faltante',
              404: 'Usuario no encontrado'
            }
          },
          'PUT /api/auth/profile': {
            description: 'Actualizar perfil del usuario autenticado',
            headers: {
              Authorization: 'Bearer <JWT_TOKEN>'
            },
            request_body: {
              nombre: 'string (optional)',
              email: 'string (optional, email format)'
            },
            responses: {
              200: 'Perfil actualizado',
              400: 'Datos inválidos',
              401: 'Token inválido'
            }
          },
          'POST /api/auth/change-password': {
            description: 'Cambiar contraseña del usuario autenticado',
            headers: {
              Authorization: 'Bearer <JWT_TOKEN>'
            },
            request_body: {
              currentPassword: 'string',
              newPassword: 'string (min 6 chars, 1 uppercase, 1 lowercase, 1 digit)'
            },
            responses: {
              200: 'Contraseña cambiada exitosamente',
              400: 'Datos inválidos o contraseña actual incorrecta',
              401: 'Token inválido'
            }
          },
          'POST /api/auth/logout': {
            description: 'Cerrar sesión (invalidar token)',
            headers: {
              Authorization: 'Bearer <JWT_TOKEN>'
            },
            responses: {
              200: 'Logout exitoso',
              401: 'Token inválido'
            }
          }
        },
        middleware: {
          authenticateToken: 'Middleware requerido para rutas protegidas',
          optionalAuth: 'Middleware opcional para autenticación',
          requireRole: 'Middleware para control de roles (extensible)',
          logAuthenticatedRequest: 'Middleware de auditoría'
        },
        jwt_configuration: {
          algorithm: 'HS256',
          default_expiry: '7d',
          secret: 'process.env.JWT_SECRET || default',
          bcrypt_rounds: 10
        }
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

  async getAuthSchemas() {
    try {
      const authSchemasPath = path.join(__dirname, 'docs', 'api', 'auth-schemas.yaml');
      const content = await fs.readFile(authSchemasPath, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `# Authentication Schemas (Swagger/OpenAPI)\n` +
                  `# JWT-based authentication system with bcrypt password hashing\n` +
                  `# Extends BaseService pattern for consistent CRUD operations\n\n` +
                  content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error cargando esquemas de autenticación: ${error.message}`,
          },
        ],
      };
    }
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
                    enum: ['gastos_unicos', 'compras', 'recurrentes', 'debitos_automaticos', 'tarjetas', 'job', 'auth', 'all']
                  }
                }
              }
            },
            {
              name: 'get_auth_endpoints',
              description: 'Retorna documentación de endpoints de autenticación JWT',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_auth_schemas',
              description: 'Retorna esquemas Swagger para autenticación y JWT',
              inputSchema: { type: 'object', properties: {} }
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
            case 'get_auth_endpoints':
              result = await this.getAuthEndpoints();
              break;
            case 'get_auth_schemas':
              result = await this.getAuthSchemas();
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