# CLAUDE.md - Personal Finance Frontend

Este archivo proporciona contexto completo a Claude Code para trabajar en el frontend de la aplicación de finanzas personales.

---

## 📋 Contexto General

Estoy desarrollando el **frontend** de una aplicación de finanzas personales que se conecta a un backend REST API ya implementado.

### Objetivo
- Crear una aplicación web moderna y responsiva usando **Next.js**
- Establecer las bases para una futura aplicación móvil en **React Native**
- Proporcionar una interfaz intuitiva para gestión de gastos, ingresos y reportes financieros

### Backend Disponible
- **Backend**: Node.js + Express + PostgreSQL
- **API Base URL**: `http://localhost:3030/api`
- **Swagger Docs**: `http://localhost:3030/api-docs`
- **MCP Server**: `http://localhost:3031` (Model Context Protocol)
- **Autenticación**: JWT (Bearer Token)
- **Zona Horaria**: Argentina (UTC-3)

---

## 🔮 Model Context Protocol (MCP) Server

El backend expone un **servidor MCP** que proporciona contexto adicional y herramientas útiles para el desarrollo del frontend.

### ¿Qué es el MCP Server?

El MCP (Model Context Protocol) Server es un servicio adicional que expone:
- **Documentación viva** de la API
- **Reglas de negocio** del sistema
- **Esquemas de validación** para cada entidad
- **Escenarios de test** predefinidos
- **Estructura de base de datos** y relaciones
- **Proxy para ejecutar llamadas** a la API principal

### Configuración y Acceso

```bash
# Iniciar el servidor MCP en modo HTTP
npm run mcp:http

# MCP Server disponible en:
# http://localhost:3031
```

### Endpoints MCP Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/mcp/health` | GET | Estado del servidor MCP |
| `/mcp/tools` | GET | Lista de herramientas disponibles |
| `/mcp/tools/{toolName}` | POST | Ejecutar herramienta específica |
| `/mcp/api-docs` | GET | Documentación Swagger/OpenAPI completa |

### Herramientas MCP

#### 1. **get_business_rules**
Retorna todas las reglas de negocio del sistema.

```bash
POST http://localhost:3031/mcp/tools/get_business_rules
```

**Uso desde el frontend:**
- Entender lógica de negocio compleja (ej: cálculo de cuotas)
- Validaciones del lado del cliente consistentes con el backend
- Documentación de comportamientos esperados

#### 2. **get_api_endpoints**
Lista completa de endpoints con descripción y arquitectura.

```bash
POST http://localhost:3031/mcp/tools/get_api_endpoints
```

**Uso desde el frontend:**
- Generar automáticamente tipos TypeScript
- Validar que todos los endpoints estén implementados
- Documentación actualizada de la API

#### 3. **get_gastos_api_docs**
Documentación detallada de endpoints de gastos con casos de uso.

```bash
POST http://localhost:3031/mcp/tools/get_gastos_api_docs
```

**Uso desde el frontend:**
- Entender filtros disponibles para cada endpoint
- Ejemplos de payloads válidos
- Casos de uso y escenarios comunes

#### 4. **get_swagger_docs**
Especificación OpenAPI/Swagger completa.

```bash
GET http://localhost:3031/mcp/api-docs
```

**Uso desde el frontend:**
- Generar cliente API automáticamente (con openapi-generator)
- Validar contratos de API
- Documentación interactiva

#### 5. **get_test_scenarios**
Escenarios de test predefinidos por categoría.

```bash
POST http://localhost:3031/mcp/tools/get_test_scenarios
Content-Type: application/json

{
  "category": "compras"  // Opciones: gastos_unicos, compras, recurrentes, tarjetas, job, auth, all
}
```

**Categorías disponibles:**
- `gastos_unicos` - Escenarios para gastos únicos
- `compras` - Escenarios para compras en cuotas
- `recurrentes` - Escenarios para gastos recurrentes
- `tarjetas` - Escenarios para gestión de tarjetas
- `job` - Escenarios para job de generación
- `auth` - Escenarios de autenticación
- `all` - Todos los escenarios

**Uso desde el frontend:**
- Tests E2E automatizados
- Validación de flujos completos
- Ejemplos de payloads correctos

