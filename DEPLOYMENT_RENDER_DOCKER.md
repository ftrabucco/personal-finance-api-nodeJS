# Deployment en Render con Docker

Esta guía muestra cómo deployar usando Docker en Render (alternativa avanzada).

## ⚠️ ADVERTENCIA

**NO recomendado para comenzar**. Usa [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md) primero (Node.js nativo).

**Usa Docker solo si**:
- Tienes dependencias nativas complejas
- Necesitas versión específica de OS
- Ya tienes experiencia con Docker

## 📊 Diferencias vs Node.js Nativo

| Aspecto | Docker | Node Nativo |
|---------|--------|-------------|
| Build time | 8-10 min | 2-3 min |
| RAM usage | ~400MB | ~200MB |
| Costo Render | Más caro | Más barato |
| Complejidad | Alta | Baja |
| Debugging | Difícil | Fácil |

## 🐳 PASOS CON DOCKER

### 1. Build Local (Testing)

```bash
# Build imagen
docker build -t finanzas-api:latest .

# Ver tamaño (debería ser ~150-200MB)
docker images finanzas-api

# Test local
docker run -d \
  --name finanzas-test \
  -p 3030:3030 \
  --env-file .env \
  finanzas-api:latest

# Verificar logs
docker logs -f finanzas-test

# Test
curl http://localhost:3030/health

# Cleanup
docker stop finanzas-test
docker rm finanzas-test
```

### 2. Configurar Render para Docker

#### 2.1 Render.yaml (Recomendado)

Crear `render.yaml` en la raíz del proyecto:

```yaml
services:
  # PostgreSQL Database
  - type: pserv
    name: finanzas-db
    plan: starter
    region: oregon
    databaseName: finanzas_personal_prod
    databaseUser: finanzas_user
    ipAllowList: []

  # API (Docker)
  - type: web
    name: finanzas-api
    runtime: docker
    region: oregon
    plan: starter
    dockerfilePath: ./Dockerfile
    dockerContext: .
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3030
      - key: DATABASE_URL
        fromDatabase:
          name: finanzas-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: SESSION_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://tu-frontend.onrender.com
      - key: LOG_LEVEL
        value: info
      - key: SCHEDULER_ENABLED
        value: true
    healthCheckPath: /health
    autoDeploy: true
```

#### 2.2 Push a GitHub

```bash
git add Dockerfile .dockerignore render.yaml
git commit -m "feat: add Docker support for Render deployment"
git push origin main
```

#### 2.3 Deploy en Render

1. Render Dashboard → **"Blueprint"** → **"New Blueprint Instance"**
2. Conecta tu repo
3. Render detectará `render.yaml` automáticamente
4. Click **"Apply"**

Render creará:
- La base de datos PostgreSQL
- El web service con Docker
- Todas las variables de entorno

**Tiempo de build**: ~8-10 minutos (primera vez)

### 3. Configurar BD (igual que Node nativo)

```bash
# Conectar a BD
psql "postgres://finanzas_user:PASSWORD@dpg-xxxxx.oregon-postgres.render.com/finanzas_personal_prod"

# Crear schema
CREATE SCHEMA IF NOT EXISTS finanzas;

# Ejecutar schema inicial
\i schema.sql

# Migraciones (desde local)
export DATABASE_URL="postgres://..."
npm run db:migrate:multi-currency

# Seed
npm run seed-db

# Tipo de cambio inicial
curl -X POST https://finanzas-api.onrender.com/api/tipo-cambio/actualizar
```

---

## 🔍 Optimizaciones Docker

### Multi-Stage Build (Ya incluido)

El `Dockerfile` usa multi-stage build:
- **Stage 1**: Instala dependencias
- **Stage 2**: Copia solo lo necesario

**Resultado**: Imagen de ~150MB en lugar de ~500MB

### Seguridad

- ✅ Usuario no-root (`nodejs:nodejs`)
- ✅ Alpine Linux (imagen más pequeña y segura)
- ✅ Health check incluido
- ✅ Timezone Argentina configurada

### Cache de Layers

Docker cachea layers para builds más rápidos:

```dockerfile
# Esto se cachea si package.json no cambia
COPY package*.json ./
RUN npm ci --only=production

# Esto se ejecuta solo si el código cambia
COPY . .
```

---

## 🐛 Troubleshooting Docker

### Build muy lento

**Causa**: Render Free tiene CPU limitada

**Solución**: Upgrade a Starter plan, o usa Node.js nativo

### Error: "FATAL: password authentication failed"

**Causa**: DATABASE_URL incorrecto

**Solución**: Usa el Internal Database URL desde render.yaml

### Imagen muy grande (>500MB)

**Causa**: No estás usando multi-stage build

**Solución**: Usa el Dockerfile provisto (ya optimizado)

### Cannot connect to database from container

**Causa**: Using wrong DATABASE_URL

**Solución**:
```yaml
# En render.yaml, usa:
fromDatabase:
  name: finanzas-db
  property: connectionString
```

---

## 💰 Costos Docker vs Node

### Node.js Nativo
- Starter: $7/mes (512MB RAM suficiente)

### Docker
- Starter: $7/mes (puede necesitar más RAM)
- Standard: $25/mes (recomendado, 2GB RAM)

**Diferencia**: Docker usa ~2x más RAM → puede necesitar plan más caro

---

## 🏆 RECOMENDACIÓN FINAL

**Para el 95% de casos**: Usa [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md) (Node.js nativo)

**Usa Docker solo si**:
1. Tienes dependencias del sistema no disponibles en Render
2. Necesitas 100% reproducibilidad
3. Vas a deployar en múltiples plataformas (AWS, GCP, etc.)
4. Ya tienes infraestructura Docker existente

---

**Última actualización**: 2025-10-26
