import { BaseController } from './base.controller.js';
import { GastoRecurrente, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';

export class GastoRecurrenteController extends BaseController {
  constructor() {
    super(GastoRecurrente, 'Gasto Recurrente');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' },
      { model: FrecuenciaGasto, as: 'frecuencia' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' },
      frecuencia_gasto_id: { model: FrecuenciaGasto, name: 'Frecuencia' }
    };
  }

  // Sobreescribir el método create para incluir la generación de gastos
  async create(req, res) {
    try {
      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      // Validar campos específicos de GastoRecurrente
      if (!this.validateGastoRecurrenteFields(req.body)) {
        return res.status(400).json({ 
          error: 'Campos inválidos',
          details: 'Los campos monto, dia_de_pago y fecha_inicio son requeridos' 
        });
      }

      // Crear el gasto recurrente
      const gastoRecurrente = await this.model.create({
        ...req.body,
        activo: true, // Por defecto activo
        ultima_fecha_generado: null // Inicialmente no se ha generado ningún gasto
      });
      
      logger.info('Gasto recurrente creado:', { id: gastoRecurrente.id });

      // Generar primer gasto si corresponde
      try {
        await GastoGeneratorService.generateFromGastoRecurrente(gastoRecurrente);
        logger.info('Primer gasto generado para gasto recurrente:', { gasto_recurrente_id: gastoRecurrente.id });
      } catch (error) {
        logger.error('Error al generar primer gasto para gasto recurrente:', { 
          gasto_recurrente_id: gastoRecurrente.id, 
          error: error.message 
        });
        // No devolvemos error al cliente ya que el gasto recurrente se creó correctamente
      }

      return res.status(201).json(gastoRecurrente);
    } catch (error) {
      logger.error('Error al crear gasto recurrente:', { error });
      return res.status(500).json({ 
        error: 'Error al crear gasto recurrente',
        details: error.message 
      });
    }
  }

  // Sobreescribir el método update para manejar la activación/desactivación
  async update(req, res) {
    try {
      const gastoRecurrente = await this.model.findByPk(req.params.id);
      if (!gastoRecurrente) {
        return res.status(404).json({ error: 'Gasto recurrente no encontrado' });
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      // Si se está actualizando el estado activo
      if (req.body.activo !== undefined && req.body.activo !== gastoRecurrente.activo) {
        logger.info('Cambiando estado de gasto recurrente:', { 
          id: gastoRecurrente.id, 
          nuevo_estado: req.body.activo 
        });
      }

      await gastoRecurrente.update(req.body);
      logger.info('Gasto recurrente actualizado:', { id: gastoRecurrente.id });

      return res.json(gastoRecurrente);
    } catch (error) {
      logger.error('Error al actualizar gasto recurrente:', { error });
      return res.status(500).json({ 
        error: 'Error al actualizar gasto recurrente',
        details: error.message 
      });
    }
  }

  // Validaciones específicas de GastoRecurrente
  validateGastoRecurrenteFields(data) {
    return data.monto && 
           data.dia_de_pago && 
           data.dia_de_pago >= 1 && 
           data.dia_de_pago <= 31 && 
           data.fecha_inicio;
  }
}

// Crear instancia del controlador
const gastoRecurrenteController = new GastoRecurrenteController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerGastosRecurrentes = gastoRecurrenteController.getAll.bind(gastoRecurrenteController);
export const obtenerGastoRecurrentePorId = gastoRecurrenteController.getById.bind(gastoRecurrenteController);
export const crearGastoRecurrente = gastoRecurrenteController.create.bind(gastoRecurrenteController);
export const actualizarGastoRecurrente = gastoRecurrenteController.update.bind(gastoRecurrenteController);
export const eliminarGastoRecurrente = gastoRecurrenteController.delete.bind(gastoRecurrenteController);
