/**
 * Estrategia base para generación de gastos
 * Define la interfaz común para todas las estrategias de generación
 */
export class BaseExpenseGenerationStrategy {
  /**
   * Genera un gasto real desde una fuente específica
   * @param {Object} source - El objeto fuente (gastoUnico, gastoRecurrente, etc.)
   * @returns {Promise<Object|null>} - El gasto generado o null si no debe generarse
   */
  async generate(source) {
    throw new Error('Method generate() must be implemented by subclass');
  }

  /**
   * Verifica si la fuente debe generar un gasto en la fecha actual
   * @param {Object} source - El objeto fuente
   * @returns {Promise<boolean>} - true si debe generar el gasto
   */
  async shouldGenerate(source) {
    throw new Error('Method shouldGenerate() must be implemented by subclass');
  }

  /**
   * Obtiene el tipo de estrategia
   * @returns {string} - Tipo de la estrategia
   */
  getType() {
    throw new Error('Method getType() must be implemented by subclass');
  }

  /**
   * Valida que la fuente tenga todos los campos requeridos
   * @param {Object} source - El objeto fuente
   * @returns {boolean} - true si es válida
   */
  validateSource(source) {
    return source &&
           source.categoria_gasto_id &&
           source.importancia_gasto_id &&
           source.tipo_pago_id;
  }

  /**
   * Crea los datos base para el gasto real
   * @param {Object} source - El objeto fuente
   * @param {Object} additionalData - Datos adicionales específicos de la estrategia
   * @returns {Object} - Datos del gasto a crear
   */
  createGastoData(source, additionalData = {}) {
    return {
      categoria_gasto_id: source.categoria_gasto_id,
      importancia_gasto_id: source.importancia_gasto_id,
      tipo_pago_id: source.tipo_pago_id,
      tarjeta_id: source.tarjeta_id,
      descripcion: source.descripcion,
      tipo_origen: this.getType(),
      id_origen: source.id,
      ...additionalData
    };
  }
}