#### 6. **get_validation_schemas**
Esquemas de validación Joi para cada entidad.

```bash
POST http://localhost:3031/mcp/tools/get_validation_schemas
Content-Type: application/json

{
  "entity": "gasto_unico"  // Opciones: gasto_unico, compra, gasto_recurrente, debito_automatico, tarjeta
}
```

**Uso desde el frontend:**
- Convertir validaciones Joi a Zod
- Mantener validaciones consistentes
- Entender reglas de validación del backend

#### 7. **get_database_schema**
Estructura de base de datos y relaciones entre entidades.

```bash
POST http://localhost:3031/mcp/tools/get_database_schema
```

**Uso desde el frontend:**
- Entender modelo de datos completo
- Visualizar relaciones entre entidades
- Diseñar interfaces de usuario coherentes

#### 8. **get_auth_endpoints**
Documentación completa de endpoints de autenticación.

```bash
POST http://localhost:3031/mcp/tools/get_auth_endpoints
```

**Uso desde el frontend:**
- Implementar flujo de autenticación completo
- Manejo de JWT tokens
- Gestión de sesiones y refresh tokens

#### 9. **execute_api_call**
Proxy para ejecutar llamadas a la API principal (útil para testing).

```bash
POST http://localhost:3031/mcp/tools/execute_api_call
Content-Type: application/json

{
  "method": "GET",
  "endpoint": "/api/gastos/all"
}
```

### Ejemplo de Uso en el Frontend

```typescript
// src/lib/mcp/client.ts
import axios from 'axios'

const MCP_BASE_URL = 'http://localhost:3031'

export const mcpClient = axios.create({
  baseURL: MCP_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Obtener reglas de negocio
export async function getBusinessRules() {
  const { data } = await mcpClient.post('/mcp/tools/get_business_rules')
  return data.content[0].text
}

// Obtener escenarios de test
export async function getTestScenarios(category: string) {
  const { data } = await mcpClient.post('/mcp/tools/get_test_scenarios', {
    category,
  })
  return JSON.parse(data.content[0].text)
}

// Obtener endpoints disponibles
export async function getApiEndpoints() {
  const { data } = await mcpClient.post('/mcp/tools/get_api_endpoints')
  return JSON.parse(data.content[0].text)
}
```

### Hook de Desarrollo para MCP

```typescript
// src/hooks/useMCPDocs.ts
import { useQuery } from '@tanstack/react-query'
import { mcpClient } from '@/lib/mcp/client'

export function useMCPBusinessRules() {
  return useQuery({
    queryKey: ['mcp', 'business-rules'],
    queryFn: async () => {
      const { data } = await mcpClient.post('/mcp/tools/get_business_rules')
      return data.content[0].text
    },
    staleTime: Infinity, // Las reglas de negocio no cambian frecuentemente
  })
}

export function useMCPTestScenarios(category: string) {
  return useQuery({
    queryKey: ['mcp', 'test-scenarios', category],
    queryFn: async () => {
      const { data } = await mcpClient.post('/mcp/tools/get_test_scenarios', {
        category,
      })
      return JSON.parse(data.content[0].text)
    },
    staleTime: Infinity,
  })
}
```

### Beneficios para el Desarrollo Frontend

1. **Documentación Siempre Actualizada**
   - No hay documentación desactualizada
   - Los tipos y validaciones están sincronizados con el backend

2. **Testing Mejorado**
   - Escenarios de test predefinidos y validados
   - Datos de ejemplo correctos

3. **Desarrollo Más Rápido**
   - Acceso rápido a ejemplos de payloads
   - Validaciones del cliente consistentes

4. **Debugging Facilitado**
   - Entender reglas de negocio complejas
   - Verificar contratos de API

5. **Consistencia**
   - Un solo punto de verdad para documentación
   - Sincronización automática entre frontend y backend

### Comandos Útiles

```bash
# Verificar estado del MCP
curl http://localhost:3031/mcp/health

# Ver herramientas disponibles
curl http://localhost:3031/mcp/tools

# Obtener documentación Swagger
curl http://localhost:3031/mcp/api-docs

# Ejemplo: Obtener endpoints
curl -X POST http://localhost:3031/mcp/tools/get_api_endpoints \
  -H "Content-Type: application/json"
```

