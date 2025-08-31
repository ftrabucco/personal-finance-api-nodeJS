import { BaseController } from './base.controller.js';
import { DebitoAutomatico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, FrecuenciaGasto } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';

export class DebitoAutomaticoController extends BaseController {
  constructor() {
    super(DebitoAutomatico, 'Débito Automático');
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

      // Validar campos específicos de DebitoAutomatico
      if (!this.validateDebitoAutomaticoFields(req.body)) {
        return res.status(400).json({ 
          error: 'Campos inválidos',
          details: 'Los campos monto, dia_de_pago, fecha_inicio y servicio son requeridos' 
        });
      }

      // Crear el débito automático
      const debitoAutomatico = await this.model.create({
        ...req.body,
        activo: true, // Por defecto activo
        ultima_fecha_generado: null // Inicialmente no se ha generado ningún gasto
      });
      
      logger.info('Débito automático creado:', { id: debitoAutomatico.id });

      // Generar primer gasto si corresponde
      try {
        await GastoGeneratorService.generateFromDebitoAutomatico(debitoAutomatico);
        logger.info('Primer gasto generado para débito automático:', { debito_automatico_id: debitoAutomatico.id });
      } catch (error) {
        logger.error('Error al generar primer gasto para débito automático:', { 
          debito_automatico_id: debitoAutomatico.id, 
          error: error.message 
        });
        // No devolvemos error al cliente ya que el débito automático se creó correctamente
      }

      return res.status(201).json(debitoAutomatico);
    } catch (error) {
      logger.error('Error al crear débito automático:', { error });
      return res.status(500).json({ 
        error: 'Error al crear débito automático',
        details: error.message 
      });
    }
  }

  // Sobreescribir el método update para manejar la activación/desactivación
  async update(req, res) {
    try {
      const debitoAutomatico = await this.model.findByPk(req.params.id);
      if (!debitoAutomatico) {
        return res.status(404).json({ error: 'Débito automático no encontrado' });
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      // Si se está actualizando el estado activo
      if (req.body.activo !== undefined && req.body.activo !== debitoAutomatico.activo) {
        logger.info('Cambiando estado de débito automático:', { 
          id: debitoAutomatico.id, 
          nuevo_estado: req.body.activo 
        });
      }

      await debitoAutomatico.update(req.body);
      logger.info('Débito automático actualizado:', { id: debitoAutomatico.id });

      return res.json(debitoAutomatico);
    } catch (error) {
      logger.error('Error al actualizar débito automático:', { error });
      return res.status(500).json({ 
        error: 'Error al actualizar débito automático',
        details: error.message 
      });
    }
  }

  // Validaciones específicas de DebitoAutomatico
  validateDebitoAutomaticoFields(data) {
    return data.monto && 
           data.dia_de_pago && 
           data.dia_de_pago >= 1 && 
           data.dia_de_pago <= 31 && 
           data.fecha_inicio &&
           data.servicio;
  }
}

// Crear instancia del controlador
const debitoAutomaticoController = new DebitoAutomaticoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerDebitosAutomaticos = debitoAutomaticoController.getAll.bind(debitoAutomaticoController);
export const obtenerDebitoAutomaticoPorId = debitoAutomaticoController.getById.bind(debitoAutomaticoController);
export const crearDebitoAutomatico = debitoAutomaticoController.create.bind(debitoAutomaticoController);
export const actualizarDebitoAutomatico = debitoAutomaticoController.update.bind(debitoAutomaticoController);
export const eliminarDebitoAutomatico = debitoAutomaticoController.delete.bind(debitoAutomaticoController);
