import { BaseController } from './base.controller.js';
import { Compra, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta } from '../../models/index.js';
import { GastoGeneratorService } from '../../services/gastoGenerator.service.js';
import logger from '../../utils/logger.js';

export class CompraController extends BaseController {
  constructor() {
    super(Compra, 'Compra');
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

      // Validar campos específicos de Compra
      if (!this.validateCompraFields(req.body)) {
        return res.status(400).json({ 
          error: 'Campos inválidos',
          details: 'Los campos monto_total y fecha_compra son requeridos' 
        });
      }

      // Crear la compra
      const compra = await this.model.create(req.body);
      logger.info('Compra creada:', { id: compra.id });

      // Generar gasto asociado
      try {
        await GastoGeneratorService.generateFromCompra(compra);
        logger.info('Gasto generado para compra:', { compra_id: compra.id });
      } catch (error) {
        logger.error('Error al generar gasto para compra:', { 
          compra_id: compra.id, 
          error: error.message 
        });
        // No devolvemos error al cliente ya que la compra se creó correctamente
      }

      return res.status(201).json(compra);
    } catch (error) {
      logger.error('Error al crear compra:', { error });
      return res.status(500).json({ 
        error: 'Error al crear compra',
        details: error.message 
      });
    }
  }

  // Sobreescribir el método update para manejar la actualización de cuotas
  async update(req, res) {
    try {
      const compra = await this.model.findByPk(req.params.id);
      if (!compra) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }

      // Validar IDs existentes
      const validationErrors = await this.validateExistingIds(req.body, this.getRelationships());
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      // Si se está actualizando el número de cuotas, validar
      if (req.body.cantidad_cuotas !== undefined && 
          req.body.cantidad_cuotas !== compra.cantidad_cuotas) {
        if (!this.validateCuotasUpdate(req.body.cantidad_cuotas, compra)) {
          return res.status(400).json({ 
            error: 'Actualización de cuotas inválida',
            details: 'No se puede reducir el número de cuotas si ya hay gastos generados' 
          });
        }
      }

      await compra.update(req.body);
      logger.info('Compra actualizada:', { id: compra.id });

      return res.json(compra);
    } catch (error) {
      logger.error('Error al actualizar compra:', { error });
      return res.status(500).json({ 
        error: 'Error al actualizar compra',
        details: error.message 
      });
    }
  }

  // Validaciones específicas de Compra
  validateCompraFields(data) {
    return data.monto_total && data.fecha_compra;
  }

  validateCuotasUpdate(newCuotas, compra) {
    // Si se están reduciendo las cuotas, verificar que no haya más gastos generados
    if (newCuotas < compra.cantidad_cuotas) {
      return compra.pendiente_cuotas >= (compra.cantidad_cuotas - newCuotas);
    }
    return true;
  }
}

// Crear instancia del controlador
const compraController = new CompraController();

// Exportar métodos del controlador con el contexto correcto
export const obtenerCompras = compraController.getAll.bind(compraController);
export const obtenerCompraPorId = compraController.getById.bind(compraController);
export const crearCompra = compraController.create.bind(compraController);
export const actualizarCompra = compraController.update.bind(compraController);
export const eliminarCompra = compraController.delete.bind(compraController); 