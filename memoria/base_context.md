# Contexto Base - App Gestión de Gastos

## Schema de Base de Datos
📘 Modelo de Datos – Gestión de Gastos
Contexto General

El sistema busca representar diferentes tipos de gastos (compras, gastos únicos, recurrentes, débitos automáticos), para luego consolidarlos en una tabla central de gastos reales (gastos).
Esto permite proyectar, controlar y analizar la información financiera de los usuarios.

Nota: todas las tablas cuentan con los campos created_at y updated_at para control de auditoría.

# Usuarios
Table usuarios {
  id int [pk, increment]
  nombre varchar
  email varchar [unique]
  password_hash varchar
}

Representa al usuario dueño de los gastos.

Podría relacionarse en el futuro con tarjetas (tarjetas.usuario_id).

# Compras
Table compras {
  id int [pk, increment]
  usuario_id int [ref: > usuarios.id]
  descripcion varchar
  monto_total decimal(10,2)
  cantidad_cuotas int
  fecha_compra date
  categoria_gasto_id int [ref: > categorias_gasto.id]
  importancia_gasto_id int [ref: > importancias_gasto.id]
  tipo_pago_id int [ref: > tipos_pago.id]
  tarjeta_id int [ref: > tarjetas.id, null]
  pendiente_cuotas bool
}
*falta ver como manejar el tema del monto en usd. Si agregar otro campo ‘monto_usd’ y que el usuario ingrese uno u otro ( y el incompleto se calcule y se guarde segun el valor actual ) O si hay otra forma mas conveniente de manejarlo

Concepto: gasto que se paga en varias cuotas. ( o 1 cuota pero en el dia de pago - en el dia de pago se genera el gasto en la fecha de compra o en el dia de vencimiento de la tarjeta si se pagara con tarjeta de credito) -- falta agregar esta logica o revisar si es mejor que la entidad se refiera solo a compras usando tarjeta de credito o efectivo/transferencia en cuotas --

Uso en gastos: cada cuota se genera como un registro en la tabla gastos.

Pendiente:

Manejo de moneda extranjera (ARS/USD). Opciones:

Guardar siempre monto_ars y calcular monto_usd en base al tipo de cambio.

Permitir que el usuario elija la moneda de origen y convertir automáticamente.

# Gastos Únicos
Table gastos_unicos {
  id int [pk, increment]
  usuario_id int [ref: > usuarios.id]
  descripcion varchar
  monto decimal(10,2)
  fecha date
  categoria_gasto_id int [ref: > categorias_gasto.id]
  importancia_gasto_id int [ref: > importancias_gasto.id]
  tipo_pago_id int [ref: > tipos_pago.id]
  tarjeta_id int [ref: > tarjetas.id, null]
  procesado bool (not null, def false)
}
*falta ver como manejar el tema del monto en usd. Si agregar otro campo ‘monto_usd’ y que el usuario ingrese uno u otro ( y el incompleto se calcule y se guarde segun el valor actual ) O si hay otra forma mas conveniente de manejarlo

Concepto: gasto puntual que no se repite.

Uso en gastos: al procesarse, se genera un único registro en gastos.

Pendiente: mismo problema de manejo de moneda que en compras.

# Gastos Recurrentes
Table gastos_recurrentes {
  id int [pk, increment]
  descripcion varchar
  monto decimal(10,2)
  dia_de_pago int
  mes_de_pago int [null] // Mes específico para frecuencia anual (1-12). NULL para otras frecuencias
  frecuencia_gasto_id int [ref: > frecuencias_gasto.id]
  categoria_gasto_id int [ref: > categorias_gasto.id]
  importancia_gasto_id int [ref: > importancias_gasto.id]
  tipo_pago_id int [ref: > tipos_pago.id]
  tarjeta_id int [ref: > tarjetas.id, null]
  activo bool (def true)
  ultima_fecha_generado date
}


Concepto: gastos repetitivos con patrones de frecuencia específicos (ejemplo: suscripciones mensuales, seguros anuales, membresías semanales).