---

## 🛠 Stack Tecnológico

### Framework y Lenguaje
- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript 5+
- **Runtime**: Node.js 18+

### Estilos y UI
- **CSS Framework**: TailwindCSS 3+
- **Componentes UI**: shadcn/ui (recomendado) o Chakra UI
- **Iconos**: lucide-react o react-icons
- **Fuentes**: next/font con Inter o similar

### Librerías Principales
- **Gestión de Estado**: React Query (TanStack Query) para server state
- **Formularios**: react-hook-form + Zod para validación
- **Gráficos**: Recharts o Chart.js
- **HTTP Client**: Axios
- **Fechas**: date-fns (compatible con timezone Argentina)
- **Tablas**: TanStack Table (opcional para listados complejos)

### Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright (opcional)

---

## 🔌 Backend API - Documentación Completa

### Base URL y Headers

```typescript
// Base URL
const API_BASE_URL = 'http://localhost:3030/api'

// Headers para requests autenticados
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

### Endpoints de Autenticación

| Método | Endpoint | Descripción | Auth Requerida |
|--------|----------|-------------|----------------|
| POST | `/auth/register` | Registrar nuevo usuario | ❌ |
| POST | `/auth/login` | Iniciar sesión (retorna JWT) | ❌ |
| GET | `/auth/profile` | Obtener perfil del usuario | ✅ |
| PUT | `/auth/profile` | Actualizar perfil | ✅ |
| POST | `/auth/change-password` | Cambiar contraseña | ✅ |
| POST | `/auth/logout` | Cerrar sesión | ✅ |

**Ejemplo Login Request:**
```typescript
POST /auth/login
{
  "email": "usuario@example.com",
  "password": "Password123"
}

// Response:
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "usuario@example.com"
    }
  }
}
```

### Endpoints de Gastos (Expense Management)

#### Gastos Principales
| Método | Endpoint | Descripción | Paginación |
|--------|----------|-------------|------------|
| GET | `/gastos` | Obtener gastos con filtros | ✅ |
| GET | `/gastos/all` | Todos los gastos sin filtros | ❌ |
| GET | `/gastos/:id` | Obtener gasto por ID | ❌ |
| POST | `/gastos` | Crear nuevo gasto | ❌ |
| PUT | `/gastos/:id` | Actualizar gasto | ❌ |
| DELETE | `/gastos/:id` | Eliminar gasto | ❌ |
| POST | `/gastos/search` | Búsqueda avanzada | ✅ |
| GET | `/gastos/summary` | Resumen estadístico | ❌ |
| GET | `/gastos/generate` | Generar gastos pendientes | ❌ |

**Filtros disponibles para GET /gastos:**
- `categoria_gasto_id`, `importancia_gasto_id`, `tipo_pago_id`, `tarjeta_id`
- `fecha_desde`, `fecha_hasta`
- `monto_min_ars`, `monto_max_ars`, `monto_min_usd`, `monto_max_usd`
- `tipo_origen` (unico, recurrente, debito_automatico, compra)
- `id_origen`
- `limit`, `offset`, `orderBy`, `orderDirection`

#### Gastos Únicos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/gastos-unicos` | Listar gastos únicos |
| GET | `/gastos-unicos/:id` | Obtener por ID |
| POST | `/gastos-unicos` | Crear gasto único |
| PUT | `/gastos-unicos/:id` | Actualizar |
| DELETE | `/gastos-unicos/:id` | Eliminar |

#### Compras (en cuotas)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/compras` | Listar compras |
| GET | `/compras/:id` | Obtener por ID |
| POST | `/compras` | Crear compra en cuotas |
| PUT | `/compras/:id` | Actualizar |
| DELETE | `/compras/:id` | Eliminar |

#### Gastos Recurrentes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/gastos-recurrentes` | Listar gastos recurrentes |
| GET | `/gastos-recurrentes/:id` | Obtener por ID |
| POST | `/gastos-recurrentes` | Crear gasto recurrente |
| PUT | `/gastos-recurrentes/:id` | Actualizar |
| DELETE | `/gastos-recurrentes/:id` | Eliminar |

