# Manual Test Plan - Personal Finance API

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `sheets/01_test_cases.csv` | 150 test cases organizados por feature |
| `sheets/02_test_executions.csv` | Template pre-llenado para registrar ejecuciones |
| `sheets/03_test_dependencies.csv` | Dependencias entre tests (200 relaciones) |
| `sheets/04_test_users.csv` | Usuarios de prueba con credenciales |
| `manual-test-plan-3-users.md` | Plan original en formato narrativo (referencia) |

## Importar a Google Sheets

1. Crear un nuevo Google Sheet
2. Para cada CSV: **File > Import > Upload** > seleccionar el archivo
   - En "Import location" elegir **Insert new sheet(s)**
   - Separator type: **Comma**
3. Renombrar las hojas:
   - `01_test_cases` → **Test Cases**
   - `02_test_executions` → **Executions**
   - `03_test_dependencies` → **Dependencies**
   - `04_test_users` → **Users**

### Formato recomendado

**En todas las hojas:**
- Congelar fila 1: View > Freeze > 1 row
- Bold en fila 1 (header)

**En Test Cases:**
- Filtros: Data > Create a filter (permite filtrar por feature, type, priority, user)
- Ancho sugerido: test_id (90px), feature (120px), title (200px), steps y expected_result (300px)

**En Executions:**
- Formato condicional en columna `status`:
  - `pass` → fondo verde
  - `fail` → fondo rojo
  - `blocked` → fondo amarillo
  - `skipped` → fondo gris
- Para aplicar: Format > Conditional formatting > Add rule > "Text is exactly" para cada valor

**En Dependencies:**
- Filtros para buscar por test_id o dependency_type

## Test IDs - Prefijos

| Prefijo | Feature | Cantidad |
|---------|---------|----------|
| AUTH | Autenticacion | 19 |
| CAT | Catalogos | 5 |
| CARD | Tarjetas | 14 |
| FX | Tipo de Cambio | 8 |
| ONE | Gastos Unicos | 16 |
| REC | Gastos Recurrentes | 15 |
| DEB | Debitos Automaticos | 7 |
| INST | Compras en Cuotas | 10 |
| FILT | Filtros y busqueda | 17 |
| SEC | Aislamiento/Seguridad | 6 |
| MCU | Multi-moneda E2E | 7 |
| GEN | Generacion 2do ciclo | 22 |
| LOUT | Logout | 4 |
| **Total** | | **150** |

## Tipos de test

| Tipo | Descripcion |
|------|-------------|
| `functional` | CRUD basico, response codes, creacion de datos |
| `validation` | Validacion de input, errores esperados |
| `security` | Aislamiento entre usuarios, autenticacion |
| `time_based` | Depende del paso del tiempo o generacion de gastos |

## Orden de ejecucion recomendado

1. **AUTH** - Registrar y logear los 3 usuarios
2. **CAT** - Verificar catalogos (anotar IDs)
3. **CARD** - Crear tarjetas por usuario
4. **FX** - Setear tipo de cambio
5. **ONE** - Gastos unicos (ARS y USD)
6. **REC** - Gastos recurrentes
7. **DEB** - Debitos automaticos
8. **INST** - Compras en cuotas
9. **FILT** - Filtros y busqueda
10. **SEC** - Aislamiento entre usuarios
11. **MCU** - Multi-moneda end-to-end
12. **GEN** - Generacion segundo ciclo (ejecutar ~1 mes despues)
13. **LOUT** - Logout

Los tests `GEN` (generacion 2do ciclo) son `time_based` y requieren que pase al menos 1 mes desde las fases 6-8, o que se simule manualmente.