Uso en gastos: el sistema genera automáticamente registros en la tabla gastos según el patrón de frecuencia definido.

Campos clave:
- dia_de_pago: Día del mes/período en que ocurre el gasto (1-31)
- mes_de_pago: Mes específico para gastos anuales (1-12). NULL para otras frecuencias
- frecuencia_gasto_id: Define el patrón temporal (semanal, mensual, anual, etc.)
- activo: Controla si el gasto debe seguir generándose automáticamente
- ultima_fecha_generado: Evita duplicados y rastrea última generación exitosa

Tipos de frecuencia soportados:
- **Semanal**: Se repite cada 7 días basado en día_de_pago como referencia del día de la semana
- **Mensual**: Se repite el mismo día cada mes (dia_de_pago)
- **Anual**: Se repite una vez al año en fecha específica (dia_de_pago + mes_de_pago)

Validaciones y reglas de negocio:
- dia_de_pago: rango 1-31 (se ajusta automáticamente para meses con menos días)
- mes_de_pago: obligatorio para frecuencia anual (1-12), NULL para otras frecuencias
- Generación transaccional: CREATE intenta generar primer gasto si corresponde
- UPDATE solo afecta futuros gastos, preserva histórico
- DELETE preserva gastos ya generados como registro histórico

Características implementadas:
- Interfaz web dinámica con campo mes_de_pago que aparece/oculta según frecuencia
- Generación automática con job diario que verifica gastos pendientes
- Soporte completo para timezone Argentina (-03:00)
- Validación exhaustiva de fechas y frecuencias
- Cobertura de tests para todos los escenarios
 

# Débitos Automáticos
Table debitos_automaticos {
  id int [pk, increment]
  descripcion varchar
  monto decimal(10,2)
  dia_de_pago int
  categoria_gasto_id int [ref: > categorias_gasto.id]
  importancia_gasto_id int [ref: > importancias_gasto.id]
  frecuencia_gasto_id int [ref: > frecuencias_gasto.id]
  tipo_pago_id int [ref: > tipos_pago.id]
  tarjeta_id int [ref: > tarjetas.id, null]
  activo bool (def true)
}


Concepto: débitos fijos en tarjeta o cuenta bancaria.

Se diferencia de un recurrente en que:

Está asociado a un medio de pago específico (ej: tarjeta).

Generalmente no se "procesa" manualmente, sino que se da por descontado. en la logica de generacion de gasto se genera el gasto en el dia de pago.

# Gastos (Consolidación)
Table gastos {
  id int [pk, increment]
  fecha date
  monto_ars numeric
  monto_usd numeric
  descripcion text
  categoria_gasto_id int [ref: > categorias_gasto.id]
  importancia_gasto_id int [ref: > importancias_gasto.id]
  frecuencia_gasto_id int [ref: > frecuencias_gasto.id]
  cantidad_cuota_totales int
  cantidad_cuotas_pagadas int
  tipo_pago_id int [ref: > tipos_pago.id]
  tarjeta_id int [ref: > tarjetas.id, null]
  usuario_id int [ref: > usuarios.id]
  tipo_origen varchar // "compra", "gasto_unico", "recurrente", "debito"
  id_origen int // referencia lógica a la entidad de origen
}
*faltaría revisar la logica de relacion con la entidad origen(id_origen / tipo_origen)

Es la tabla central donde se almacenan los gastos reales (provenientes de cualquier entidad origen).

tipo_origen + id_origen permiten rastrear el origen del gasto (ej: compra en cuotas, gasto único, etc.). ? revisar

Soporta multimoneda con monto_ars y monto_usd. * todavia no se implemento la parte de usd. Solo pesos por ahora son mandadas desde las entidades de origen

# Tarjetas
Table tarjetas {
  id int [pk, increment]
  nombre varchar
  tipo varchar
  banco varchar
  dia_mes_cierre int
  dia_mes_vencimiento int
  permite_cuotas bool (def false)
}
Representa tarjetas de crédito/débito.

Campos relevantes:

dia_mes_cierre: útil para proyección de resúmenes.

