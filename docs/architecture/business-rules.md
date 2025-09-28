# Business Rules - Gastos App

Este documento describe los **casos de uso y reglas de negocio** principales para la generación y manejo de **gastos reales** a partir de entidades origen.  
Cada entidad origen (gasto único, recurrente, débito automático, compra) se traduce en registros en la tabla `gastos`.

---

## 1. Gastos provenientes de entidades origen

### 1.1 Gasto Único
**Descripción:**  
El gasto más simple. Se genera automáticamente un gasto real en la tabla `gastos` al ejecutarse el `CREATE` en la tabla `gastos_unicos`.

**Reglas de negocio:**
- **CREATE:**  
  - Al crear un gasto único, debe ejecutarse `generate_gasto()` con los datos correspondientes (descripción, monto, fecha, categoría, importancia, tipo de pago, tarjeta si aplica).
  - Se inserta simultáneamente en
 `gastos_unicos` y en `gastos`.
- **UPDATE:**  
  - Si se modifica un gasto único (monto, descripción, categoría, tipo de pago, etc. → excepto el `id`), se deben actualizar **ambas tablas**: `gastos_unicos` y su gasto real asociado en `gastos`.
- **DELETE:**  
  - Si se elimina un gasto único, también debe eliminarse el gasto real en `gastos` que tenga la referencia `id_origen` + `tipo_origen = "gasto_unico"`.

---

### 1.2 Gasto Recurrente
**Descripción:**  
Son gastos que se repiten con cierta frecuencia (ejemplo: semanal, mensual, anual).  
Se generan cuando llega la fecha correspondiente de pago según el patrón de frecuencia definido.

**Campos clave:**
- `dia_de_pago`: Día del mes (1-31) en que ocurre el gasto
- `mes_de_pago`: Mes específico (1-12) para gastos anuales. NULL para otras frecuencias
- `frecuencia_gasto_id`: Referencia a la frecuencia (semanal, mensual, anual, etc.)
- `activo`: Controla si el gasto debe seguir generándose
- `ultima_fecha_generado`: Evita duplicados en la generación

**Reglas de negocio:**
- **GENERACIÓN:**  
  - Un job/servicio se ejecuta diariamente para revisar qué `gastos_recurrentes` deben generar un gasto real hoy.  
  - **Mensual:** si `dia_de_pago = 5` → todos los días 5 de cada mes se genera un gasto.
  - **Semanal:** calcula el día de la semana basado en `dia_de_pago` y genera semanalmente.
  - **Anual:** requiere `mes_de_pago`. Si `dia_de_pago = 5` y `mes_de_pago = 1` → solo el 5 de enero se genera el gasto.
  - **Validación:** Para frecuencia anual, `mes_de_pago` es obligatorio (1-12). Para otras frecuencias debe ser NULL.
- **ACTIVO:**  
  - Si el flag `activo = false`, el gasto recurrente no debe generar gastos reales.
- **CREATE:**
  - Al crear un gasto recurrente, se intenta generar el primer gasto si corresponde según la fecha actual y la frecuencia.
  - El proceso es transaccional: si falla la generación del gasto, se revierte la creación del recurrente.
- **UPDATE:**  
  - Se puede modificar el gasto recurrente en su tabla (`gastos_recurrentes`).  
  - Cambios aplican solo a los **futuros gastos** generados. Los ya generados en `gastos` no se modifican.
  - La validación de `mes_de_pago` se aplica según la frecuencia seleccionada.
- **DELETE:**  
  - Eliminar el gasto recurrente evita la generación futura.  
  - Los gastos ya generados en `gastos` no se eliminan (se mantienen como histórico).

---

### 1.3 Débito Automático
**Descripción:**  
Débitos fijos en tarjeta o cuenta bancaria. Similar a los gastos recurrentes, pero asociados a un medio de pago específico.  
Se da por descontado que el débito ocurre en la fecha configurada.

