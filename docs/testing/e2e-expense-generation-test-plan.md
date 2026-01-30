# Plan de Pruebas E2E - Sistema de Generación de Gastos

## Objetivo
Validar que el sistema de generación automática de gastos funciona correctamente para todos los tipos de gastos (recurrentes, débitos automáticos y compras con cuotas), asegurando que NO se generen duplicados y que el catch-up funcione apropiadamente.

---

## 🎯 Comportamientos Core a Validar

### 1. **Prevención de Duplicados**
- Los gastos mensuales NO deben regenerarse si ya fueron generados este mes
- Los gastos semanales NO deben regenerarse si ya fueron generados esta semana
- Los gastos diarios NO deben regenerarse si ya fueron generados hoy
- Las cuotas NO deben regenerarse si ya se generó una cuota este mes

### 2. **Catch-up Logic**
- Gastos que nunca fueron generados deben generarse aunque su día objetivo haya pasado
- Gastos con `ultima_fecha_generado = null` deben ser capturados

### 3. **Multi-moneda**
- Los gastos deben generarse con los valores correctos en ARS y USD
- El tipo de cambio debe guardarse correctamente

### 4. **Tracking de Fechas**
- `ultima_fecha_generado` debe actualizarse con la fecha objetivo (adjustedDate), no con "hoy"
- `fecha_ultima_cuota_generada` debe actualizarse correctamente para compras

---

## 📋 Suite 1: Gastos Recurrentes (GastoRecurrente)

### Test Case 1.1: Gasto Mensual - Generación Normal
**Objetivo**: Validar que un gasto mensual se genera en su día objetivo

**Setup**:
```javascript
- Crear usuario de prueba
- Crear categoría "Gimnasio"
- Crear frecuencia "Mensual"
- Crear gasto recurrente:
  {
    descripcion: "Gimnasio",
    monto_ars: 50000,
    dia_de_pago: 5,
    frecuencia_gasto_id: [mensual],
    usuario_id: [test_user],
    ultima_fecha_generado: null
  }
```

**Pasos**:
1. Simular fecha = "2025-11-05"
2. Llamar a `GET /api/gastos/generate`
3. Verificar response

**Assertions**:
- ✅ Response status = 200
- ✅ `generatedExpenses.length === 1`
- ✅ Gasto generado tiene `fecha = '2025-11-05'`
- ✅ Gasto generado tiene `monto_ars = 50000`
- ✅ `ultima_fecha_generado` del gasto recurrente = '2025-11-05'

---

### Test Case 1.2: Gasto Mensual - Prevención de Duplicados
**Objetivo**: Validar que un gasto mensual NO se regenera si ya fue generado este mes

**Setup**:
```javascript
- Mismo gasto recurrente del Test 1.1
- Modificar ultima_fecha_generado = '2025-11-05'
```

**Pasos**:
1. Simular fecha = "2025-11-06" (día siguiente)
2. Llamar a `GET /api/gastos/generate`
3. Verificar response

**Assertions**:
- ✅ Response status = 200
- ✅ `generatedExpenses.length === 0` (NO debe generar nada)
- ✅ Log debe mostrar "Already generated this month"

---

### Test Case 1.3: Gasto Mensual - Catch-up Logic
**Objetivo**: Validar que un gasto mensual nunca generado se genera aunque el día objetivo haya pasado

**Setup**:
```javascript
- Crear gasto recurrente:
  {
    descripcion: "Alquiler",
    monto_ars: 500000,
    dia_de_pago: 5,
    frecuencia_gasto_id: [mensual],
    usuario_id: [test_user],
    ultima_fecha_generado: null  // ⚠️ NUNCA GENERADO
  }
```

**Pasos**:
1. Simular fecha = "2025-11-10" (5 días después del día objetivo)
2. Llamar a `GET /api/gastos/generate`
3. Verificar response

