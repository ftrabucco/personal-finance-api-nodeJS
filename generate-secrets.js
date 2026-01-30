#!/usr/bin/env node
import crypto from 'crypto';

/**
 * Script para generar secretos seguros para producción
 *
 * Uso:
 *   node generate-secrets.js
 *
 * Genera:
 *   - JWT_SECRET: Para firmar tokens JWT
 *   - SESSION_SECRET: Para sesiones de Express
 */

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('🔐 SECRETOS SEGUROS PARA PRODUCCIÓN');
console.log('=' .repeat(60));
console.log('');
console.log('⚠️  IMPORTANTE: Guarda estos valores en un lugar seguro');
console.log('⚠️  NO los subas a Git ni los compartas públicamente');
console.log('');
console.log('Copia estos valores a tu archivo .env de producción:');
console.log('');
console.log('─'.repeat(60));
console.log(`JWT_SECRET=${generateSecret()}`);
console.log(`SESSION_SECRET=${generateSecret()}`);
console.log('─'.repeat(60));
console.log('');
console.log('✅ Secretos generados exitosamente');
console.log('');
console.log('Próximos pasos:');
console.log('  1. Copia los valores anteriores a tu .env de producción');
console.log('  2. Asegúrate de NO commitear el archivo .env');
console.log('  3. Usa variables de entorno del servidor en producción');
console.log('');
