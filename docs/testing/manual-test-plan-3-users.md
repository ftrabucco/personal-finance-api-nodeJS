# Plan de Pruebas Manual — 3 Usuarios

## Base URL
Reemplazar `{{URL}}` por la URL de tu entorno (ej: `http://localhost:3030` o tu URL de Render).

Guardar el token de cada usuario después del login:
```
TOKEN_FRAN=...
TOKEN_MARIA=...
TOKEN_CARLOS=...
```

---

## FASE 1: Autenticación y Usuarios

### 1.1 Registro de usuarios

| # | Acción | Request | Resultado esperado |
|---|--------|---------|-------------------|
| 1 | Registrar Fran | `POST /api/auth/register` `{ "nombre": "Francisco", "email": "fran@test.com", "password": "Test123" }` | 201, devuelve user sin password |
| 2 | Registrar María | `POST /api/auth/register` `{ "nombre": "María López", "email": "maria@test.com", "password": "Maria456" }` | 201 |
| 3 | Registrar Carlos | `POST /api/auth/register` `{ "nombre": "Carlos García", "email": "carlos@test.com", "password": "Carlos789" }` | 201 |
| 4 | Email duplicado | `POST /api/auth/register` `{ "nombre": "Otro", "email": "fran@test.com", "password": "Test123" }` | Error, EMAIL_ALREADY_EXISTS |
| 5 | Password débil | `POST /api/auth/register` `{ "nombre": "Test", "email": "test@test.com", "password": "123" }` | Error validación (min 6 chars, requiere mayúscula+minúscula+número) |
| 6 | Email inválido | `POST /api/auth/register` `{ "nombre": "Test", "email": "noesmail", "password": "Test123" }` | Error validación |
| 7 | Nombre muy corto | `POST /api/auth/register` `{ "nombre": "A", "email": "x@test.com", "password": "Test123" }` | Error validación (min 2 chars) |

### 1.2 Login

| # | Acción | Request | Resultado esperado |
|---|--------|---------|-------------------|
| 8 | Login Fran | `POST /api/auth/login` `{ "email": "fran@test.com", "password": "Test123" }` | 200, token JWT → guardar como TOKEN_FRAN |
| 9 | Login María | `POST /api/auth/login` `{ "email": "maria@test.com", "password": "Maria456" }` | 200, token → TOKEN_MARIA |
| 10 | Login Carlos | `POST /api/auth/login` `{ "email": "carlos@test.com", "password": "Carlos789" }` | 200, token → TOKEN_CARLOS |
| 11 | Password incorrecto | `POST /api/auth/login` `{ "email": "fran@test.com", "password": "wrong" }` | 401, INVALID_CREDENTIALS |
| 12 | Email inexistente | `POST /api/auth/login` `{ "email": "nadie@test.com", "password": "Test123" }` | 401 |

### 1.3 Perfil y gestión de cuenta

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 13 | Ver perfil | Fran | `GET /api/auth/profile` | 200, datos de Fran |
| 14 | Ver perfil | María | `GET /api/auth/profile` | 200, datos de María (no de Fran) |
| 15 | Actualizar nombre | Fran | `PUT /api/auth/profile` `{ "nombre": "Fran Trabucco" }` | 200, nombre actualizado |
| 16 | Cambiar password | Carlos | `POST /api/auth/change-password` `{ "currentPassword": "Carlos789", "newPassword": "Carlos999" }` | 200 |
| 17 | Login con nuevo pass | Carlos | `POST /api/auth/login` `{ "email": "carlos@test.com", "password": "Carlos999" }` | 200, funciona |
| 18 | Sin token | - | `GET /api/auth/profile` (sin header Authorization) | 401 |
| 19 | Token inválido | - | `GET /api/auth/profile` con `Authorization: Bearer tokenfalso` | 401 |

---

## FASE 2: Datos de Referencia (Catálogos)

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 20 | Obtener todos los catálogos | Fran | `GET /api/catalogos` | 200, objeto con categorias, importancias, tiposPago, frecuencias |
| 21 | Verificar categorías | Fran | `GET /api/catalogos/categorias` | Lista con Alquiler, Supermercado, Streaming, etc. |
| 22 | Verificar importancias | Fran | `GET /api/catalogos/importancias` | Necesario, Deseado, Prescindible |
| 23 | Verificar tipos de pago | Fran | `GET /api/catalogos/tipos-pago` | Efectivo, Débito, Crédito, Transferencia, MercadoPago, Cheque |
| 24 | Verificar frecuencias | Fran | `GET /api/catalogos/frecuencias` | Único, Diario, Semanal, Mensual, Bimestral, Trimestral, Semestral, Anual |

