import { BaseController } from './base.controller.js';
import { GastoUnico, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';

export class GastoUnicoController extends BaseController {
  constructor() {
    super(GastoUnico, 'Gasto Único');
  }

  getIncludes() {
    return [
      { model: CategoriaGasto, as: 'categoria' },
      { model: ImportanciaGasto, as: 'importancia' },
      { model: TipoPago, as: 'tipoPago' },
      { model: Tarjeta, as: 'tarjeta' }
    ];
  }

  getRelationships() {
    return {
      categoria_gasto_id: { model: CategoriaGasto, name: 'Categoría' },
      importancia_gasto_id: { model: ImportanciaGasto, name: 'Importancia' },
      tipo_pago_id: { model: TipoPago, name: 'Tipo de Pago' },
      tarjeta_id: { model: Tarjeta, name: 'Tarjeta' }
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

      // Validar campos específicos de GastoUnico
      if (!this.validateGastoUnicoFields(req.body)) {
        return res.status(400).json({ 
          error: 'Campos inválidos',
          details: 'Los campos monto y fecha son requeridos' 
        });
      }

      // Crear el gasto único
      const gastoUnico = await this.model.create({
        ...req.body,
        procesado: false // Por defecto no procesado
      });
      
      logger.info('Gasto único creado:', { id: gastoUnico.id });

      // Generar gasto real inmediatamente
      try {
        await GastoGeneratorService.generateFromGastoUnico(gastoUnico);
        await gastoUnico.update({ procesado: true });
        logger.info('Gasto generado para gasto único:', { gasto_unico_id: gastoUnico.id });
      } catch (error) {
        logger.error('Error al generar gasto para gasto único:', { 
          gasto_unico_id: gastoUnico.id, 
          error: error.message 
        });
        // No devolvemos error al cliente ya que el gasto único se creó correctamente
      }

      return res.status(201).json(gastoUnico);
    } catch (error) {
      logger.error('Error al crear gasto único:', { error });
      return res.status(500).json({ 
        error: 'Error al crear gasto único',
        details: error.message 
      });
    }
  }

  // Sobreescribir el método update para evitar modificaciones si ya está procesado
  async update(req, res) {
    try {
      const gastoUnico = await this.model.findByPk(req.params.id);
      if (!gastoUnico) {
        return res.status(404).json({ error: 'Gasto único no encontrado' });
      }

      // No permitir modificaciones si ya está procesado
      if (gastoUnico.procesado) {
        return res.status(400).json({ 
          error: 'No se puede modificar',
          details: 'El gasto único ya ha sido procesado' 
        });
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      await gastoUnico.update(req.body);
      logger.info('Gasto único actualizado:', { id: gastoUnico.id });

      return res.json(gastoUnico);
    } catch (error) {
      logger.error('Error al actualizar gasto único:', { error });
      return res.status(500).json({ 
        error: 'Error al actualizar gasto único',
        details: error.message 
      });
    }
  }

  // Sobreescribir el método delete para evitar eliminación si ya está procesado
  async delete(req, res) {
    try {
      const gastoUnico = await this.model.findByPk(req.params.id);
      if (!gastoUnico) {
        return res.status(404).json({ error: 'Gasto único no encontrado' });
      }

      // No permitir eliminación si ya está procesado
      if (gastoUnico.procesado) {
        return res.status(400).json({ 
          error: 'No se puede eliminar',
          details: 'El gasto único ya ha sido procesado' 
        });
      }

      await gastoUnico.destroy();
      logger.info('Gasto único eliminado:', { id: gastoUnico.id });

      return res.json({ message: 'Gasto único eliminado correctamente' });
    } catch (error) {
      logger.error('Error al eliminar gasto único:', { error });
      return res.status(500).json({ 
        error: 'Error al eliminar gasto único',
        details: error.message 
      });
    }
  }

  // Validaciones específicas de GastoUnico
  validateGastoUnicoFields(data) {
    return data.monto && data.fecha;
  }
}

// Crear instancia del controlador
const gastoUnicoController = new GastoUnicoController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerGastosUnicos = gastoUnicoController.getAll.bind(gastoUnicoController);
export const obtenerGastoUnicoPorId = gastoUnicoController.getById.bind(gastoUnicoController);
export const crearGastoUnico = gastoUnicoController.create.bind(gastoUnicoController);
export const actualizarGastoUnico = gastoUnicoController.update.bind(gastoUnicoController);
export const eliminarGastoUnico = gastoUnicoController.delete.bind(gastoUnicoController);