**Assertions**:
- ✅ Response status = 200
- ✅ `generatedExpenses.length === 1`
- ✅ Gasto generado tiene `fecha = '2025-11-05'` (adjustedDate, no hoy)
- ✅ `ultima_fecha_generado` = '2025-11-05'
- ✅ Log debe mostrar "catch-up for day 5"

---

### Test Case 1.4: Gasto Mensual - Regeneración al Mes Siguiente
**Objetivo**: Validar que un gasto mensual SE regenera el próximo mes

**Setup**:
```javascript
- Mismo gasto recurrente
- Modificar ultima_fecha_generado = '2025-11-05'
```

**Pasos**:
1. Simular fecha = "2025-12-05" (próximo mes)
2. Llamar a `GET /api/gastos/generate`
3. Verificar response

**Assertions**:
- ✅ Response status = 200
- ✅ `generatedExpenses.length === 1`
- ✅ Gasto generado tiene `fecha = '2025-12-05'`
- ✅ `ultima_fecha_generado` actualizado a '2025-12-05'

---

### Test Case 1.5: Gasto Quincenal - Día 1 y 15
**Objetivo**: Validar que gastos quincenales se generan correctamente

**Setup**:
```javascript
- Crear frecuencia "Quincenal"
- Crear gasto recurrente:
  {
    descripcion: "Empleada doméstica",
    monto_ars: 30000,
    frecuencia_gasto_id: [quincenal],
    ultima_fecha_generado: null
  }
```

**Pasos**:
1. Simular fecha = "2025-11-01"
2. Llamar a `GET /api/gastos/generate`
3. Verificar gasto generado
4. Simular fecha = "2025-11-15"
5. Llamar nuevamente a `GET /api/gastos/generate`
6. Verificar segundo gasto generado

**Assertions**:
- ✅ Primera generación: `fecha = '2025-11-01'`
- ✅ Segunda generación: `fecha = '2025-11-15'`
- ✅ NO debe generar entre el 2 y el 14
- ✅ NO debe generar entre el 16 y el 31

---

### Test Case 1.6: Gasto Semanal - Prevención de Duplicados
**Objetivo**: Validar que gastos semanales NO se regeneran en la misma semana

**Setup**:
```javascript
- Crear frecuencia "Semanal"
- Crear gasto recurrente:
  {
    descripcion: "Verdulería",
    monto_ars: 15000,
    dia_de_semana: 2, // Martes
    frecuencia_gasto_id: [semanal]
  }
```

**Pasos**:
1. Simular fecha = martes "2025-11-04"
2. Llamar a `GET /api/gastos/generate`
3. Verificar generación exitosa
4. Simular fecha = miércoles "2025-11-05" (misma semana)
5. Llamar nuevamente a `GET /api/gastos/generate`

**Assertions**:
- ✅ Primera llamada genera gasto
- ✅ Segunda llamada NO genera (mismo semana)
- ✅ Log: "Already generated this week"

---

### Test Case 1.7: Gasto Diario - Prevención de Duplicados
**Objetivo**: Validar que gastos diarios NO se regeneran el mismo día

**Setup**:
```javascript
- Crear frecuencia "Diaria"
- Crear gasto recurrente:
  {
    descripcion: "Comida diaria",
    monto_ars: 5000,
    frecuencia_gasto_id: [diaria]
  }
```

**Pasos**:
1. Simular fecha = "2025-11-10 10:00"
2. Llamar a `GET /api/gastos/generate`
3. Simular fecha = "2025-11-10 18:00" (mismo día, diferente hora)
4. Llamar nuevamente a `GET /api/gastos/generate`

**Assertions**:
- ✅ Primera llamada genera gasto
- ✅ Segunda llamada NO genera (mismo día)
- ✅ Log: "Already generated today"

---

## 📋 Suite 2: Débitos Automáticos (DebitoAutomatico)

### Test Case 2.1: Débito Mensual - Generación Normal
**Objetivo**: Validar que un débito automático mensual se genera correctamente

**Setup**:
```javascript
- Crear débito automático:
  {
    descripcion: "Netflix Premium",
    monto_ars: 5990,
    dia_de_pago: 10,
    frecuencia_gasto_id: [mensual],
    fecha_inicio: '2025-11-01',
    ultima_fecha_generado: null
  }
```

