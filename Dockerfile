# ============================================
# MULTI-STAGE BUILD para optimizar tamaño
# ============================================

# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:18-alpine AS dependencies

# Metadata
LABEL maintainer="trabucco.francisco@gmail.com"
LABEL description="Personal Finance API - Dependencies Stage"

# Instalar dependencias del sistema necesarias para compilar módulos nativos
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# STAGE 2: Production
# ============================================
FROM node:18-alpine AS production

# Metadata
LABEL maintainer="trabucco.francisco@gmail.com"
LABEL description="Personal Finance API - Production"
LABEL version="1.0.0"

# Instalar solo lo necesario para runtime
RUN apk add --no-cache \
    postgresql-client \
    curl \
    tzdata

# Configurar timezone para Argentina
ENV TZ=America/Argentina/Buenos_Aires
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorio de trabajo
WORKDIR /app

# Copiar node_modules desde stage de dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código de la aplicación
COPY --chown=nodejs:nodejs . .

# Crear directorio para logs
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3030/health || exit 1

# Variables de entorno por defecto (se sobrescriben en runtime)
ENV NODE_ENV=production
ENV PORT=3030
ENV LOG_LEVEL=info

# Comando para iniciar la aplicación
CMD ["node", "app.js"]
