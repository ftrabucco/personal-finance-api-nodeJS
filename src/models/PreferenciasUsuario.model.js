import { DataTypes } from 'sequelize';

// Modulos disponibles y sus defaults
export const MODULOS_DISPONIBLES = {
  // Core modules (siempre visibles en sidebar, no se pueden deshabilitar)
  dashboard: { nombre: 'Dashboard', descripcion: 'Pagina principal con resumen', core: true },
  historial: { nombre: 'Historial', descripcion: 'Historial de gastos', core: true },
  gastos_unicos: { nombre: 'Gastos Unicos', descripcion: 'Registro de gastos puntuales', core: true },
  ingresos_unicos: { nombre: 'Ingresos Unicos', descripcion: 'Registro de ingresos puntuales', core: true },
  configuracion: { nombre: 'Configuracion', descripcion: 'Ajustes de la aplicacion', core: true },
  perfil: { nombre: 'Perfil', descripcion: 'Tu perfil de usuario', core: true },

  // Optional modules (deshabilitados por defecto)
  compras: { nombre: 'Compras en Cuotas', descripcion: 'Gestiona compras con pagos en cuotas', core: false },
  gastos_recurrentes: { nombre: 'Gastos Recurrentes', descripcion: 'Gastos que se repiten periodicamente', core: false },
  debitos_automaticos: { nombre: 'Debitos Automaticos', descripcion: 'Suscripciones y servicios automaticos', core: false },
  ingresos_recurrentes: { nombre: 'Ingresos Recurrentes', descripcion: 'Ingresos que se repiten (salario, etc)', core: false },
  tarjetas: { nombre: 'Tarjetas', descripcion: 'Gestiona tus tarjetas de credito y debito', core: false },
  cuentas_bancarias: { nombre: 'Cuentas Bancarias', descripcion: 'Gestiona tus cuentas bancarias', core: false },
  proyecciones: { nombre: 'Proyecciones', descripcion: 'Proyeccion de gastos futuros', core: false },
  salud_financiera: { nombre: 'Salud Financiera', descripcion: 'Analisis de tu situacion financiera', core: false }
};

// Modulos habilitados por defecto (solo los opcionales que queremos activos inicialmente)
export const MODULOS_DEFAULT = ['gastos_unicos', 'ingresos_unicos'];

// Secciones del dashboard disponibles
export const DASHBOARD_SECTIONS_DISPONIBLES = [
  'balance_acumulado',
  'tasa_ahorro',
  'evolucion_tabla',
  'ingresos_vs_gastos',
  'gastos_categoria',
  'desglose_mes',
  'gastos_recientes',
  'proyeccion',
];

// Todas las secciones activas por defecto
export const DASHBOARD_SECTIONS_DEFAULT = [...DASHBOARD_SECTIONS_DISPONIBLES];

export function definePreferenciasUsuario(sequelize) {
  return sequelize.define('PreferenciasUsuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    modulos_activos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: MODULOS_DEFAULT,
      comment: 'Lista de modulos opcionales habilitados por el usuario'
    },
    tema: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'system',
      validate: {
        isIn: [['light', 'dark', 'system']]
      }
    },
    categorias_ocultas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'IDs de categorias del sistema que el usuario quiere ocultar'
    },
    fuentes_ocultas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'IDs de fuentes de ingreso del sistema que el usuario quiere ocultar'
    },
    balance_inicial: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Balance inicial del usuario antes de empezar a usar la app (en ARS)',
      validate: {
        min: 0
      }
    },
    dashboard_sections: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: DASHBOARD_SECTIONS_DEFAULT,
      comment: 'Secciones del dashboard habilitadas por el usuario'
    }
  }, {
    tableName: 'preferencias_usuario',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
}
