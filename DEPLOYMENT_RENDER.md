# Deployment en Render - Personal Finance API

Esta guía te muestra cómo desplegar la aplicación en Render.com paso a paso.

## 🎯 Estrategia de Deployment

**Recomendado**: Node.js nativo (NO Docker)

**Razones**:
- ✅ Más barato (menos RAM → tier gratuito viable)
- ✅ Builds 3x más rápidos (2-3 min vs 8-10 min)
- ✅ Mejor integración con Render
- ✅ Logs más claros
- ✅ Debugging más fácil

---

## 📋 PASO A PASO

### PARTE 1: Preparación Local (Una sola vez)

#### 1.1 Generar Secretos Seguros

```bash
# En tu máquina local:
npm run generate-secrets
```

Copia los valores generados. Los necesitarás en el paso 2.3.

Ejemplo de output:
```
JWT_SECRET=e02628355364b645e633bae34d2103423933aebb67d5581c...
SESSION_SECRET=57d79307d5db92f38558411d19baaf93e43a5db6771152d...
```

**⚠️ IMPORTANTE**: Guarda estos valores en un lugar seguro (password manager). Los usarás en Render.

---

### PARTE 2: Configurar Base de Datos en Render

#### 2.1 Crear PostgreSQL Database

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configuración:
   - **Name**: `finanzas-db` (o el nombre que prefieras)
   - **Database**: `finanzas_personal_prod`
   - **User**: `finanzas_user` (se genera automático)
   - **Region**: Elige la más cercana a ti (ej: Ohio, Oregon)
   - **PostgreSQL Version**: 15 o superior
   - **Plan**: Free (para desarrollo) o Starter ($7/mes recomendado para producción)

4. Click **"Create Database"**

5. **Espera 2-3 minutos** hasta que el status sea "Available"

#### 2.2 Obtener Connection String

Una vez creada la BD, en la página de la BD encontrarás:

- **Internal Database URL**: Para conectarte desde servicios dentro de Render
- **External Database URL**: Para conectarte desde tu máquina local

Ejemplo:
```
postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod
```

**Copia el "Internal Database URL"** - Lo usarás en el paso 3.3.

---

### PARTE 3: Configurar Web Service (API)

#### 3.1 Crear Web Service

1. En Render Dashboard → **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona el repo `personal-finance-api-nodeJS`

#### 3.2 Configuración del Servicio

- **Name**: `finanzas-api` (o el nombre que prefieras)
- **Region**: **LA MISMA que elegiste para la BD** (importante para latencia baja)
- **Branch**: `main` (o la que uses para producción)
- **Root Directory**: dejar vacío (raíz del repo)
- **Environment**: **Node**
- **Build Command**:
  ```bash
  npm ci --only=production
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Plan**:
  - **Free** (para testing, se duerme después de 15 min sin uso)
  - **Starter ($7/mes)** - Recomendado para producción (siempre activo)

#### 3.3 Variables de Entorno

Click en **"Advanced"** → **"Add Environment Variable"**

Agrega las siguientes variables:

```bash
# ========================================
# BASE DE DATOS (USAR INTERNAL DATABASE URL)
# ========================================
DATABASE_URL=postgres://finanzas_user:PASSWORD@dpg-xxxxx-oregon.render-internal/finanzas_personal_prod

# O usa estas individuales (si prefieres):
DB_HOST=dpg-xxxxx-oregon.render-internal
DB_PORT=5432
DB_NAME=finanzas_personal_prod
DB_USER=finanzas_user
DB_PASSWORD=<password de la BD>

# ========================================
# SERVIDOR
# ========================================
NODE_ENV=production
PORT=3030

# ========================================
# SEGURIDAD - PEGAR LOS VALORES DEL PASO 1.1
# ========================================
JWT_SECRET=<PEGAR AQUÍ EL GENERADO EN TU MÁQUINA LOCAL>
JWT_EXPIRES_IN=7d
SESSION_SECRET=<PEGAR AQUÍ EL GENERADO EN TU MÁQUINA LOCAL>
BCRYPT_SALT_ROUNDS=10

# ========================================
# CORS - CAMBIAR SEGÚN TU FRONTEND
# ========================================
CORS_ORIGIN=https://tu-frontend.onrender.com
# O si tienes dominio propio:
# CORS_ORIGIN=https://tudominio.com

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# LOGGING
# ========================================
LOG_LEVEL=info

# ========================================
# APLICACIÓN
# ========================================
APP_NAME=Personal Finance API
APP_VERSION=1.0.0
APP_URL=https://finanzas-api.onrender.com

# ========================================
# SCHEDULER
# ========================================
SCHEDULER_ENABLED=true
SCHEDULER_RUN_ON_STARTUP=false

# ========================================
# MCP (OPCIONAL - DESHABILITADO EN RENDER)
# ========================================
MCP_ENABLED=false