**Campos clave:**
- `dia_de_pago`: Día del mes (1-31) en que ocurre el débito
- `mes_de_pago`: Mes específico (1-12) para débitos anuales. NULL para otras frecuencias
- `frecuencia_gasto_id`: Referencia a la frecuencia (semanal, mensual, anual, etc.)
- `activo`: Controla si el débito debe seguir generándose
- `ultima_fecha_generado`: Evita duplicados en la generación

**Reglas de negocio:**
- **GENERACIÓN:**  
  - Un job/servicio se ejecuta diariamente para revisar qué `debitos_automaticos` deben generar un gasto real hoy.
  - **Mensual:** si `dia_de_pago = 5` → todos los días 5 de cada mes se genera un gasto.
  - **Semanal:** calcula el día de la semana basado en `dia_de_pago` y genera semanalmente.
  - **Anual:** requiere `mes_de_pago`. Si `dia_de_pago = 5` y `mes_de_pago = 1` → solo el 5 de enero se genera el gasto.
  - **Validación:** Para frecuencia anual, `mes_de_pago` es obligatorio (1-12). Para otras frecuencias debe ser NULL.
- **ACTIVO:**  
  - Si el flag `activo = false`, el débito automático no debe generar gastos reales.
- **CREATE:**
  - Al crear un débito automático, se intenta generar el primer gasto si corresponde según la fecha actual y la frecuencia.
  - El proceso es transaccional: si falla la generación del gasto, se revierte la creación del débito.
- **UPDATE:**  
  - Cambios en `debitos_automaticos` impactan en los próximos gastos generados, **no en los pasados**.
  - La validación de `mes_de_pago` se aplica según la frecuencia seleccionada.
- **DELETE:**  
  - Eliminar el débito automático evita la generación futura.  
  - Los gastos ya generados en `gastos` permanecen como histórico.

---

### 1.4 Compras en Cuotas
**Descripción:**  
Representa compras que se pagan en varias cuotas o de forma inmediata.  
Cada cuota se transforma en un gasto real en la tabla `gastos` según el tipo de pago y las fechas de vencimiento de tarjetas.

**Campos clave:**
- `monto_total`: Monto total de la compra (hasta 2 decimales)
- `cantidad_cuotas`: Número de cuotas (1-60). Default: 1
- `fecha_compra`: Fecha en que se realizó la compra (no puede ser futura)
- `tipo_pago_id`: Tipo de pago (efectivo, débito, crédito, transferencia)
- `tarjeta_id`: Tarjeta asociada (opcional para efectivo/transferencia)
- `pendiente_cuotas`: Control de cuotas pendientes de generación

**Reglas de negocio:**
- **COMPRA DE 1 CUOTA (Pago diferenciado por tipo):**  
  - **Efectivo/Débito/Transferencia:** El gasto se genera en la `fecha_compra`
  - **Tarjeta de Crédito:** El gasto se genera en el `dia_vencimiento` de la tarjeta
    - Si la compra es antes del día cierre da la tajeta, se paga el dia de vencimiento → vence en el mismo mes
    - Si la compra es después del día de cierre → vence el mes siguiente (dia de vencimiento)
    - **Requisito:** Las tarjetas de crédito deben tener `dia_cierre` y `dia_vencimiento` configurados (1-31)
- **COMPRAS EN CUOTAS (cantidad_cuotas > 1):**
  - Se generan `N` gastos en la tabla `gastos` (N = cantidad de cuotas)
  - Cada gasto corresponde a una cuota proporcional (`monto_total / cantidad_cuotas`)
  - **Fechas de generación:**
    - **Efectivo/Débito/Transferencia:** Cada cuota se genera el mismo día del mes de la compra original
    - **Tarjeta de Crédito:** Cada cuota se genera en el `dia_vencimiento` de la tarjeta cada mes
      - Primera cuota: Respeta regla de día de cierre (este mes o siguiente)
      - Cuotas siguientes: Siempre el `dia_vencimiento` de cada mes
    - **Cuotas siguientes:** Mensualmente en la misma fecha (día del mes)
