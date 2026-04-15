#!/bin/bash
# migrate.sh - Corre todas las migraciones pendientes en orden
# Usa una tabla migrations_log para trackear cuáles ya corrieron
# Uso: ./scripts/migrate.sh [postgres_container_name]
# Default container name: finanzas_postgres

set -e

CONTAINER=${1:-finanzas_postgres}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-finanzas_personal}
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"

echo "🔄 Corriendo migraciones en container '$CONTAINER' (DB: $DB_NAME)..."

# Crear tabla de log si no existe
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  CREATE TABLE IF NOT EXISTS finanzas.migrations_log (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
  );
"

# Correr cada migración en orden si no fue aplicada aún
for filepath in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$filepath")

  # Verificar si ya fue aplicada
  already_applied=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM finanzas.migrations_log WHERE filename = '$filename';")

  if [ "$already_applied" = "1" ]; then
    echo "  ⏭️  $filename (ya aplicada)"
  else
    echo "  ▶️  $filename..."
    docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f - < "$filepath"
    docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
      "INSERT INTO finanzas.migrations_log (filename) VALUES ('$filename');"
    echo "  ✅ $filename aplicada"
  fi
done

echo "✅ Migraciones completadas."