#### Débitos Automáticos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/debitos-automaticos` | Listar débitos automáticos |
| GET | `/debitos-automaticos/:id` | Obtener por ID |
| POST | `/debitos-automaticos` | Crear débito |
| PUT | `/debitos-automaticos/:id` | Actualizar |
| DELETE | `/debitos-automaticos/:id` | Eliminar |

### Endpoints de Tarjetas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/tarjetas` | Listar tarjetas del usuario |
| GET | `/tarjetas/stats` | Estadísticas de tarjetas |
| GET | `/tarjetas/:id` | Obtener tarjeta por ID |
| GET | `/tarjetas/:id/usage` | Verificar uso de tarjeta |
| POST | `/tarjetas` | Crear nueva tarjeta |
| PUT | `/tarjetas/:id` | Actualizar tarjeta |
| DELETE | `/tarjetas/:id` | Eliminar tarjeta |

---

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

```typescript
// 1. Login
const response = await axios.post('/auth/login', { email, password })
const { token, user } = response.data.data

// 2. Guardar token
localStorage.setItem('token', token)
localStorage.setItem('user', JSON.stringify(user))

// 3. Configurar Axios interceptor
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

// 4. Verificar token en cada navegación
// Si token inválido o expirado → redirect a /login
```

### Protección de Rutas (Next.js Middleware)

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  // Rutas públicas
  if (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register')) {
    return NextResponse.next()
  }

  // Rutas protegidas
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Gestión de Token

**Opción recomendada: httpOnly cookies (más seguro)**
```typescript
// En el servidor (API route)
cookies().set('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 7 días
})
```

---

## 📦 Modelos de Datos (TypeScript)

### Interfaces Principales

```typescript
// src/types/models.ts

export interface User {
  id: number
  nombre: string
  email: string
  createdAt?: string
  updatedAt?: string
}

export interface Gasto {
  id: number
  fecha: string // ISO date
  monto_ars: string
  monto_usd: string | null
  descripcion: string
  categoria_gasto_id: number
  importancia_gasto_id: number
  frecuencia_gasto_id: number | null
  cantidad_cuotas_totales: number | null
  cantidad_cuotas_pagadas: number | null
  tipo_pago_id: number
  tarjeta_id: number | null
  usuario_id: number
  tipo_origen: 'unico' | 'recurrente' | 'debito_automatico' | 'compra'
  id_origen: number
  createdAt: string
  updatedAt: string
  // Relaciones
  categoria?: Categoria
  importancia?: Importancia
  tipoPago?: TipoPago
  tarjeta?: Tarjeta
  frecuencia?: Frecuencia
}

export interface GastoUnico {
  id: number
  descripcion: string
  monto: number
  fecha: string
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id: number | null
  procesado: boolean
  createdAt: string
  updatedAt: string
  // Relaciones
  categoria?: Categoria
  importancia?: Importancia
  tipoPago?: TipoPago
  tarjeta?: Tarjeta
}

export interface Compra {
  id: number
  descripcion: string
  monto_total: number
  fecha_compra: string
  cantidad_cuotas: number
  pendiente_cuotas: boolean
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id: number | null
  createdAt: string
  updatedAt: string
  // Relaciones
  categoria?: Categoria
  importancia?: Importancia
  tipoPago?: TipoPago
  tarjeta?: Tarjeta
}

export interface GastoRecurrente {
  id: number
  descripcion: string
  monto: number
  dia_de_pago: number
  mes_de_pago: number | null
  activo: boolean
  ultima_fecha_generado: string | null
  fecha_inicio: string | null
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id: number | null
  frecuencia_gasto_id: number
  createdAt: string
  updatedAt: string
  // Relaciones
  categoria?: Categoria
  importancia?: Importancia
  tipoPago?: TipoPago
  tarjeta?: Tarjeta
  frecuencia?: Frecuencia
}

export interface DebitoAutomatico {
  id: number
  descripcion: string
  monto: number
  dia_de_pago: number
  activo: boolean
  ultima_fecha_generado: string | null
  categoria_gasto_id: number
  importancia_gasto_id: number
  tipo_pago_id: number
  tarjeta_id: number | null
  frecuencia_gasto_id: number
  createdAt: string
  updatedAt: string
  // Relaciones
  categoria?: Categoria
  importancia?: Importancia
  tipoPago?: TipoPago
  tarjeta?: Tarjeta
  frecuencia?: Frecuencia
}

export interface Tarjeta {
  id: number
  nombre: string
  tipo: 'debito' | 'credito' | 'virtual'
  banco: string
  dia_mes_cierre: number | null
  dia_mes_vencimiento: number | null
  permite_cuotas: boolean
  usuario_id: number
  createdAt?: string
  updatedAt?: string
}

export interface Categoria {
  id: number
  nombre_categoria: string
}

export interface Importancia {
  id: number
  nombre_importancia: string
}

export interface TipoPago {
  id: number
  nombre: string
  permite_cuotas: boolean
}

export interface Frecuencia {
  id: number
  nombre: string
}
```