> **Anotar los IDs** de cada catálogo para usarlos en las pruebas siguientes. Ejemplo:
> - Categorías: Alquiler=1, Supermercado=6, Streaming=21, Transporte público=10
> - Importancias: Necesario=1, Deseado=2, Prescindible=3
> - Tipos de pago: Efectivo=1, Débito=2, Crédito=3, Transferencia=4
> - Frecuencias: Mensual=4, Anual=8

---

## FASE 3: Tarjetas

### 3.1 Crear tarjetas por usuario

| # | Acción | User | Body | Resultado esperado |
|---|--------|------|------|-------------------|
| 25 | Crear débito Fran | Fran | `{ "nombre": "Débito Galicia", "tipo": "debito", "banco": "Galicia", "ultimos_4_digitos": "4532" }` | 201, tarjeta creada |
| 26 | Crear crédito Fran | Fran | `{ "nombre": "Visa Gold", "tipo": "credito", "banco": "Galicia", "dia_mes_cierre": 15, "dia_mes_vencimiento": 5, "permite_cuotas": true, "ultimos_4_digitos": "8821" }` | 201 |
| 27 | Crear débito María | María | `{ "nombre": "Débito BBVA", "tipo": "debito", "banco": "BBVA" }` | 201 |
| 28 | Crear crédito María | María | `{ "nombre": "Mastercard BBVA", "tipo": "credito", "banco": "BBVA", "dia_mes_cierre": 10, "dia_mes_vencimiento": 28, "permite_cuotas": true }` | 201 |
| 29 | Crear crédito Carlos | Carlos | `{ "nombre": "Amex Platinum", "tipo": "credito", "banco": "Amex", "dia_mes_cierre": 20, "dia_mes_vencimiento": 10, "permite_cuotas": true }` | 201 |
| 30 | Crédito sin cierre | Fran | `{ "nombre": "Mala", "tipo": "credito", "banco": "X" }` | Error: requiere dia_mes_cierre y dia_mes_vencimiento |

### 3.2 Aislamiento de datos

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 31 | Listar tarjetas Fran | Fran | `GET /api/tarjetas` | Solo ve sus 2 tarjetas |
| 32 | Listar tarjetas María | María | `GET /api/tarjetas` | Solo ve sus 2 tarjetas |
| 33 | Listar tarjetas Carlos | Carlos | `GET /api/tarjetas` | Solo ve su 1 tarjeta |
| 34 | Stats tarjetas | Fran | `GET /api/tarjetas/stats` | Estadísticas solo de Fran |
| 35 | Ver tarjeta de otro | María | `GET /api/tarjetas/{{id_tarjeta_fran}}` | 404 (no la encuentra porque filtra por usuario) |

---

## FASE 4: Tipo de Cambio (Multi-moneda)

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 36 | Setear TC manual | Fran | `POST /api/tipo-cambio/manual` `{ "valor_venta_usd_ars": 1200, "valor_compra_usd_ars": 1180 }` | 201, TC creado para hoy |
| 37 | Obtener TC actual | María | `GET /api/tipo-cambio/actual` | 200, devuelve el TC seteado |
| 38 | Actualizar desde API | Fran | `POST /api/tipo-cambio/actualizar` `{ "fuente": "auto" }` | 200 o 503 (depende si la API responde) |
| 39 | Convertir ARS→USD | Fran | `POST /api/tipo-cambio/convertir` `{ "monto": 120000, "moneda_origen": "ARS" }` | 200, muestra monto_ars, monto_usd, tipo_cambio_usado |
| 40 | Convertir USD→ARS | María | `POST /api/tipo-cambio/convertir` `{ "monto": 100, "moneda_origen": "USD" }` | 200, conversión correcta |
| 41 | TC histórico | Fran | `GET /api/tipo-cambio/historico` | 200, lista de TCs registrados |
| 42 | Monto inválido | Fran | `POST /api/tipo-cambio/convertir` `{ "monto": -50, "moneda_origen": "ARS" }` | Error validación |
| 43 | Moneda inválida | Fran | `POST /api/tipo-cambio/convertir` `{ "monto": 100, "moneda_origen": "EUR" }` | Error validación |