dia_mes_vencimiento: útil para calendarizar pagos.

# Catálogos de apoyo
Table categorias_gasto {
  id int [pk, increment]
  nombre_categoria varchar
}

Table importancias_gasto {
  id int [pk, increment]
  nombre_importancia varchar
}

Table tipos_pago {
  id int [pk, increment]
  nombre varchar
  permite_cuotas bool (def false)
}
*permite_cuotas revisar si es mejor remover este campo, porque ya sea efectivo, debito o crédito van a permitir cuotas en general. No se que sentido tiene tener este campo

Table frecuencias_gasto {
  id int [pk, increment]
  nombre_frecuencia varchar
}


Son tablas de configuración, para dar flexibilidad y evitar valores “hardcodeados”.

⚠️ Dudas Pendientes

Multimoneda (ARS / USD):

¿Se deben guardar ambos montos siempre?

¿Se guarda el tipo de cambio usado en la transacción? (sugerido: sí, para trazabilidad).

Relación gastos ↔ entidades origen:

Hoy se maneja con tipo_origen y id_origen.

Alternativa: unificar con herencia de tablas o polymorphic association más explícita.

Relación tarjetas ↔ usuarios:

No está implementada pero sería útil si cada usuario tiene varias tarjetas.

Campo permite_cuotas en tipos_pago:

Revisar si realmente agrega valor o si basta con manejarlo en tarjetas.

¿Querés que te prepare ahora un set de reglas de negocio / casos de uso directamente mapeados a estas tablas (por ejemplo: "Generación de gasto real a partir de una compra en cuotas", "Proyección de recurrentes", etc.) para que quede como documentación funcional además del modelo de datos?

## Arquitectura General
- **Flujo Principal:** Múltiples fuentes → Tabla consolidada `gastos`
- **Tipos de Origen:** compras, gastos_unicos, recurrentes, debitos_automaticos
- **Multimoneda:** ARS/USD (pendiente implementación completa)

## Entidades Core
### Consolidación
- `gastos`: Tabla central con tipo_origen + id_origen
- Campos clave: monto_ars, monto_usd, fecha, descripcion

### Fuentes de Gastos
- `compras`: Cuotas → múltiples registros en gastos (sistema de cuotas)
- `gastos_unicos`: 1:1 con gastos al procesarse (transaccional con flag procesado)
- `gastos_recurrentes`: Generación automática con patrones de frecuencia avanzados
  - Semanal/Mensual/Anual con soporte para mes_de_pago específico
  - Job diario verifica y genera gastos pendientes
  - Preservación de histórico en cambios
- `debitos_automaticos`: Descuentos automáticos programados

## Reglas de Negocio Críticas
1. **Trazabilidad:** Siempre mantener origen (tipo_origen + id_origen)
2. **Procesamiento:** Gastos únicos requieren flag `procesado`
3. **Recurrencia:** `ultima_fecha_generado` previene duplicados
4. **Cuotas:** `pendiente_cuotas` controla generación automática
5. **Transaccionalidad:** Operaciones CRUD usan transacciones para consistencia
6. **Frecuencias:** Sistema avanzado soporta semanal/mensual/anual con mes_de_pago
7. **Preservación histórica:** UPDATE/DELETE mantienen gastos ya generados

## Pendientes Identificados
- [ ] Implementación completa multimoneda
- [ ] Relación tarjetas ↔ usuarios  
- [ ] Decisión sobre permite_cuotas (tipos_pago vs tarjetas)
- [ ] Aplicar mismas mejoras de gastos_recurrentes a debitos_automaticos
- [ ] Implementar sistema de cuotas mejorado para compras

## Mejoras Completadas (2025-09-08)
- [x] **Sistema de gastos recurrentes mejorado**:
  - Campo mes_de_pago para frecuencia anual 
  - CRUD transaccional con preservación histórica
  - Generación automática con lógica de frecuencias avanzada
  - Interfaz web dinámica con validación contextual
  - Migración de base de datos y constraints
  - Cobertura de testing completa
  - Documentación actualizada