**Pasos**:
1. Simular fecha = "2025-11-10"
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ Gasto generado con `fecha = '2025-11-10'`
- ✅ `ultima_fecha_generado` = '2025-11-10'
- ✅ `tipo_origen = 'debito_automatico'`

---

### Test Case 2.2: Débito Mensual - Prevención de Duplicados
**Objetivo**: Validar que débitos mensuales NO se regeneran este mes

**Setup**:
```javascript
- Mismo débito automático
- Modificar ultima_fecha_generado = '2025-11-10'
```

**Pasos**:
1. Simular fecha = "2025-11-11" (día siguiente)
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe generar gasto
- ✅ Log: "Already generated this month"

---

### Test Case 2.3: Débito con Fecha de Baja
**Objetivo**: Validar que débitos dados de baja NO se generan

**Setup**:
```javascript
- Crear débito automático:
  {
    descripcion: "Spotify",
    monto_ars: 3000,
    dia_de_pago: 15,
    frecuencia_gasto_id: [mensual],
    fecha_inicio: '2025-10-01',
    fecha_baja: '2025-11-01'  // ⚠️ DADO DE BAJA
  }
```

**Pasos**:
1. Simular fecha = "2025-11-15"
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe generar gasto
- ✅ Log: "Outside valid date range"

---

### Test Case 2.4: Múltiples Débitos Automáticos - Sin Duplicados
**Objetivo**: Validar que múltiples débitos NO se duplican al llamar el endpoint varias veces

**Setup**:
```javascript
- Crear 3 débitos automáticos:
  1. Netflix (día 10)
  2. Swiss Medical (día 10)
  3. Disney+ (día 15)
```

**Pasos**:
1. Simular fecha = "2025-11-10"
2. Llamar a `GET /api/gastos/generate`
3. Verificar que se generan Netflix y Swiss Medical
4. Llamar NUEVAMENTE a `GET /api/gastos/generate` (mismo día)
5. Verificar que NO se regeneran

**Assertions**:
- ✅ Primera llamada: 2 gastos generados
- ✅ Segunda llamada: 0 gastos generados
- ✅ Disney+ NO se genera hasta el día 15

---

## 📋 Suite 3: Compras con Cuotas (Compra)

### Test Case 3.1: Compra 1 Cuota - Efectivo
**Objetivo**: Validar generación inmediata de compra en 1 cuota con efectivo

**Setup**:
```javascript
- Crear compra:
  {
    descripcion: "Compra supermercado",
    monto_total_ars: 100000,
    cantidad_cuotas: 1,
    fecha_compra: '2025-11-10',
    tipo_pago_id: [efectivo],
    pendiente_cuotas: true,
    fecha_ultima_cuota_generada: null
  }
```

**Pasos**:
1. Simular fecha = "2025-11-10"
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ Gasto generado inmediatamente
- ✅ `monto_ars = 100000` (monto completo)
- ✅ `descripcion` contiene "Cuota 1/1"
- ✅ `pendiente_cuotas = false`
- ✅ `fecha_ultima_cuota_generada = '2025-11-10'`

---

### Test Case 3.2: Compra 1 Cuota - Prevención de Duplicado
**Objetivo**: Validar que una compra en 1 cuota NO se regenera

**Setup**:
```javascript
- Misma compra
- Modificar fecha_ultima_cuota_generada = '2025-11-10'
- Modificar pendiente_cuotas = false
```

**Pasos**:
1. Simular fecha = "2025-11-11"
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe generar gasto
- ✅ `pendiente_cuotas = false`

---

### Test Case 3.3: Compra 3 Cuotas - Efectivo
**Objetivo**: Validar generación mensual de cuotas con efectivo

**Setup**:
```javascript
- Crear compra:
  {
    descripcion: "Mueble",
    monto_total_ars: 300000,
    cantidad_cuotas: 3,
    fecha_compra: '2025-11-15',
    tipo_pago_id: [efectivo],
    pendiente_cuotas: true,
    fecha_ultima_cuota_generada: null
  }
```