- **GENERACIÓN AUTOMÁTICA:**
  - Un job/servicio se ejecuta diariamente para procesar compras con `pendiente_cuotas = true`
  - Al completar todas las cuotas, se marca `pendiente_cuotas = false`
- **CREATE:**
  - Todas las compras se marcan inicialmente como `pendiente_cuotas = true`
  - No se genera gasto inmediatamente, queda para el job de generación
- **UPDATE:**  
  - Cambios en la compra impactan solo en cuotas futuras no generadas
  - Validación de `cantidad_cuotas` vs gastos ya generados para evitar inconsistencias
- **DELETE:**  
  - Al eliminar una compra se detiene la generación futura
  - Las cuotas ya generadas en `gastos` se mantienen como histórico

**Validaciones específicas:**
- `cantidad_cuotas`: Entre 1 y 60
- `fecha_compra`: No puede ser futura
- `monto_total`: Debe ser positivo con máximo 2 decimales
- Tarjetas de crédito requieren `dia_cierre` y `dia_vencimiento` válidos (1-31)

---

## 2. Job de Generación Automática de Gastos

### 2.1 Endpoint Principal
- **URL:** `GET /api/gastos/generate`
- **Propósito:** Ejecutar manualmente o vía cron job la generación de gastos pendientes
- **Frecuencia recomendada:** Diaria (por ejemplo, todos los días a las 6:00 AM)

### 2.2 Proceso de Generación
El job revisa las siguientes entidades en orden y genera gastos según corresponda:

1. **Gastos Recurrentes Activos** (`gastos_recurrentes` where `activo = true`)
2. **Débitos Automáticos Activos** (`debitos_automaticos` where `activo = true`)  
3. **Compras Pendientes** (`compras` where `pendiente_cuotas = true`)
4. **Gastos Únicos No Procesados** (`gastos_unicos` where `procesado = false`)

### 2.3 Lógica de Fecha por Entidad
- **Recurrentes/Débitos:** Según `dia_de_pago`, `mes_de_pago` y frecuencia
- **Compras Efectivo/Débito:** En `fecha_compra`
- **Compras Crédito:** En `dia_vencimiento` de la tarjeta
- **Gastos Únicos:** En `fecha` del gasto único

### 2.4 Respuesta del Job
```json
{
  "message": "Generación de gastos completada exitosamente",
  "summary": {
    "total_generated": 5,
    "total_errors": 0,
    "breakdown": {
      "recurrentes": 2,
      "debitos": 1, 
      "compras": 2,
      "unicos": 0
    }
  },
  "details": {
    "success": [
      {"type": "recurrente", "id": 123},
      {"type": "compra", "id": 456}
    ],
    "errors": []
  }
}
```

---

## 3. Sistema de Autenticación

### 3.1 Registro de Usuarios
**Descripción:**
Sistema de registro para nuevos usuarios con validación de datos y prevención de duplicados.

**Endpoint:** `POST /api/auth/register`

**Reglas de negocio:**
- **Validación de datos:**
  - `nombre`: Obligatorio, 2-100 caracteres
  - `email`: Obligatorio, formato email válido, único en el sistema
  - `password`: Obligatorio, mínimo 6 caracteres, debe contener al menos 1 mayúscula, 1 minúscula y 1 número
- **Seguridad:**
  - Password se hashea con bcrypt usando 10 salt rounds antes de almacenar
  - Email se convierte a lowercase para evitar duplicados por caso
- **Respuesta exitosa (201):**
  - Usuario creado sin devolver password
  - Token JWT generado con expiración de 7 días
- **Errores comunes:**
  - 400: Email ya existe en el sistema
  - 400: Datos inválidos (validación Joi)

### 3.2 Autenticación de Usuarios
**Descripción:**
Sistema de login con generación de tokens JWT para sesiones.

**Endpoint:** `POST /api/auth/login`

**Reglas de negocio:**
- **Validación:**
  - `email`: Obligatorio, formato email
  - `password`: Obligatorio
