# Backlog

Ideas y funcionalidades futuras, todavía sin priorizar ni diseñar en detalle. Los bugs conocidos están en [architecture/known-issues.md](./architecture/known-issues.md).

## Finanzas de pareja y gastos compartidos

- **Origen**: 2026-10-06, a partir del análisis de gastos reales de un usuario.
- **Estado**: idea, sin diseño.

**Problema**

La app es de un solo usuario: cada gasto pertenece a un `usuario_id` y no existe el concepto de gasto compartido. Hoy el reintegro de la pareja se carga como ingreso de la fuente "Otro" (ej. "Parte del super"), lo que infla ingresos y gastos y no refleja cuánto cuesta realmente cada gasto para el usuario.

**Qué se quiere poder hacer**

- Marcar un gasto como compartido y registrar la parte propia y la de la pareja, por porcentaje o por monto.
- Ver el gasto propio real (solo "mi parte") y el gasto total del hogar, por categoría y por mes.
- Llevar un saldo entre los dos (quién pagó de más y quién le debe a quién) y poder registrar la liquidación.
- Proyectar y definir metas de ahorro individuales y en conjunto, y comparar escenarios (ej. cambiar el reparto o bajar una categoría).

**Preguntas abiertas**

- ¿Los dos usan la app, cada uno con su usuario, o solo uno y la pareja es un dato dentro de su cuenta?
- Reglas de reparto: 50/50, proporcional al ingreso o configurable por categoría.
- Qué ve cada persona (privacidad): ¿solo los gastos compartidos o todo?
- Gastos recurrentes y débitos automáticos compartidos: ¿se parte cada mes de forma automática?
- Multi-moneda: ¿el saldo entre ambos se lleva en ARS, en USD o en ambas?

**Primer paso sugerido**

Un campo opcional en el gasto (por ejemplo `porcentaje_propio` o `monto_propio`) más un tipo de ingreso o crédito que no cuente como ingreso real, antes de modelar usuarios vinculados o grupos de hogar.

**Relacionado**

- Los reportes (`/gastos/summary`, `/balance/evolucion`, `/proyeccion`) tendrían que distinguir "mi parte" del total.