**Pasos**:
1. Simular fecha = "2025-11-15"
2. Llamar a `GET /api/gastos/generate` → Cuota 1
3. Simular fecha = "2025-12-15"
4. Llamar a `GET /api/gastos/generate` → Cuota 2
5. Simular fecha = "2026-01-15"
6. Llamar a `GET /api/gastos/generate` → Cuota 3

**Assertions**:
- ✅ Cuota 1: `monto_ars = 100000`, `descripcion = "Mueble - Cuota 1/3"`
- ✅ Cuota 2: `monto_ars = 100000`, `descripcion = "Mueble - Cuota 2/3"`
- ✅ Cuota 3: `monto_ars = 100000`, `descripcion = "Mueble - Cuota 3/3"`
- ✅ Después de cuota 3: `pendiente_cuotas = false`

---

### Test Case 3.4: Compra 3 Cuotas - Prevención de Duplicados
**Objetivo**: Validar que NO se generan 2 cuotas en el mismo mes

**Setup**:
```javascript
- Misma compra del Test 3.3
- Modificar fecha_ultima_cuota_generada = '2025-11-15'
```

**Pasos**:
1. Simular fecha = "2025-11-16" (día siguiente, mismo mes)
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe generar cuota
- ✅ Log: cuota ya generada este mes

---

### Test Case 3.5: Compra con Tarjeta de Crédito - Vencimiento
**Objetivo**: Validar que cuotas con tarjeta de crédito se generan en el día de vencimiento

**Setup**:
```javascript
- Crear tarjeta de crédito:
  {
    nombre: "Visa",
    tipo: "credito",
    dia_cierre: 25,
    dia_vencimiento: 10
  }
- Crear compra:
  {
    descripcion: "Notebook",
    monto_total_ars: 600000,
    cantidad_cuotas: 3,
    fecha_compra: '2025-11-20', // Compra después del cierre (25)
    tipo_pago_id: [credito],
    tarjeta_id: [visa],
    pendiente_cuotas: true
  }
```

**Pasos**:
1. Simular fecha = "2025-12-10" (primer vencimiento)
2. Llamar a `GET /api/gastos/generate`
3. Simular fecha = "2026-01-10" (segundo vencimiento)
4. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ Cuota 1 se genera el 2025-12-10 (no en noviembre)
- ✅ Cuota 2 se genera el 2026-01-10
- ✅ Fecha de gasto usa día de vencimiento, no día de compra

---

### Test Case 3.6: Campo fecha_compra Correcto
**Objetivo**: Validar que el sistema usa `fecha_compra` y no `fecha`

**Setup**:
```javascript
- Crear compra SIN campo `fecha` (solo `fecha_compra`)
```

**Pasos**:
1. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe fallar con "undefined"
- ✅ Debe usar correctamente `fecha_compra`

---

## 📋 Suite 4: Multi-Moneda

### Test Case 4.1: Gasto Recurrente en USD
**Objetivo**: Validar generación de gasto con moneda USD

**Setup**:
```javascript
- Crear tipo de cambio: { fuente: 'manual', tasa_compra: 1200, tasa_venta: 1250 }
- Crear gasto recurrente:
  {
    descripcion: "Alquiler",
    monto_ars: 600000,
    monto_usd: 500,
    moneda_origen: 'USD',
    tipo_cambio_usado: 1200,
    dia_de_pago: 1
  }
```

**Pasos**:
1. Simular fecha = "2025-11-01"
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ Gasto generado tiene `monto_ars = 600000`
- ✅ Gasto generado tiene `monto_usd = 500`
- ✅ Gasto generado tiene `moneda_origen = 'USD'`
- ✅ Gasto generado tiene `tipo_cambio_usado = 1200`

---

### Test Case 4.2: Compra en USD con Cuotas
**Objetivo**: Validar división correcta de cuotas en ambas monedas