### Response Types

```typescript
// src/types/api.ts

export interface StandardResponse<T> {
  success: boolean
  data: T
  meta?: {
    total: number
    type: 'single' | 'collection'
    pagination?: Pagination
  }
}

export interface Pagination {
  limit: number
  offset: number
  hasNext: boolean
  hasPrev: boolean
}

export interface StandardError {
  success: false
  error: string
  details?: any
  timestamp: string
}

export interface ValidationError {
  success: false
  error: string
  details: Array<{
    field: string
    message: string
    value?: any
  }>
  timestamp: string
}

export interface GastosSummary {
  periodo: {
    desde: string
    hasta: string
  }
  total_ars: number
  total_usd: number
  cantidad_gastos: number
  por_categoria: Record<string, {
    total_ars: number
    total_usd: number
    cantidad: number
  }>
  por_importancia: Record<string, {
    total_ars: number
    total_usd: number
    cantidad: number
  }>
  por_tipo_pago: Record<string, {
    total_ars: number
    total_usd: number
    cantidad: number
  }>
}
```

---

## 📁 Estructura de Carpetas Recomendada

```
frontend/
├── public/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # Grupo de rutas protegidas
│   │   │   ├── layout.tsx            # Layout con Sidebar
│   │   │   ├── page.tsx              # Dashboard principal
│   │   │   ├── gastos/
│   │   │   │   ├── page.tsx          # Lista de gastos
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Detalle de gasto
│   │   │   │   └── nuevo/
│   │   │   │       └── page.tsx      # Crear gasto
│   │   │   ├── gastos-unicos/
│   │   │   │   └── page.tsx
│   │   │   ├── compras/
│   │   │   │   └── page.tsx
│   │   │   ├── gastos-recurrentes/
│   │   │   │   └── page.tsx
│   │   │   ├── debitos-automaticos/
│   │   │   │   └── page.tsx
│   │   │   ├── tarjetas/
│   │   │   │   └── page.tsx
│   │   │   ├── reportes/
│   │   │   │   └── page.tsx
│   │   │   └── perfil/
│   │   │       └── page.tsx
│   │   ├── api/                      # API Routes (opcional)
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── forms/
│   │   │   ├── GastoForm.tsx
│   │   │   ├── CompraForm.tsx
│   │   │   ├── TarjetaForm.tsx
│   │   │   └── LoginForm.tsx
│   │   ├── charts/
│   │   │   ├── ExpensesPieChart.tsx
│   │   │   ├── MonthlyBarChart.tsx
│   │   │   └── TrendLineChart.tsx
│   │   ├── tables/
│   │   │   ├── GastosTable.tsx
│   │   │   ├── ComprasTable.tsx
│   │   │   └── TarjetasTable.tsx
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorMessage.tsx
│   │       ├── Pagination.tsx
│   │       └── DateRangePicker.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance configurado
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── gastos.ts
│   │   │   │   ├── compras.ts
│   │   │   │   ├── tarjetas.ts
│   │   │   │   └── reportes.ts
│   │   │   └── queryClient.ts        # React Query config
│   │   ├── auth/
│   │   │   ├── authContext.tsx
│   │   │   ├── authProvider.tsx
│   │   │   └── authUtils.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts         # Formateo de montos, fechas
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGastos.ts
│   │   ├── useCompras.ts
│   │   ├── useTarjetas.ts
│   │   ├── useReportes.ts
│   │   └── usePagination.ts
│   ├── types/
│   │   ├── models.ts
│   │   ├── api.ts
│   │   └── forms.ts
│   ├── constants/
│   │   ├── api.ts
│   │   └── routes.ts
│   └── styles/
│       └── globals.css
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔧 Configuración del Cliente API

### Axios Client Setup

```typescript
// src/lib/api/client.ts
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejo de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### React Query Setup