---

## FASE 5: Gastos Únicos

### 5.1 Crear en ARS

| # | Acción | User | Body (`POST /api/gastos-unicos`) | Resultado esperado |
|---|--------|------|------|-------------------|
| 44 | Supermercado Fran | Fran | `{ "descripcion": "Compra semanal Coto", "monto": 45000, "fecha": "2026-01-28", "categoria_gasto_id": 6, "importancia_gasto_id": 1, "tipo_pago_id": 2, "moneda_origen": "ARS" }` | 201, monto_ars=45000, monto_usd calculado |
| 45 | Farmacia María | María | `{ "descripcion": "Ibuprofeno y vitaminas", "monto": 12000, "fecha": "2026-01-27", "categoria_gasto_id": 14, "importancia_gasto_id": 1, "tipo_pago_id": 1, "moneda_origen": "ARS" }` | 201 |
| 46 | Uber Carlos | Carlos | `{ "descripcion": "Uber al trabajo", "monto": 5500, "fecha": "2026-01-30", "categoria_gasto_id": 12, "importancia_gasto_id": 3, "tipo_pago_id": 4, "moneda_origen": "ARS" }` | 201 |

### 5.2 Crear en USD

| # | Acción | User | Body | Resultado esperado |
|---|--------|------|------|-------------------|
| 47 | Compra Amazon Fran | Fran | `{ "descripcion": "Libro Amazon", "monto": 25, "fecha": "2026-01-25", "categoria_gasto_id": 22, "importancia_gasto_id": 3, "tipo_pago_id": 3, "tarjeta_id": {{visa_fran}}, "moneda_origen": "USD" }` | 201, monto_usd=25, monto_ars calculado con TC |

### 5.3 Validaciones

| # | Acción | User | Body | Resultado esperado |
|---|--------|------|------|-------------------|
| 48 | Sin descripción | Fran | `{ "monto": 1000, "fecha": "2026-01-28", "categoria_gasto_id": 6, "importancia_gasto_id": 1, "tipo_pago_id": 1 }` | Error: descripción requerida |
| 49 | Monto negativo | Fran | `{ "descripcion": "Test", "monto": -500, "fecha": "2026-01-28", "categoria_gasto_id": 6, "importancia_gasto_id": 1, "tipo_pago_id": 1 }` | Error: monto debe ser positivo |
| 50 | Fecha futura | Fran | `{ "descripcion": "Test", "monto": 100, "fecha": "2027-01-01", "categoria_gasto_id": 6, "importancia_gasto_id": 1, "tipo_pago_id": 1 }` | Error: fecha no puede ser futura |
| 51 | Categoría inexistente | Fran | `{ "descripcion": "Test", "monto": 100, "fecha": "2026-01-28", "categoria_gasto_id": 999, "importancia_gasto_id": 1, "tipo_pago_id": 1 }` | Error: categoría no encontrada |
| 52 | Descripción corta | Fran | `{ "descripcion": "Ab", "monto": 100, "fecha": "2026-01-28", "categoria_gasto_id": 6, "importancia_gasto_id": 1, "tipo_pago_id": 1 }` | Error: min 3 caracteres |

### 5.4 Verificar que crea Gasto asociado

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 53 | Listar gastos Fran | Fran | `GET /api/gastos` | Contiene los gastos generados por sus gastos únicos |
| 54 | Listar gastos María | María | `GET /api/gastos` | Solo gastos de María |
| 55 | Listar gastos Carlos | Carlos | `GET /api/gastos` | Solo gastos de Carlos |

### 5.5 Update y Delete

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 56 | Actualizar monto | Fran | `PUT /api/gastos-unicos/{{id}}` `{ "monto": 50000 }` | 200, actualiza GastoUnico Y Gasto asociado |
| 57 | Verificar update en gastos | Fran | `GET /api/gastos` | El gasto asociado también tiene el monto actualizado |
| 58 | Eliminar gasto único | Fran | `DELETE /api/gastos-unicos/{{id_farmacia_fran}}` (crear uno extra primero) | 200, elimina GastoUnico Y Gasto asociado |
| 59 | Verificar delete en gastos | Fran | `GET /api/gastos` | El gasto asociado ya no existe |

