import { BaseService } from './base.service.js';
import { Compra, CategoriaGasto, ImportanciaGasto, TipoPago, Tarjeta, Gasto } from '../models/index.js';
import { InstallmentExpenseStrategy } from '../strategies/expenseGeneration/installmentStrategy.js';
import { CreditCardDateService } from './creditCardDate.service.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Service for managing compras (installment purchases)
 * Extends BaseService to inherit common CRUD operations
 * Adds specific business logic for installment purchases with strategy integration
 */
export class ComprasService extends BaseService {
  constructor() {
    super(Compra);
    this.installmentStrategy = new InstallmentExpenseStrategy();
  }

  /**
   * Find all purchases with related data
   * Overrides base method to include specific associations
   */
  async findAll(options = {}) {
    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ],
      order: [['id', 'DESC']],
      ...options
    };

    return super.findAll(defaultOptions);
  }

  /**
   * Find purchase by ID with related data
   * Overrides base method to include specific associations
   */
  async findById(id, options = {}) {
    const defaultOptions = {
      include: [
        { model: CategoriaGasto, as: 'categoria' },
        { model: ImportanciaGasto, as: 'importancia' },
        { model: TipoPago, as: 'tipoPago' },
        { model: Tarjeta, as: 'tarjeta' }
      ],
      ...options
    };

    return super.findById(id, defaultOptions);
  }

  /**
   * Create purchase with validation and automatic installment setup
   * Sets up purchase for future installment generation
   */
  async create(data) {
    // Validate purchase data
    this.validatePurchaseData(data);

    // Set default values for purchases
    const processedData = {
      ...data,
      cantidad_cuotas: data.cantidad_cuotas || 1,
      pendiente_cuotas: true,
      fecha_ultima_cuota_generada: null
    };

    // Validate purchase date is not in future
    const today = moment().tz('America/Argentina/Buenos_Aires');
    const purchaseDate = moment(processedData.fecha_compra);

    if (purchaseDate.isAfter(today, 'day')) {
      throw new Error('La fecha de compra no puede ser futura');
    }

    const purchase = await super.create(processedData);

    logger.info('Purchase created successfully', {
      id: purchase.id,
      descripcion: purchase.descripcion,
      monto_total: purchase.monto_total,
      cantidad_cuotas: purchase.cantidad_cuotas,
      fecha_compra: purchase.fecha_compra
    });

    return purchase;
  }

  /**
   * Update purchase with validation
   * Includes specific validation for purchase updates
   */
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Validate update data
    this.validatePurchaseData(data, true);

    // Log important changes
    if (data.monto_total && data.monto_total !== existing.monto_total) {
      logger.info('Purchase amount updated', {
        id,
        oldAmount: existing.monto_total,
        newAmount: data.monto_total,
        descripcion: existing.descripcion
      });
    }

    if (data.cantidad_cuotas && data.cantidad_cuotas !== existing.cantidad_cuotas) {
      // Check if we can safely change installment count
      const generatedCount = await this.getGeneratedInstallmentsCount(id);

      if (generatedCount > 0 && data.cantidad_cuotas < generatedCount) {
        throw new Error(`No se puede reducir las cuotas a ${data.cantidad_cuotas} porque ya se generaron ${generatedCount} cuotas`);
      }

      logger.info('Purchase installment count updated', {
        id,
        oldCount: existing.cantidad_cuotas,
        newCount: data.cantidad_cuotas,
        generatedCount,
        descripcion: existing.descripcion
      });
    }

    if (data.pendiente_cuotas === false && existing.pendiente_cuotas === true) {
      logger.info('Purchase installment generation stopped', {
        id,
        descripcion: existing.descripcion
      });
    }

    return super.update(id, data);
  }

  /**
   * Find purchases with pending installments (for generation process)
   */
  async findPendingInstallments() {
    return this.findAll({
      where: { pendiente_cuotas: true }
    });
  }

  /**
   * Find purchases that should generate installments today
   * Used by the scheduler service
   */
  async findReadyForGeneration() {
    const pendingPurchases = await this.findPendingInstallments();
    const readyPurchases = [];

    for (const purchase of pendingPurchases) {
      const shouldGenerate = await this.installmentStrategy.shouldGenerate(purchase);
      if (shouldGenerate) {
        readyPurchases.push(purchase);
      }
    }

    return readyPurchases;
  }

  /**
   * Find purchases by payment method
   */
  async findByPaymentMethod(tipoPagoId) {
    return this.findAll({
      where: { tipo_pago_id: tipoPagoId }
    });
  }

  /**
   * Find purchases by credit card
   */
  async findByCreditCard(tarjetaId) {
    return this.findAll({
      where: { tarjeta_id: tarjetaId }
    });
  }

  /**
   * Find purchases with completed installments
   */
  async findCompleted() {
    return this.findAll({
      where: { pendiente_cuotas: false }
    });
  }

  /**
   * Get purchase installment summary
   */
  async getInstallmentSummary(id) {
    const purchase = await this.findById(id);
    if (!purchase) {
      return null;
    }

    const generatedCount = await this.getGeneratedInstallmentsCount(id);
    const totalInstallments = purchase.cantidad_cuotas;
    const remainingInstallments = totalInstallments - generatedCount;
    const installmentAmount = purchase.monto_total / totalInstallments;

    return {
      purchase_id: id,
      descripcion: purchase.descripcion,
      monto_total: purchase.monto_total,
      installment_amount: Math.round(installmentAmount * 100) / 100,
      total_installments: totalInstallments,
      generated_count: generatedCount,
      remaining_count: remainingInstallments,
      is_completed: remainingInstallments === 0,
      last_generated_date: purchase.fecha_ultima_cuota_generada,
      pending_generation: purchase.pendiente_cuotas
    };
  }

  /**
   * Get count of generated installments for a purchase
   */
  async getGeneratedInstallmentsCount(purchaseId) {
    // This should query the Gasto table for generated installments
    // For now, we'll use the strategy method
    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      return 0;
    }

    return await this.installmentStrategy.getGeneratedInstallmentsCount(purchase);
  }

  /**
   * Generate next installment for a purchase
   * Used for manual installment generation
   */
  async generateNextInstallment(purchaseId, transaction = null) {
    const purchase = await this.findById(purchaseId);

    if (!purchase) {
      throw new Error(`Purchase with id ${purchaseId} not found`);
    }

    if (!purchase.pendiente_cuotas) {
      logger.warn('Attempting to generate installment for completed purchase', {
        purchase_id: purchaseId
      });
      return null;
    }

    const shouldGenerate = await this.installmentStrategy.shouldGenerate(purchase);
    if (!shouldGenerate) {
      logger.info('Purchase not ready for installment generation today', {
        purchase_id: purchaseId,
        descripcion: purchase.descripcion
      });
      return null;
    }

    const gasto = await this.installmentStrategy.generate(purchase, transaction);

    if (gasto) {
      logger.info('Installment generated for purchase', {
        purchase_id: purchaseId,
        gasto_id: gasto.id,
        descripcion: purchase.descripcion
      });
    }

    return gasto;
  }

  /**
   * Stop installment generation for a purchase
   */
  async stopInstallmentGeneration(id, reason = 'Manual stop') {
    const updated = await this.update(id, { pendiente_cuotas: false });

    if (updated) {
      logger.info('Installment generation stopped for purchase', {
        id,
        reason,
        descripcion: updated.descripcion
      });
    }

    return updated;
  }

  /**
   * Resume installment generation for a purchase
   */
  async resumeInstallmentGeneration(id) {
    const purchase = await this.findById(id);
    if (!purchase) {
      return null;
    }

    // Check if there are still installments to generate
    const summary = await this.getInstallmentSummary(id);
    if (summary.remaining_count === 0) {
      throw new Error('Cannot resume: all installments have been generated');
    }

    const updated = await this.update(id, { pendiente_cuotas: true });

    if (updated) {
      logger.info('Installment generation resumed for purchase', {
        id,
        remaining_installments: summary.remaining_count,
        descripcion: updated.descripcion
      });
    }

    return updated;
  }

  /**
   * Validate purchase data
   * @param {Object} data - Purchase data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   */
  validatePurchaseData(data, isUpdate = false) {
    const errors = [];

    // Amount validation
    if (data.monto_total !== undefined) {
      if (typeof data.monto_total !== 'number' || data.monto_total <= 0) {
        errors.push('El monto total debe ser un número positivo');
      }

      // Check maximum 2 decimal places
      if ((data.monto_total * 100) % 1 !== 0) {
        errors.push('El monto total no puede tener más de 2 decimales');
      }
    }

    // Installment count validation
    if (data.cantidad_cuotas !== undefined) {
      if (!Number.isInteger(data.cantidad_cuotas) || data.cantidad_cuotas < 1 || data.cantidad_cuotas > 60) {
        errors.push('La cantidad de cuotas debe ser un número entero entre 1 y 60');
      }
    }

    // Purchase date validation
    if (data.fecha_compra) {
      const purchaseDate = moment(data.fecha_compra);
      if (!purchaseDate.isValid()) {
        errors.push('La fecha de compra debe ser una fecha válida');
      }
    }

    // Credit card validation for credit payments
    if (data.tipo_pago_id && data.tarjeta_id === null) {
      // We would need to check if tipo_pago_id corresponds to credit card
      // This validation might need to be enhanced based on your business rules
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed for purchase');
      error.validationErrors = errors;
      throw error;
    }
  }

  /**
   * Get upcoming payment dates for credit card purchases using smart date logic
   * @param {number} compraId - Purchase ID
   * @returns {Object} Payment schedule with smart date calculations
   */
  async getSmartPaymentSchedule(compraId) {
    try {
      const compra = await this.findById(compraId);
      if (!compra) {
        throw new Error('Compra no encontrada');
      }

      // Get generated installments count
      const cuotasGeneradas = await Gasto.count({
        where: {
          tipo_origen: 'compra',
          id_origen: compraId
        }
      });

      const totalCuotas = compra.cantidad_cuotas || 1;
      const cuotasPendientes = totalCuotas - cuotasGeneradas;

      // Base payment schedule info
      const scheduleInfo = {
        compra_id: compraId,
        descripcion: compra.descripcion,
        monto_total: compra.monto_total,
        monto_cuota: totalCuotas > 1 ? Math.round((compra.monto_total / totalCuotas) * 100) / 100 : compra.monto_total,
        total_cuotas: totalCuotas,
        cuotas_generadas: cuotasGeneradas,
        cuotas_pendientes: cuotasPendientes,
        pendiente_cuotas: compra.pendiente_cuotas,
        payment_type: 'regular',
        upcoming_dates: []
      };

      // If it's a credit card purchase, use smart date logic
      if (compra.tarjeta_id && compra.tarjeta?.tipo === 'credito') {
        try {
          // Validate credit card configuration
          const validation = CreditCardDateService.validateCreditCardConfiguration(compra.tarjeta);
          if (!validation.isValid) {
            scheduleInfo.payment_type = 'credit_card_invalid';
            scheduleInfo.validation_errors = validation.errors;
            scheduleInfo.validation_warnings = validation.warnings;
            return scheduleInfo;
          }

          scheduleInfo.payment_type = 'credit_card';
          scheduleInfo.credit_card_info = {
            tarjeta_id: compra.tarjeta.id,
            nombre: compra.tarjeta.nombre,
            banco: compra.tarjeta.banco,
            dia_cierre: compra.tarjeta.dia_mes_cierre,
            dia_vencimiento: compra.tarjeta.dia_mes_vencimiento
          };

          // Get current cycle info
          const cycleInfo = CreditCardDateService.getCurrentCycleInfo(compra.tarjeta);
          scheduleInfo.current_cycle = cycleInfo;

          // Get upcoming payment dates using smart logic
          const upcomingDates = CreditCardDateService.getUpcomingDueDates(
            compra,
            compra.tarjeta,
            cuotasGeneradas
          );

          scheduleInfo.upcoming_dates = upcomingDates.map(item => ({
            cuota: item.cuota,
            fecha: item.fecha,
            monto: scheduleInfo.monto_cuota,
            dias_hasta_vencimiento: item.moment.diff(moment(), 'days')
          }));

          // Add validation warnings if any
          if (validation.warnings.length > 0) {
            scheduleInfo.validation_warnings = validation.warnings;
          }

        } catch (error) {
          logger.error('Error calculating smart credit card dates:', {
            error: error.message,
            compra_id: compraId,
            tarjeta_id: compra.tarjeta_id
          });
          scheduleInfo.payment_type = 'credit_card_error';
          scheduleInfo.error = error.message;
        }
      } else {
        // For non-credit card payments, calculate regular schedule
        const fechaCompra = moment(compra.fecha);
        for (let i = cuotasGeneradas; i < totalCuotas; i++) {
          const fechaCuota = moment(fechaCompra).add(i, 'months');
          scheduleInfo.upcoming_dates.push({
            cuota: i + 1,
            fecha: fechaCuota.format('YYYY-MM-DD'),
            monto: scheduleInfo.monto_cuota,
            dias_hasta_vencimiento: fechaCuota.diff(moment(), 'days')
          });
        }
      }

      logger.info('Payment schedule calculated:', {
        compra_id: compraId,
        payment_type: scheduleInfo.payment_type,
        upcoming_payments: scheduleInfo.upcoming_dates.length
      });

      return scheduleInfo;
    } catch (error) {
      logger.error('Error getting smart payment schedule:', {
        error: error.message,
        compra_id: compraId
      });
      throw error;
    }
  }
}