```typescript
// src/lib/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### Ejemplo de Hook Personalizado

```typescript
// src/hooks/useGastos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Gasto, StandardResponse } from '@/types'

export function useGastos(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['gastos', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<StandardResponse<Gasto[]>>('/gastos', {
        params: filters,
      })
      return data
    },
  })
}

export function useCreateGasto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (gasto: Partial<Gasto>) => {
      const { data } = await apiClient.post<StandardResponse<Gasto>>('/gastos', gasto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] })
    },
  })
}
```

---

## 🎨 Requerimientos del MVP

### 1. Pantalla de Login / Registro
**Endpoints:**
- POST `/auth/login`
- POST `/auth/register`

**Componentes:**
- `LoginForm.tsx` - Formulario de login con validación
- `RegisterForm.tsx` - Formulario de registro
- Gestión de token JWT en localStorage o cookies
- Redirección automática al dashboard tras login exitoso

### 2. Dashboard Principal
**Endpoints:**
- GET `/gastos/summary?fecha_desde={inicio_mes}&fecha_hasta={fin_mes}`
- GET `/gastos?limit=10&orderBy=fecha&orderDirection=DESC`

**Componentes:**
- Cards con totales: gastos totales ARS/USD, cantidad de gastos
- Gráfico de torta: gastos por categoría (Recharts PieChart)
- Gráfico de barras: gastos mensuales (Recharts BarChart)
- Lista de últimos gastos

### 3. Gestión de Gastos
**Endpoints:**
- GET `/gastos?limit=20&offset={page*20}`
- GET `/gastos/:id`
- POST `/gastos-unicos`
- PUT `/gastos-unicos/:id`
- DELETE `/gastos-unicos/:id`

**Componentes:**
- `GastosTable.tsx` - Tabla con paginación
- `GastoFilters.tsx` - Filtros por categoría, fecha, monto
- `GastoForm.tsx` - Formulario crear/editar
- `GastoDetailModal.tsx` - Modal de detalles

### 4. Gestión de Compras en Cuotas
**Endpoints:**
- GET `/compras`
- POST `/compras`
- PUT `/compras/:id`
- DELETE `/compras/:id`

**Componentes:**
- `ComprasTable.tsx` - Lista de compras con cuotas pendientes
- `CompraForm.tsx` - Formulario con cálculo automático de cuotas
- Indicador visual de cuotas pagadas vs pendientes

### 5. Gestión de Tarjetas
**Endpoints:**
- GET `/tarjetas`
- POST `/tarjetas`
- PUT `/tarjetas/:id`
- DELETE `/tarjetas/:id`
- GET `/tarjetas/:id/usage`

**Componentes:**
- `TarjetasGrid.tsx` - Grid de tarjetas con diseño de cards
- `TarjetaForm.tsx` - Formulario crear/editar
- Diferenciación visual por tipo (débito/crédito/virtual)
- Validación de uso antes de eliminar

### 6. Reportes
**Endpoints:**
- GET `/gastos/summary?fecha_desde={desde}&fecha_hasta={hasta}`

**Componentes:**
- `DateRangePicker.tsx` - Selector de rango de fechas
- `ExpensesByCategoryChart.tsx` - Gráfico por categoría
- `ExpensesByImportanceChart.tsx` - Gráfico por importancia
- `ExportToCSV.tsx` - Botón de exportación (opcional)

### 7. Navegación y Layout
**Componentes:**
- `Header.tsx` - Logo, usuario, logout
- `Sidebar.tsx` - Menú de navegación
- `MobileNav.tsx` - Menú móvil responsive
- Breadcrumbs para navegación

---

## 🎯 Mejores Prácticas

### Validación de Formularios

```typescript
// src/lib/validations/gastoSchema.ts
import { z } from 'zod'

