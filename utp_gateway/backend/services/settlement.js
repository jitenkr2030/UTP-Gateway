const { v4: uuidv4 } = require('uuid');

/**
 * UTP Settlement Service
 * Handles instant settlement of payments to merchants
 * Supports INR (UPI/NEFT), BINR, Gold Tokens, and Mixed settlements
 */
class UTPSettlementService {
  constructor() {
    this.settlements = new Map();
    this.settlement_methods = {
      inr_upi: {
        name: 'UPI Transfer',
        type: 'fiat',
        settlement_time: '< 2 seconds',
        fee_rate: 0.001, // 0.1%
        minimum_amount: 10,
        maximum_amount: 100000,
        currency: 'INR'
      },
      inr_neft: {
        name: 'NEFT Transfer',
        type: 'fiat',
        settlement_time: '< 24 hours',
        fee_rate: 0.002, // 0.2%
        minimum_amount: 1,
        maximum_amount: 10000000,
        currency: 'INR'
      },
      binr_transfer: {
        name: 'BINR Token Transfer',
        type: 'digital',
        settlement_time: '< 5 seconds',
        fee_rate: 0.001, // 0.1%
        minimum_amount: 1,
        maximum_amount: 1000000,
        currency: 'BINR'
      },
      bgt_transfer: {
        name: 'Gold Token Transfer',
        type: 'asset',
        settlement_time: '< 10 seconds',
        fee_rate: 0.0015, // 0.15%
        minimum_amount: 0.1,
        maximum_amount: 1000,
        currency: 'BGT'
      },
      mixed_settlement: {
        name: 'Mixed Settlement',
        type: 'hybrid',
        settlement_time: '< 15 seconds',
        fee_rate: 0.002, // 0.2%
        minimum_amount: 50,
        maximum_amount: 500000,
        currency: 'MIXED'
      }
    };

    this.supported_currencies = ['INR', 'BINR', 'BGT', 'BST', 'BPT'];
  }