**Setup**:
```javascript
- Crear compra:
  {
    monto_total_ars: 1200000,
    monto_total_usd: 1000,
    cantidad_cuotas: 4,
    moneda_origen: 'USD',
    tipo_cambio_usado: 1200
  }
```

**Pasos**:
1. Generar cuota 1

**Assertions**:
- ✅ Cuota: `monto_ars = 300000` (1200000 / 4)
- ✅ Cuota: `monto_usd = 250` (1000 / 4)
- ✅ Cuota: `moneda_origen = 'USD'`

---

## 📋 Suite 5: Edge Cases

### Test Case 5.1: Día 31 en Mes con 30 Días
**Objetivo**: Validar ajuste de fecha para meses con menos días

**Setup**:
```javascript
- Crear gasto recurrente con dia_de_pago = 31
```

**Pasos**:
1. Simular fecha = "2025-11-30" (noviembre tiene 30 días)
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ Gasto generado con `fecha = '2025-11-30'` (ajustado)
- ✅ Log: "adjusted to day 30"

---

### Test Case 5.2: Múltiples Llamadas Simultáneas
**Objetivo**: Validar que llamadas concurrentes NO generan duplicados (race conditions)

**Setup**:
```javascript
- Crear gasto recurrente mensual (día 10)
```

**Pasos**:
1. Simular fecha = "2025-11-10"
2. Llamar a `GET /api/gastos/generate` 5 veces en paralelo usando Promise.all()

**Assertions**:
- ✅ Solo 1 gasto debe generarse (no 5)
- ✅ Transacciones deben manejar concurrencia

---

### Test Case 5.3: Gasto con fecha_inicio Futura
**Objetivo**: Validar que gastos con fecha_inicio futura NO se generan

**Setup**:
```javascript
- Crear gasto recurrente:
  {
    descripcion: "Futuro",
    dia_de_pago: 10,
    fecha_inicio: '2025-12-01'
  }
```

**Pasos**:
1. Simular fecha = "2025-11-10" (antes de fecha_inicio)
2. Llamar a `GET /api/gastos/generate`

**Assertions**:
- ✅ NO debe generar gasto
- ✅ Log: "Start date not reached"

---

## 🛠️ Implementación Técnica

### Herramientas Recomendadas
1. **Jest** - Test runner (ya lo tienes)
2. **Supertest** - HTTP assertions (ya lo tienes)
3. **timekeeper** o **MockDate** - Para simular fechas
4. **PostgreSQL Test Container** - Base de datos real para E2E

### Estructura de Archivos
```
tests/
├── e2e/
│   ├── setup/
│   │   ├── testDatabase.js          # Setup DB para E2E
│   │   ├── testFixtures.js          # Datos de prueba
│   │   └── testHelpers.js           # Helpers (simular fechas, etc)
│   ├── expenseGeneration/
│   │   ├── gastoRecurrente.e2e.test.js
│   │   ├── debitoAutomatico.e2e.test.js
│   │   ├── compras.e2e.test.js
│   │   └── multiCurrency.e2e.test.js
│   └── edgeCases/
│       └── edgeCases.e2e.test.js
```

### Helper: Simular Fechas
```javascript
import MockDate from 'mockdate';

export function setTestDate(dateString) {
  MockDate.set(new Date(dateString));
}

export function resetTestDate() {
  MockDate.reset();
}
```

### Helper: Limpiar DB entre Tests
```javascript
export async function cleanDatabase() {
  await Gasto.destroy({ where: {}, force: true });
  await GastoRecurrente.destroy({ where: {}, force: true });
  await DebitoAutomatico.destroy({ where: {}, force: true });
  await Compra.destroy({ where: {}, force: true });
}
```