---

## FASE 6: Gastos Recurrentes

### 6.1 Crear recurrentes

| # | Acción | User | Body (`POST /api/gastos-recurrentes`) | Resultado esperado |
|---|--------|------|------|-------------------|
| 60 | Alquiler Fran (mensual) | Fran | `{ "descripcion": "Alquiler depto Palermo", "monto": 350000, "dia_de_pago": 5, "categoria_gasto_id": 1, "importancia_gasto_id": 1, "tipo_pago_id": 4, "frecuencia_gasto_id": 4, "moneda_origen": "ARS" }` | 201, NO genera gasto inmediato |
| 61 | Gimnasio María (mensual) | María | `{ "descripcion": "Gimnasio Megatlon", "monto": 25000, "dia_de_pago": 10, "categoria_gasto_id": 19, "importancia_gasto_id": 3, "tipo_pago_id": 2, "frecuencia_gasto_id": 4, "moneda_origen": "ARS" }` | 201 |
| 62 | Seguro auto Carlos (mensual) | Carlos | `{ "descripcion": "Seguro auto La Caja", "monto": 45000, "dia_de_pago": 15, "categoria_gasto_id": 25, "importancia_gasto_id": 1, "tipo_pago_id": 2, "frecuencia_gasto_id": 4, "moneda_origen": "ARS" }` | 201 |
| 63 | OSDE Fran (mensual, USD) | Fran | `{ "descripcion": "OSDE 310", "monto": 150, "dia_de_pago": 1, "categoria_gasto_id": 16, "importancia_gasto_id": 1, "tipo_pago_id": 2, "frecuencia_gasto_id": 4, "moneda_origen": "USD" }` | 201, monto_usd=150, monto_ars calculado |
| 64 | Patente (semestral) | Carlos | `{ "descripcion": "Patente auto", "monto": 85000, "dia_de_pago": 20, "mes_de_pago": 3, "categoria_gasto_id": 26, "importancia_gasto_id": 1, "tipo_pago_id": 4, "frecuencia_gasto_id": 7, "moneda_origen": "ARS" }` | 201 |

### 6.2 Verificar que NO genera gasto inmediato

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 65 | Gastos Fran antes de generar | Fran | `GET /api/gastos` | NO contiene gastos del alquiler ni OSDE (solo los únicos) |

### 6.3 Generar gastos pendientes

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 66 | Generar gastos Fran | Fran | `GET /api/gastos/generate` | Genera gastos de recurrentes que estén listos |
| 67 | Generar gastos María | María | `GET /api/gastos/generate` | Genera gastos de María |
| 68 | Generar gastos Carlos | Carlos | `GET /api/gastos/generate` | Genera gastos de Carlos |
| 69 | Verificar gastos generados | Fran | `GET /api/gastos` | Ahora debería incluir gastos generados por recurrentes |

### 6.4 Update y aislamiento

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 70 | Actualizar monto recurrente | Fran | `PUT /api/gastos-recurrentes/{{id_alquiler}}` `{ "monto": 380000 }` | 200, recurrente actualizado |
| 71 | Verificar gastos previos | Fran | `GET /api/gastos` | Gastos ya generados siguen con 350000 (historial preservado) |
| 72 | Desactivar recurrente | María | `PUT /api/gastos-recurrentes/{{id_gimnasio}}` `{ "activo": false }` | 200 |
| 73 | Generar post-desactivar | María | `GET /api/gastos/generate` | NO genera nuevo gasto del gimnasio |
| 74 | Recurrente de otro usuario | María | `GET /api/gastos-recurrentes/{{id_alquiler_fran}}` | 404 |

---

## FASE 7: Débitos Automáticos

### 7.1 Crear débitos