  /**
   * Execute settlement for a payment
   * @param {Object} settlement_data - Settlement details
   * @returns {Promise<Object>} Settlement result
   */
  async executeSettlement(settlement_data) {
    const {
      payment_id,
      merchant_id,
      amount,
      currency,
      settlement_method,
      merchant_account_details,
      metadata = {}
    } = settlement_data;

    try {
      // Validate settlement data
      this.validateSettlementData(settlement_data);

      const settlement_id = uuidv4();
      const settlement = {
        settlement_id,
        payment_id,
        merchant_id,
        amount,
        currency,
        settlement_method,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata,
        merchant_account: merchant_account_details,
        transaction_details: null,
        fees: {
          settlement_fee: 0,
          gst: 0,
          total_fee: 0
        },
        net_amount: 0
      };

      // Calculate fees and net amount
      const fee_calculation = this.calculateFees(amount, settlement_method);
      settlement.fees = fee_calculation;
      settlement.net_amount = amount - fee_calculation.total_fee;

      // Store settlement
      this.settlements.set(settlement_id, settlement);

      // Execute settlement based on method
      const result = await this.processSettlement(settlement);

      // Update settlement with result
      settlement.status = result.status;
      settlement.updated_at = new Date().toISOString();
      settlement.transaction_details = result.transaction_details;

      this.settlements.set(settlement_id, settlement);

      return {
        settlement_id,
        status: result.status,
        estimated_completion: result.estimated_completion,
        fees: settlement.fees,
        net_amount: settlement.net_amount,
        settlement_method,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Settlement execution failed:', error);
      throw new Error(`Settlement execution failed: ${error.message}`);
    }
  }

  /**
   * Get settlement by ID
   * @param {string} settlement_id - Settlement ID
   * @returns {Object|null} Settlement details
   */
  getSettlement(settlement_id) {
    return this.settlements.get(settlement_id) || null;
  }

  /**
   * Get all settlements for a merchant
   * @param {string} merchant_id - Merchant ID
   * @param {number} limit - Number of settlements to return
   * @returns {Array} Array of settlements
   */
  getMerchantSettlements(merchant_id, limit = 100) {
    const merchant_settlements = [];
    
    for (const settlement of this.settlements.values()) {
      if (settlement.merchant_id === merchant_id) {
        merchant_settlements.push(settlement);
      }
    }

    // Sort by creation date (newest first)
    merchant_settlements.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return merchant_settlements.slice(0, limit);
  }

  /**
   * Get available settlement methods
   * @returns {Object} Available settlement methods
   */
  getAvailableMethods() {
    return this.settlement_methods;
  }

  /**
   * Calculate fees for settlement
   * @private
   */
  calculateFees(amount, settlement_method) {
    const method = this.settlement_methods[settlement_method];
    
    if (!method) {
      throw new Error(`Invalid settlement method: ${settlement_method}`);
    }

    const settlement_fee = amount * method.fee_rate;
    const gst = settlement_fee * 0.18; // 18% GST on fees
    const total_fee = settlement_fee + gst;

    return {
      settlement_fee: Math.round(settlement_fee * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total_fee: Math.round(total_fee * 100) / 100,
      fee_rate: method.fee_rate * 100 // percentage
    };
  }

  /**
   * Validate settlement data
   * @private
   */
  validateSettlementData(data) {
    const required_fields = ['payment_id', 'merchant_id', 'amount', 'currency', 'settlement_method'];
    
    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate settlement method
    if (!this.settlement_methods[data.settlement_method]) {
      throw new Error(`Invalid settlement method: ${data.settlement_method}`);
    }

    // Validate amount limits
    const method = this.settlement_methods[data.settlement_method];
    if (data.amount < method.minimum_amount) {
      throw new Error(`Amount below minimum: ${method.minimum_amount}`);
    }
    if (data.amount > method.maximum_amount) {
      throw new Error(`Amount above maximum: ${method.maximum_amount}`);
    }

    // Validate currency support
    if (!this.supported_currencies.includes(data.currency)) {
      throw new Error(`Unsupported currency: ${data.currency}`);
    }
  }

  /**
   * Process settlement based on method
   * @private
   */
  async processSettlement(settlement) {
    const { settlement_method, merchant_account } = settlement;
    const method = this.settlement_methods[settlement_method];

    try {
      switch (settlement_method) {
        case 'inr_upi':
          return await this.processUPI(settlement, merchant_account);
        
        case 'inr_neft':
          return await this.processNEFT(settlement, merchant_account);
        
        case 'binr_transfer':
          return await this.processBINR(settlement, merchant_account);
        
        case 'bgt_transfer':
          return await this.processBGT(settlement, merchant_account);
        
        case 'mixed_settlement':
          return await this.processMixed(settlement, merchant_account);
        
        default:
          throw new Error(`Unknown settlement method: ${settlement_method}`);
      }
    } catch (error) {
      settlement.status = 'failed';
      settlement.error_message = error.message;
      throw error;
    }
  }

  /**
   * Process UPI settlement
   * @private
   */
  async processUPI(settlement, merchant_account) {
    // Simulate UPI payment processing
    await this.simulateProcessingTime(1000); // 1 second for UPI
    
    return {
      status: 'completed',
      estimated_completion: new Date(Date.now() + 2000).toISOString(),
      transaction_details: {
        method: 'upi',
        vpa: merchant_account.vpa,
        transaction_id: `UPI${Date.now()}`,
        upi_reference: `UR${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }
    };
  }

  /**
   * Process NEFT settlement
   * @private
   */
  async processNEFT(settlement, merchant_account) {
    // Simulate NEFT payment processing
    await this.simulateProcessingTime(2000); // 2 seconds for NEFT
    
    return {
      status: 'completed',
      estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      transaction_details: {
        method: 'neft',
        account_number: merchant_account.account_number,
        ifsc_code: merchant_account.ifsc_code,
        transaction_id: `NEFT${Date.now()}`,
        reference_number: `REF${Math.random().toString(36).substr(2, 12).toUpperCase()}`
      }
    };
  }

  /**
   * Process BINR settlement
   * @private
   */
  async processBINR(settlement, merchant_account) {
    // Simulate BINR token transfer
    await this.simulateProcessingTime(500); // 500ms for token transfer
    
    return {
      status: 'completed',
      estimated_completion: new Date(Date.now() + 5000).toISOString(),
      transaction_details: {
        method: 'binr_transfer',
        recipient_wallet: merchant_account.wallet_address,
        transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block_number: Math.floor(Math.random() * 1000000) + 18000000,
        gas_used: 21000
      }
    };
  }

  /**
   * Process BGT settlement
   * @private
   */
  async processBGT(settlement, merchant_account) {
    // Simulate Gold token transfer
    await this.simulateProcessingTime(800); // 800ms for gold token
    
    return {
      status: 'completed',
      estimated_completion: new Date(Date.now() + 10000).toISOString(),
      transaction_details: {
        method: 'bgt_transfer',
        recipient_wallet: merchant_account.wallet_address,
        token_amount: settlement.net_amount,
        transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        block_number: Math.floor(Math.random() * 1000000) + 18000000
      }
    };
  }

  /**
   * Process Mixed settlement
   * @private
   */
  async processMixed(settlement, merchant_account) {
    // Split settlement: 50% BINR, 50% INR
    const binr_amount = settlement.net_amount * 0.5;
    const inr_amount = settlement.net_amount * 0.5;
    
    await this.simulateProcessingTime(1500); // 1.5 seconds for mixed
    
    return {
      status: 'completed',
      estimated_completion: new Date(Date.now() + 15000).toISOString(),
      transaction_details: {
        method: 'mixed',
        binr_amount: Math.round(binr_amount * 100) / 100,
        inr_amount: Math.round(inr_amount * 100) / 100,
        binr_transaction: `0x${Math.random().toString(16).substr(2, 64)}`,
        inr_reference: `MI${Date.now()}`
      }
    };
  }

  /**
   * Simulate processing time
   * @private
   */
  async simulateProcessingTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'UTP Settlement Service',
      status: 'active',
      uptime: '99.99%',
      settlement_methods: Object.keys(this.settlement_methods).length,
      pending_settlements: Array.from(this.settlements.values()).filter(s => s.status === 'pending').length,
      completed_settlements: Array.from(this.settlements.values()).filter(s => s.status === 'completed').length,
      last_updated: new Date().toISOString()
    };
  }
}

module.exports = UTPSettlementService;