### Template de Test E2E
```javascript
import request from 'supertest';
import app from '../../../app.js';
import { setTestDate, resetTestDate, cleanDatabase } from '../setup/testHelpers.js';

describe('E2E: Gastos Recurrentes - Generación Mensual', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup usuario de prueba
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'Test1234!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!' });

    authToken = loginRes.body.token;
    testUser = loginRes.body.user;
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(() => {
    resetTestDate();
  });

  describe('Test Case 1.1: Gasto Mensual - Generación Normal', () => {
    it('debe generar un gasto mensual en su día objetivo', async () => {
      // Setup
      const categoriaRes = await request(app)
        .get('/api/categorias-gasto')
        .set('Authorization', `Bearer ${authToken}`);
      const categoriaId = categoriaRes.body.data[0].id;

      const frecuenciaRes = await request(app)
        .get('/api/frecuencias-gasto')
        .set('Authorization', `Bearer ${authToken}`);
      const frecuenciaMensual = frecuenciaRes.body.data.find(f =>
        f.nombre_frecuencia.toLowerCase() === 'mensual'
      );

      const gastoRecurrenteRes = await request(app)
        .post('/api/gastos-recurrentes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descripcion: 'Gimnasio',
          monto: 50000,
          dia_de_pago: 5,
          frecuencia_gasto_id: frecuenciaMensual.id,
          categoria_gasto_id: categoriaId,
          importancia_gasto_id: 1,
          tipo_pago_id: 1
        });

      const gastoRecurrenteId = gastoRecurrenteRes.body.data.id;

      // Simular fecha
      setTestDate('2025-11-05T10:00:00Z');

      // Ejecutar
      const generateRes = await request(app)
        .get('/api/gastos/generate')
        .set('Authorization', `Bearer ${authToken}`);

      // Assertions
      expect(generateRes.status).toBe(200);
      expect(generateRes.body.generatedExpenses).toHaveLength(1);

      const generatedExpense = generateRes.body.generatedExpenses[0];
      expect(generatedExpense.fecha).toBe('2025-11-05');
      expect(generatedExpense.monto_ars).toBe('50000.00');
      expect(generatedExpense.descripcion).toBe('Gimnasio');

      // Verificar que ultima_fecha_generado se actualizó
      const updatedGastoRecurrenteRes = await request(app)
        .get(`/api/gastos-recurrentes/${gastoRecurrenteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(updatedGastoRecurrenteRes.body.data.ultima_fecha_generado).toBe('2025-11-05');
    });
  });
});
```

---

## 📊 Métricas de Éxito

### Cobertura Mínima
- ✅ 100% de los casos de prevención de duplicados
- ✅ 100% de los casos de catch-up logic
- ✅ 100% de los tipos de frecuencia (diaria, semanal, quincenal, mensual)
- ✅ 100% de los tipos de gasto (recurrente, débito, compra)

### Performance
- ⚡ Cada test debe ejecutarse en < 2 segundos
- ⚡ Suite completa en < 60 segundos

### Estabilidad
- 🔒 0% flakiness (tests deben ser determinísticos)
- 🔒 Limpieza completa de DB entre tests

---

## 🚀 Próximos Pasos

1. **Fase 1**: Implementar Suite 1 (Gastos Recurrentes) - 7 tests
2. **Fase 2**: Implementar Suite 2 (Débitos Automáticos) - 4 tests
3. **Fase 3**: Implementar Suite 3 (Compras con Cuotas) - 6 tests
4. **Fase 4**: Implementar Suite 4 (Multi-Moneda) - 2 tests
5. **Fase 5**: Implementar Suite 5 (Edge Cases) - 3 tests

**Total**: 22 tests E2E core

---

## 📝 Notas Importantes

1. **Usar DB de Test Real**: No mockear Sequelize, usar PostgreSQL real con datos de test
2. **Transacciones**: Cada test debe usar transacciones para rollback automático
3. **Fechas Mockeadas**: Usar `MockDate` o `timekeeper` para control total de fechas
4. **Autenticación**: Todos los tests deben usar JWT real
5. **Logs**: Capturar logs para verificar mensajes de debug

---

## 🔗 Referencias

- [Documentación Jest](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [MockDate](https://github.com/boblauer/MockDate)
- [PostgreSQL Testcontainers](https://node.testcontainers.org/)