# ========================================
# MONITOREO
# ========================================
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
```

**⚠️ IMPORTANTE**:
- Usa el **Internal Database URL** (termina en `.render-internal`)
- NO uses el External Database URL en producción (es más lento y caro)

#### 3.4 Health Check Path (Opcional pero recomendado)

En "Advanced" → "Health Check Path": `/health`

Esto permite a Render verificar que tu app está funcionando.

#### 3.5 Auto-Deploy

Deja activado **"Auto-Deploy"** para que Render deploys automáticamente cuando hagas push a `main`.

#### 3.6 Crear el Servicio

Click **"Create Web Service"**

Render empezará a:
1. Clonar tu repo
2. Ejecutar `npm ci --only=production`
3. Ejecutar `npm start`

**Espera 3-5 minutos** para el primer build.

---

### PARTE 4: Configurar Base de Datos (Primera vez)

Una vez que el servicio esté deployed (status "Live"), necesitas configurar la BD.

#### 4.1 Conectarte a la BD desde tu máquina local

```bash
# Usar el EXTERNAL Database URL (solo para setup inicial)
psql "postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod"
```

#### 4.2 Crear Schema

```sql
-- Crear schema
CREATE SCHEMA IF NOT EXISTS finanzas;

-- Verificar
\dn
```

#### 4.3 Ejecutar Schema Inicial

**Opción A: Desde tu máquina local** (recomendado para primera vez)

```bash
# Descargar el schema desde tu repo
psql "postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod" < schema.sql
```

**Opción B: Usar Render Shell** (más lento pero no requiere psql local)

1. En Render Dashboard → Tu Web Service → **"Shell"**
2. Ejecutar:
```bash
# Instalar psql (solo primera vez)
apt-get update && apt-get install -y postgresql-client

# Conectar a la BD (usar INTERNAL URL)
psql $DATABASE_URL < schema.sql
```

#### 4.4 Ejecutar Migraciones Multi-Currency

**Opción A: Desde tu máquina local**

```bash
# Configurar env var temporalmente
export DATABASE_URL="postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod"

# Ejecutar migraciones
npm run db:migrate:multi-currency
```

**Opción B: Desde Render Shell**

```bash
# En Render Shell
npm run db:migrate:multi-currency
```

Deberías ver:
```
💱 Ejecutando migraciones de multi-moneda...
▶️  Ejecutando: 005_create_tipos_cambio_table.sql
✅ 005_create_tipos_cambio_table.sql ejecutada exitosamente
...
✅ Migraciones de multi-moneda completadas
```

#### 4.5 Seed Data (Categorías, Tipos de Pago, etc.)

**Opción A: Desde tu máquina local**

```bash
# Configurar env var
export DATABASE_URL="postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod"
export NODE_ENV=production

# Ejecutar seed
npm run seed-db
```

**Opción B: Desde Render Shell**

```bash
# En Render Shell
npm run seed-db
```

#### 4.6 Insertar Tipo de Cambio Inicial

**Una vez que tu API esté live**, ejecuta:

```bash
# Reemplaza con tu URL de Render
curl -X POST https://finanzas-api.onrender.com/api/tipo-cambio/actualizar
```

Esto descargará el dólar blue actual desde la API.

---

### PARTE 5: Verificación

#### 5.1 Health Check

```bash
curl https://finanzas-api.onrender.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T...",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 123.45
}
```

#### 5.2 Verificar Tipo de Cambio

```bash
curl https://finanzas-api.onrender.com/api/tipo-cambio/actual
```

Deberías ver el dólar blue:
```json
{
  "success": true,
  "data": {
    "fecha": "2025-10-26",
    "valor_compra_usd_ars": "1505.00",
    "valor_venta_usd_ars": "1525.00",
    "fuente": "api_dolar_api"
  }
}
```

#### 5.3 Swagger Docs

Visita: `https://finanzas-api.onrender.com/api-docs`

#### 5.4 Test de Registro