- **Proceso de autenticación:**
  - Email se busca en formato lowercase
  - Password se compara con bcrypt contra el hash almacenado
  - Se genera JWT token con información del usuario (id, email, nombre)
- **Respuesta exitosa (200):**
  - Token JWT con expiración de 7 días
  - Datos del usuario (sin password)
- **Errores comunes:**
  - 401: Credenciales inválidas
  - 400: Datos faltantes o inválidos

### 3.3 Gestión de Perfil
**Descripción:**
Operaciones para consultar y actualizar el perfil del usuario autenticado.

**Endpoints:**
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

**Reglas de negocio:**
- **Autenticación requerida:** Todos los endpoints requieren token JWT válido
- **Actualización de perfil:**
  - `nombre`: Opcional, 2-100 caracteres si se proporciona
  - `email`: Opcional, formato email válido, único en el sistema
  - El usuario se identifica por el token JWT (no por parámetro)
- **Validaciones:**
  - Email debe ser único (excepto para el mismo usuario)
  - Datos opcionales pero con validación si se proporcionan

### 3.4 Cambio de Contraseña
**Descripción:**
Cambio seguro de contraseña con validación de contraseña actual.

**Endpoint:** `POST /api/auth/change-password`

**Reglas de negocio:**
- **Autenticación requerida:** Token JWT válido
- **Validaciones:**
  - `currentPassword`: Obligatorio, debe coincidir con password actual
  - `newPassword`: Obligatorio, mismas reglas que en registro
- **Proceso de cambio:**
  - Se verifica la contraseña actual con bcrypt
  - Se hashea la nueva contraseña con bcrypt (10 rounds)
  - Se actualiza en base de datos
- **Respuesta exitosa (200):** Confirmación de cambio exitoso
- **Errores comunes:**
  - 400: Contraseña actual incorrecta
  - 400: Nueva contraseña no cumple requisitos

### 3.5 Middleware de Autenticación
**Descripción:**
Sistema de middleware para proteger rutas y extraer información del usuario.

**Middlewares disponibles:**
- **`authenticateToken`**: Autenticación obligatoria
  - Extrae y valida token JWT del header Authorization
  - Agrega `req.user` con datos del usuario
  - Responde 401 si token inválido o faltante
- **`optionalAuth`**: Autenticación opcional
  - Similar a authenticateToken pero permite continuar sin token
  - `req.user` puede ser null
- **`requireRole`**: Control de roles (extensible)
  - Para futuras implementaciones de roles/permisos
- **`logAuthenticatedRequest`**: Auditoría
  - Registra requests autenticados para seguimiento

### 3.6 Configuración JWT
**Configuración del sistema de tokens:**
- **Algoritmo:** HS256
- **Expiración:** 7 días (configurable via JWT_EXPIRES_IN)
- **Secret:** Variable de entorno JWT_SECRET (fallback a default en desarrollo)
- **Payload incluye:** id, email, nombre del usuario
- **Validación:** Verificación de firma y expiración en cada request

### 3.7 Integración con Gastos
**Impacto en el sistema de gastos:**
- **Futura implementación:** Filtrado de gastos por usuario
- **Preparación:** Tabla `gastos` tiene estructura para agregar `usuario_id`
- **Rutas protegidas:** Endpoints de gastos requerirán autenticación
- **Aislamiento de datos:** Cada usuario verá solo sus propios gastos

---

## 4. Consideraciones Generales

- **Origen de los gastos:**  
  Cada gasto real en `gastos` debe tener:  
  - `tipo_origen`: ("gasto_unico", "recurrente", "debito", "compra").  
  - `id_origen`: referencia al registro en su tabla origen.

- **Moneda (ARS/USD):**  
  Pendiente definir estrategia:  
  - Opción 1: almacenar ambos campos (`monto_ars`, `monto_usd`) y calcular uno en base al otro con la cotización actual.  
  - Opción 2: almacenar solo la moneda original y calcular conversiones en consultas.  
  (Revisar impacto en históricos por inflación/devaluación).

---