| # | Acción | User | Body (`POST /api/debitos-automaticos`) | Resultado esperado |
|---|--------|------|------|-------------------|
| 75 | Netflix Fran | Fran | `{ "descripcion": "Netflix Premium", "monto": 12000, "dia_de_pago": 15, "categoria_gasto_id": 21, "importancia_gasto_id": 3, "tipo_pago_id": 3, "tarjeta_id": {{visa_fran}}, "frecuencia_gasto_id": 4, "moneda_origen": "ARS" }` | 201 |
| 76 | Spotify María | María | `{ "descripcion": "Spotify Familiar", "monto": 5000, "dia_de_pago": 20, "categoria_gasto_id": 21, "importancia_gasto_id": 4, "tipo_pago_id": 3, "tarjeta_id": {{mc_maria}}, "frecuencia_gasto_id": 4, "moneda_origen": "ARS" }` | 201 |
| 77 | ChatGPT Carlos (USD) | Carlos | `{ "descripcion": "ChatGPT Plus", "monto": 20, "dia_de_pago": 5, "categoria_gasto_id": 21, "importancia_gasto_id": 3, "tipo_pago_id": 3, "tarjeta_id": {{amex_carlos}}, "frecuencia_gasto_id": 4, "moneda_origen": "USD" }` | 201, monto_usd=20, monto_ars calculado |
| 78 | Disney+ con fecha_fin | Fran | `{ "descripcion": "Disney+ Anual", "monto": 8000, "dia_de_pago": 1, "categoria_gasto_id": 21, "importancia_gasto_id": 4, "tipo_pago_id": 3, "tarjeta_id": {{visa_fran}}, "frecuencia_gasto_id": 4, "fecha_fin": "2026-06-30", "moneda_origen": "ARS" }` | 201, con fecha_fin |

### 7.2 Generar y verificar

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 79 | Generar Fran | Fran | `GET /api/gastos/generate` | Genera gastos de Netflix y Disney+ |
| 80 | Generar Carlos | Carlos | `GET /api/gastos/generate` | Genera gasto ChatGPT |
| 81 | Verificar tarjeta en gasto | Fran | `GET /api/gastos` (filtrar por tarjeta) | Los gastos de Netflix/Disney tienen tarjeta_id de Visa Gold |

---

## FASE 8: Compras en Cuotas

### 8.1 Crear compras

| # | Acción | User | Body (`POST /api/compras`) | Resultado esperado |
|---|--------|------|------|-------------------|
| 82 | TV Samsung Fran (12 cuotas) | Fran | `{ "descripcion": "Smart TV Samsung 55\"", "monto_total": 800000, "fecha_compra": "2026-01-15", "cantidad_cuotas": 12, "categoria_gasto_id": 5, "importancia_gasto_id": 3, "tipo_pago_id": 3, "tarjeta_id": {{visa_fran}}, "moneda_origen": "ARS" }` | 201, monto_total_ars=800000 |
| 83 | MacBook María (18 cuotas, USD) | María | `{ "descripcion": "MacBook Air M3", "monto_total": 1200, "fecha_compra": "2026-01-20", "cantidad_cuotas": 18, "categoria_gasto_id": 22, "importancia_gasto_id": 2, "tipo_pago_id": 3, "tarjeta_id": {{mc_maria}}, "moneda_origen": "USD" }` | 201, monto_total_usd=1200, monto_total_ars calculado |
| 84 | Zapatillas Carlos (3 cuotas) | Carlos | `{ "descripcion": "Nike Air Max", "monto_total": 180000, "fecha_compra": "2026-01-25", "cantidad_cuotas": 3, "categoria_gasto_id": 18, "importancia_gasto_id": 4, "tipo_pago_id": 3, "tarjeta_id": {{amex_carlos}}, "moneda_origen": "ARS" }` | 201 |
| 85 | Compra 1 cuota (inmediata) | Fran | `{ "descripcion": "Cargador USB-C", "monto_total": 15000, "fecha_compra": "2026-01-28", "cantidad_cuotas": 1, "categoria_gasto_id": 23, "importancia_gasto_id": 4, "tipo_pago_id": 3, "tarjeta_id": {{visa_fran}}, "moneda_origen": "ARS" }` | 201, genera gasto inmediato |