export const gastoUnicoSchema = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres').max(255),
  monto: z.number().positive('Debe ser mayor a 0'),
  fecha: z.string().refine((date) => new Date(date) <= new Date(), {
    message: 'La fecha no puede ser futura',
  }),
  categoria_gasto_id: z.number().positive(),
  importancia_gasto_id: z.number().positive(),
  tipo_pago_id: z.number().positive(),
  tarjeta_id: z.number().optional(),
})

export type GastoUnicoFormData = z.infer<typeof gastoUnicoSchema>
```

### Formateo de Fechas y Montos

```typescript
// src/lib/utils/formatters.ts
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount: number | string, currency: 'ARS' | 'USD' = 'ARS'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount)
}

export function formatDate(dateString: string, formatStr: string = 'dd/MM/yyyy'): string {
  return format(parseISO(dateString), formatStr, { locale: es })
}

export function formatDateForInput(dateString: string): string {
  return format(parseISO(dateString), 'yyyy-MM-dd')
}
```

### Manejo de Errores

```typescript
// src/lib/utils/errorHandler.ts
import { AxiosError } from 'axios'
import type { StandardError, ValidationError } from '@/types'

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as StandardError | ValidationError

    if (apiError && 'details' in apiError && Array.isArray(apiError.details)) {
      // Errores de validación
      return apiError.details.map(d => d.message).join(', ')
    }

    return apiError?.error || 'Error al procesar la solicitud'
  }

  return 'Error inesperado'
}
```

### Loading States y Optimistic Updates

```typescript
// Ejemplo de uso con React Query
function useDeleteGasto(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.delete(`/gastos/${id}`),
    onMutate: async () => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ['gastos'] })

      // Guardar snapshot anterior
      const previousGastos = queryClient.getQueryData(['gastos'])

      // Optimistic update
      queryClient.setQueryData(['gastos'], (old: any) => {
        return {
          ...old,
          data: old.data.filter((g: Gasto) => g.id !== id),
        }
      })

      return { previousGastos }
    },
    onError: (err, variables, context) => {
      // Rollback en caso de error
      if (context?.previousGastos) {
        queryClient.setQueryData(['gastos'], context.previousGastos)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] })
    },
  })
}
```

---

## ⚙️ Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3030/api
NEXT_PUBLIC_APP_NAME=Finanzas Personales
NEXT_PUBLIC_DEFAULT_LOCALE=es-AR
```

```bash
# .env.example (para compartir en repo)
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_DEFAULT_LOCALE=es-AR
```

---

## 🧪 Testing

### Testing Setup

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// jest.setup.js
import '@testing-library/jest-dom'
```

### Ejemplo de Test

```typescript
// src/components/forms/GastoForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { GastoForm } from './GastoForm'

describe('GastoForm', () => {
  it('renders all required fields', () => {
    render(<GastoForm />)

    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument()
  })

  it('shows validation errors on invalid submit', async () => {
    render(<GastoForm />)

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByText(/mínimo 3 caracteres/i)).toBeInTheDocument()
  })
})
```

---

## 🚀 Scripts de Desarrollo

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 📝 Notas Importantes

1. **Zona Horaria**: El backend usa timezone de Argentina (UTC-3). Usar `date-fns-tz` si es necesario ajustar.

2. **Paginación**: El backend soporta `limit` y `offset`. Implementar paginación en tablas.

3. **Filtros**: Aprovechar los múltiples filtros disponibles para mejorar UX.

4. **Responsividad**: Priorizar mobile-first design para facilitar migración a React Native.

5. **Tipos de Gasto**: El sistema distingue entre:
   - Gastos únicos (procesados inmediatamente)
   - Compras en cuotas (generan gastos mensuales)
   - Gastos recurrentes (mensuales/anuales)
   - Débitos automáticos (suscripciones)

6. **Tarjetas**: Las tarjetas de crédito requieren `dia_mes_cierre` y `dia_mes_vencimiento`. Las de débito no.

7. **Validación**: Usar Zod para validación del lado del cliente que coincida con las validaciones del backend (Joi).

---

## 🔗 Enlaces Útiles

- **Swagger UI**: http://localhost:3030/api-docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **React Query**: https://tanstack.com/query/latest
- **Recharts**: https://recharts.org