```bash
curl -X POST https://finanzas-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

---

## 🎨 CONECTAR CON FRONTEND

Si tienes un frontend (ej: React, Vue, Next.js):

### En tu Frontend

```javascript
// .env.production
VITE_API_URL=https://finanzas-api.onrender.com/api
# o para Next.js:
NEXT_PUBLIC_API_URL=https://finanzas-api.onrender.com/api
```

### En tu API (Backend)

Actualiza la variable `CORS_ORIGIN` en Render:

```bash
CORS_ORIGIN=https://tu-frontend.onrender.com
# O si tienes múltiples orígenes:
CORS_ORIGIN=https://frontend1.com,https://frontend2.com
```

---

## 🔄 ACTUALIZACIONES (CI/CD Automático)

Render tiene **Auto-Deploy activado por defecto**:

1. Haces cambios en tu código
2. `git push origin main`
3. Render detecta el push
4. Ejecuta automáticamente:
   - `npm ci --only=production`
   - `npm start`
5. Deploy listo en 2-3 minutos

**No necesitas hacer nada manual** ✅

---

## 💰 COSTOS ESTIMADOS

### Plan Gratuito
- **Web Service**: Free (se duerme después de 15 min sin uso)
- **PostgreSQL**: Free (90 días, luego $7/mes)
- **Total**: $0/mes (temporal)

### Plan Starter (Recomendado para producción)
- **Web Service**: $7/mes (siempre activo, 512MB RAM)
- **PostgreSQL**: $7/mes (1GB storage, backups)
- **Total**: $14/mes

### Plan Professional
- **Web Service**: $25/mes (4GB RAM, mejor rendimiento)
- **PostgreSQL**: $20/mes (10GB storage, backups automáticos)
- **Total**: $45/mes

**Recomendación**: Empieza con Free para testing, luego upgrade a Starter cuando estés listo.

---

## 🐛 TROUBLESHOOTING

### Error: "App failed to start"

**Ver logs**:
1. Render Dashboard → Tu servicio → **"Logs"**
2. Buscar errores rojos

**Problemas comunes**:
- Falta una variable de entorno → Agrégala en "Environment"
- Puerto incorrecto → Asegúrate de usar `PORT=3030`
- BD no conecta → Verifica el DATABASE_URL

### Error: "No hay tipo de cambio configurado"

**Solución**:
```bash
curl -X POST https://tu-api.onrender.com/api/tipo-cambio/actualizar
```

### Error: CORS

**Solución**: Verifica que `CORS_ORIGIN` en Render coincida con tu frontend URL.

### App muy lenta (Plan Free)

**Causa**: El plan Free se duerme después de 15 min sin uso. La primera request tarda ~30 segundos en despertar.

**Solución**: Upgrade a Starter ($7/mes) para que esté siempre activo.

---

## 📊 MONITOREO

### Ver Logs en Tiempo Real

Render Dashboard → Tu servicio → **"Logs"**

### Verificar Scheduler

En los logs, busca:
```
📅 Expense Scheduler: Activo (próxima ejecución: ...)
💱 Exchange Rate Scheduler: Activo
```

### Metrics

Render Dashboard → Tu servicio → **"Metrics"**

Verás:
- CPU usage
- Memory usage
- Response time
- Request count

---

## 🔐 SEGURIDAD

### 1. HTTPS

Render provee **HTTPS automático** con certificado SSL gratuito ✅

### 2. Environment Variables

Nunca hagas commit de `.env` al repo. Usa Render Environment Variables.

### 3. Database Backups

Con el plan Starter de PostgreSQL ($7/mes):
- Backups diarios automáticos
- Retención de 7 días
- Restauración con 1 click

### 4. IP Allowlist (Opcional)

Render te da una IP estática con planes pagados. Puedes restringir acceso a la BD solo desde esa IP.

---

## 🚀 OPTIMIZACIONES

### 1. Custom Domain

1. Render Dashboard → Tu servicio → **"Settings"** → **"Custom Domain"**
2. Agrega tu dominio: `api.tudominio.com`
3. Configura DNS en tu proveedor:
   ```
   CNAME api pointing to finanzas-api.onrender.com
   ```

### 2. Persistent Disk (Si necesitas almacenar archivos)

Por defecto, Render es **stateless** (sin storage persistente).

Si necesitas guardar archivos:
1. Settings → **"Disks"**
2. Add disk: `/opt/data` (por ejemplo)
3. **Costo**: $0.25/GB/mes

**Alternativa recomendada**: Usa S3, Cloudinary o similar para archivos.

### 3. Cron Jobs (Para tareas programadas adicionales)

Render tiene **Cron Jobs** nativos:
1. New + → **"Cron Job"**
2. Schedule: `0 0 * * *` (diario a medianoche)
3. Command: `curl https://tu-api.com/api/tipo-cambio/actualizar`

**Nota**: Tu app ya tiene schedulers internos, esto es opcional.

---

## ✅ CHECKLIST FINAL

- [ ] Base de datos PostgreSQL creada en Render
- [ ] Web Service creado y conectado al repo
- [ ] Variables de entorno configuradas (JWT_SECRET, CORS_ORIGIN, DATABASE_URL)
- [ ] Schema inicial ejecutado
- [ ] Migraciones multi-currency ejecutadas
- [ ] Seed data insertado
- [ ] Tipo de cambio inicial insertado
- [ ] Health check funciona: `/health`
- [ ] API responde: `/api/tipo-cambio/actual`
- [ ] Swagger docs accesibles: `/api-docs`
- [ ] CORS configurado para frontend
- [ ] Auto-deploy activado

---

## 📞 SOPORTE

**Render Docs**: https://render.com/docs
**Render Community**: https://community.render.com

**Tu API Docs**: https://tu-api.onrender.com/api-docs

---

**Última actualización**: 2025-10-26
**Versión**: 1.0.0