### 8.2 Verificar generación de cuotas

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 86 | Generar cuotas Fran | Fran | `GET /api/gastos/generate` | Genera cuotas de la TV (según fecha de cierre tarjeta) |
| 87 | Generar cuotas María | María | `GET /api/gastos/generate` | Genera cuotas de MacBook |
| 88 | Verificar cargador inmediato | Fran | `GET /api/gastos` | El cargador (1 cuota) ya aparece como gasto |
| 89 | Verificar cuotas en gastos | Fran | `GET /api/gastos?tipo_origen=compra` | Gastos muestran cantidad_cuotas_totales y cantidad_cuotas_pagadas |

### 8.3 Validaciones compra

| # | Acción | User | Body | Resultado esperado |
|---|--------|------|------|-------------------|
| 90 | Cuotas > 60 | Fran | `{ "descripcion": "Test", "monto_total": 100, "fecha_compra": "2026-01-28", "cantidad_cuotas": 61, ... }` | Error: max 60 cuotas |
| 91 | Monto 0 | Fran | `{ "descripcion": "Test", "monto_total": 0, ... }` | Error: monto debe ser positivo |

---

## FASE 9: Filtros y Búsqueda

### 9.1 Filtros de gastos

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 92 | Filtrar por categoría | Fran | `GET /api/gastos?categoria_gasto_id=21` | Solo gastos de Streaming |
| 93 | Filtrar por fecha | Fran | `GET /api/gastos?fecha_desde=2026-01-01&fecha_hasta=2026-01-31` | Solo gastos de enero |
| 94 | Filtrar por monto ARS | Fran | `GET /api/gastos?monto_min_ars=10000&monto_max_ars=50000` | Gastos en rango |
| 95 | Filtrar por tipo pago | María | `GET /api/gastos?tipo_pago_id=3` | Solo gastos con crédito |
| 96 | Filtrar por tarjeta | Fran | `GET /api/gastos?tarjeta_id={{visa_fran}}` | Solo gastos de Visa Gold |
| 97 | Paginación | Fran | `GET /api/gastos?limit=2&offset=0` | 2 resultados, pagination.hasNext=true |
| 98 | Página siguiente | Fran | `GET /api/gastos?limit=2&offset=2` | Siguientes 2 resultados |
| 99 | Ordenar por monto | Fran | `GET /api/gastos?orderBy=monto&orderDirection=DESC` | Mayor monto primero |

### 9.2 Summary

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 100 | Resumen enero | Fran | `GET /api/gastos/summary?fecha_desde=2026-01-01&fecha_hasta=2026-01-31` | Total ARS, total USD, breakdown por categoría/importancia/tipo_pago |
| 101 | Resumen María | María | `GET /api/gastos/summary` | Solo datos de María |
| 102 | Resumen sin gastos | Carlos | `GET /api/gastos/summary?fecha_desde=2020-01-01&fecha_hasta=2020-01-31` | Totales en 0 |

### 9.3 Búsqueda avanzada

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 103 | Buscar por múltiples filtros | Fran | `POST /api/gastos/search` `{ "categoria_gasto_id": 21, "fecha_desde": "2026-01-01", "limit": 10, "offset": 0 }` | Gastos de streaming en enero |

### 9.4 Filtros en otros endpoints

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 104 | Recurrentes activos | Fran | `GET /api/gastos-recurrentes?activo=true` | Solo recurrentes activos |
| 105 | Recurrentes inactivos | María | `GET /api/gastos-recurrentes?activo=false` | Solo el gimnasio desactivado |
| 106 | Compras con cuotas pendientes | Fran | `GET /api/compras?pendiente_cuotas=true` | Compras que todavía tienen cuotas |
| 107 | Gastos únicos procesados | Fran | `GET /api/gastos-unicos?procesado=true` | Solo los ya convertidos a gasto |
| 108 | Débitos por categoría | Fran | `GET /api/debitos-automaticos?categoria_gasto_id=21` | Solo streaming |

---

## FASE 10: Aislamiento entre Usuarios (Seguridad)

**Objetivo**: Verificar que ningún usuario puede ver/modificar datos de otro.

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 109 | Ver gasto de Fran | María | `GET /api/gastos/{{id_gasto_fran}}` | 404 |
| 110 | Ver compra de María | Carlos | `GET /api/compras/{{id_compra_maria}}` | 404 |
| 111 | Editar recurrente de Carlos | Fran | `PUT /api/gastos-recurrentes/{{id_rec_carlos}}` `{ "monto": 1 }` | 404 |
| 112 | Eliminar débito de Fran | María | `DELETE /api/debitos-automaticos/{{id_debito_fran}}` | 404 |
| 113 | Ver gasto único de María | Carlos | `GET /api/gastos-unicos/{{id_unico_maria}}` | 404 |
| 114 | Eliminar tarjeta de Carlos | Fran | `DELETE /api/tarjetas/{{id_tarjeta_carlos}}` | 404 |

---

## FASE 11: Tarjeta en uso (protección de borrado)

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 115 | Ver uso de tarjeta | Fran | `GET /api/tarjetas/{{visa_fran}}/usage` | Muestra gastos/compras asociados |
| 116 | Borrar tarjeta en uso | Fran | `DELETE /api/tarjetas/{{visa_fran}}` | Error: tarjeta tiene gastos/compras asociados |
| 117 | Borrar tarjeta sin uso | Fran | Crear tarjeta nueva → `DELETE /api/tarjetas/{{nueva_id}}` | 200, borrada correctamente |

---

## FASE 12: Multi-moneda (Verificación end-to-end)

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 118 | Crear gasto en USD | Fran | `POST /api/gastos-unicos` con moneda_origen=USD, monto=50 | monto_usd=50, monto_ars=50*TC_compra |
| 119 | Crear gasto en ARS | Fran | `POST /api/gastos-unicos` con moneda_origen=ARS, monto=60000 | monto_ars=60000, monto_usd=60000/TC_venta |
| 120 | Verificar TC snapshot | Fran | Comparar tipo_cambio_usado del gasto con TC actual | Debe coincidir con el TC vigente al momento de creación |
| 121 | Cambiar TC y crear otro | Fran | `POST /api/tipo-cambio/manual` nuevo TC → crear gasto | Nuevo gasto usa nuevo TC, anteriores mantienen su TC original |
| 122 | Update recurrente USD→ARS | Fran | `PUT /api/gastos-recurrentes/{{osde}}` `{ "moneda_origen": "ARS", "monto": 200000 }` | Recalcula monto_ars y monto_usd |
| 123 | Update solo monto | Fran | `PUT /api/gastos-recurrentes/{{osde}}` `{ "monto": 250000 }` | Recalcula ambos montos con moneda actual |
| 124 | Summary con ambas monedas | Fran | `GET /api/gastos/summary` | Muestra totales en ARS y USD |

---

## FASE 13: Generación Automática — Segundo Ciclo (1 mes después)

> **IMPORTANTE**: Esta fase se ejecuta ~1 mes después de las fases 6-8.
> Esperar a que pase la fecha de pago del siguiente ciclo, o simularla
> manualmente si el sistema lo permite. Después llamar a `GET /api/gastos/generate`.
>
> **Prerequisitos**: Haber ejecutado las fases 6, 7 y 8 un mes antes.
> Los recurrentes y débitos deben tener `ultima_fecha_generado` del mes anterior.

### 13.1 Generar segundo ciclo

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 125 | Generar 2do ciclo Fran | Fran | `GET /api/gastos/generate` | Genera nuevos gastos de: Alquiler, OSDE, Netflix, Disney+ |
| 126 | Generar 2do ciclo María | María | `GET /api/gastos/generate` | Genera gasto de Spotify. NO genera Gimnasio (desactivado en test 72) |
| 127 | Generar 2do ciclo Carlos | Carlos | `GET /api/gastos/generate` | Genera gastos de: Seguro auto, ChatGPT. NO genera Patente (semestral, no toca) |

### 13.2 Verificar gastos recurrentes — segundo mes

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 128 | Contar gastos Alquiler | Fran | `GET /api/gastos?tipo_origen=gasto_recurrente` | Ahora hay 2 gastos de Alquiler (uno por mes) |
| 129 | Verificar montos intactos | Fran | Revisar los 2 gastos de Alquiler | 1er mes: $350.000 (monto original), 2do mes: $380.000 (monto actualizado en test 70) |
| 130 | Verificar fechas distintas | Fran | Revisar campo `fecha` de ambos gastos | Cada gasto tiene fecha del mes correspondiente (día 5) |
| 131 | Gimnasio NO generó | María | `GET /api/gastos` filtrar por recurrente de gimnasio | Solo 1 gasto del primer mes, no hay segundo |
| 132 | OSDE en USD — segundo mes | Fran | Revisar gasto OSDE del 2do mes | monto_usd=150 (o actualizado), monto_ars recalculado con TC del momento |

### 13.3 Verificar débitos automáticos — segundo mes

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 133 | Netflix 2do mes | Fran | `GET /api/gastos?tipo_origen=debito_automatico` | 2 gastos de Netflix, con tarjeta Visa Gold |
| 134 | Disney+ vigente | Fran | Revisar gasto Disney+ | Generó porque estamos antes de fecha_fin (2026-06-30) |
| 135 | ChatGPT USD 2do mes | Carlos | Revisar gasto ChatGPT del 2do mes | monto_usd=20, monto_ars recalculado con TC actual |
| 136 | Spotify 2do mes | María | Revisar gasto Spotify del 2do mes | Generó correctamente (Spotify sigue activo) |

### 13.4 Verificar compras en cuotas — segunda cuota

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 137 | TV Samsung cuota 2 | Fran | `GET /api/gastos?tipo_origen=compra` filtrar por TV | 2 gastos: cuota 1/12 y cuota 2/12 |
| 138 | Monto por cuota correcto | Fran | Revisar monto de cada cuota TV | ~$66.667 por cuota (800.000/12) |
| 139 | MacBook cuota 2 USD | María | Revisar cuotas MacBook | 2 cuotas, cada una ~$66.67 USD (1200/18) |
| 140 | Nike cuota 2 de 3 | Carlos | Revisar cuotas Nike | 2 de 3 cuotas, ~$60.000 cada una (180.000/3) |
| 141 | Cargador NO genera más | Fran | Revisar gastos del cargador | Solo 1 gasto (fue compra de 1 cuota, ya terminó) |

### 13.5 Verificar no-duplicación

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 142 | Generar de nuevo | Fran | `GET /api/gastos/generate` (inmediatamente después) | NO genera duplicados, respuesta indica 0 gastos nuevos |
| 143 | Contar gastos totales | Fran | `GET /api/gastos` | Mismo total que después de test 125 |

### 13.6 Summary con 2 meses de datos

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 144 | Summary mes 1 | Fran | `GET /api/gastos/summary?fecha_desde=2026-01-01&fecha_hasta=2026-01-31` | Totales solo de enero |
| 145 | Summary mes 2 | Fran | `GET /api/gastos/summary?fecha_desde=2026-02-01&fecha_hasta=2026-02-28` | Totales solo de febrero (montos nuevos) |
| 146 | Summary ambos meses | Fran | `GET /api/gastos/summary?fecha_desde=2026-01-01&fecha_hasta=2026-02-28` | Total acumulado 2 meses |

---

## FASE 14: Logout y limpieza

| # | Acción | User | Request | Resultado esperado |
|---|--------|------|---------|-------------------|
| 147 | Logout Fran | Fran | `POST /api/auth/logout` | 200 |
| 148 | Usar token post-logout | Fran | `GET /api/gastos` con TOKEN_FRAN | Depende de implementación (JWT es stateless, puede seguir funcionando) |
| 149 | Logout María | María | `POST /api/auth/logout` | 200 |
| 150 | Logout Carlos | Carlos | `POST /api/auth/logout` | 200 |

---

## Resumen de cobertura

| Feature | Tests |
|---------|-------|
| Auth (register/login/profile/password/logout) | 1-19, 147-150 |
| Catálogos | 20-24 |
| Tarjetas (CRUD + aislamiento + protección) | 25-35, 115-117 |
| Tipo de Cambio (manual/API/conversión/histórico) | 36-43 |
| Gastos Únicos (CRUD + validaciones + gasto asociado) | 44-59 |
| Gastos Recurrentes (CRUD + generación + desactivar) | 60-74 |
| Débitos Automáticos (CRUD + fecha_fin + generación) | 75-81 |
| Compras en Cuotas (CRUD + cuotas + inmediata) | 82-91 |
| Filtros, paginación y búsqueda | 92-108 |
| Aislamiento entre usuarios | 109-114 |
| Multi-moneda end-to-end | 118-124 |
| Generación automática — segundo ciclo | 125-146 |
| Logout | 147-150 |

**Total: 150 pruebas manuales**
