const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Settlement management class
class UTPSettlementEngine {
  constructor() {
    this.settlements = new Map();
    this.settlement_methods = {
      inr_upi: {
        name: 'UPI Transfer',
        settlement_time: '< 2 seconds',
        fee: 0.001, // 0.1%
        minimum_amount: 1,
        maximum_amount: 100000
      },
      inr_neft: {
        name: 'NEFT Transfer',
        settlement_time: '< 24 hours',
        fee: 0.002, // 0.2%
        minimum_amount: 1,
        maximum_amount: 10000000
      },
      binr_transfer: {
        name: 'BINR Token Transfer',
        settlement_time: '< 5 seconds',
        fee: 0.001, // 0.1%
        minimum_amount: 1,
        maximum_amount: 1000000
      },
      bgt_transfer: {
        name: 'Gold Token Transfer',
        settlement_time: '< 10 seconds',
        fee: 0.0015, // 0.15%
        minimum_amount: 10,
        maximum_amount: 1000000
      }
    };
  }

  // Execute settlement
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
        metadata,
        merchant_account: merchant_account_details,
        transaction_details: null,
        fees: {
          settlement_fee: amount * this.settlement_methods[settlement_method].fee,
          gst: 0, // Will be calculated
          total_fee: 0
        }
      };

      // Calculate total fees
      const settlement_fee = settlement.fees.settlement_fee;
      const gst = settlement_fee * 0.18; // 18% GST
      settlement.fees.total_fee = settlement_fee + gst;
      settlement.net_amount = amount - settlement.fees.total_fee;

      // Store settlement
      this.settlements.set(settlement_id, settlement);

      // Execute settlement based on method
      const result = await this.processSettlement(settlement);

      return {
        settlement_id,
        status: result.status,
        estimated_completion: result.estimated_completion,
        fees: settlement.fees,
        net_amount: settlement.net_amount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Settlement execution failed: ${error.message}`);
    }
  }

  // Process settlement by method
  async processSettlement(settlement) {
    const method_config = this.settlement_methods[settlement.settlement_method];
    
    try {
      switch (settlement.settlement_method) {
        case 'inr_upi':
          return await this.processUPISettlement(settlement, method_config);
        case 'inr_neft':
          return await this.processNEFTettlement(settlement, method_config);
        case 'binr_transfer':
          return await this.processBINRSettlement(settlement, method_config);
        case 'bgt_transfer':
          return await this.processBGTSettlement(settlement, method_config);
        default:
          throw new Error(`Unsupported settlement method: ${settlement.settlement_method}`);
      }
    } catch (error) {
      // Update settlement status to failed
      settlement.status = 'failed';
      settlement.error_message = error.message;
      settlement.failed_at = new Date().toISOString();
      this.settlements.set(settlement.settlement_id, settlement);
      
      throw error;
    }
  }

  // Process UPI settlement
  async processUPISettlement(settlement, config) {
    // Simulate UPI transfer
    const transaction_id = `UPI${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      status: 'completed',
      transaction_id,
      settlement_method: 'inr_upi',
      estimated_completion: '< 2 seconds',
      executed_at: new Date().toISOString(),
      transaction_details: {
        utr: transaction_id,
        vpa: settlement.merchant_account.upi_id,
        amount: settlement.net_amount
      }
    };
  }

  // Process NEFT settlement
  async processNEFTettlement(settlement, config) {
    // Simulate NEFT transfer (batch processing)
    const transaction_id = `NEFT${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      status: 'processing',
      transaction_id,
      settlement_method: 'inr_neft',
      estimated_completion: '< 24 hours',
      executed_at: new Date().toISOString(),
      transaction_details: {
        ref_no: transaction_id,
        account_number: settlement.merchant_account.account_number,
        ifsc_code: settlement.merchant_account.ifsc_code,
        amount: settlement.net_amount
      }
    };
  }

  // Process BINR settlement
  async processBINRSettlement(settlement, config) {
    // Simulate BINR token transfer on blockchain
    const transaction_hash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    return {
      status: 'completed',
      transaction_hash,
      settlement_method: 'binr_transfer',
      estimated_completion: '< 5 seconds',
      executed_at: new Date().toISOString(),
      transaction_details: {
        to_address: settlement.merchant_account.wallet_address,
        token_amount: settlement.net_amount,
        gas_fee: '0.0001'
      }
    };
  }

  // Process BGT settlement
  async processBGTSettlement(settlement, config) {
    // Simulate BGT token transfer
    const transaction_hash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const gold_amount = settlement.net_amount / 5650; // Assuming ₹5650 per gram
    
    return {
      status: 'completed',
      transaction_hash,
      settlement_method: 'bgt_transfer',
      estimated_completion: '< 10 seconds',
      executed_at: new Date().toISOString(),
      transaction_details: {
        to_address: settlement.merchant_account.wallet_address,
        token_amount: settlement.net_amount,
        gold_grams: gold_amount,
        vault_provider: settlement.merchant_account.vault_provider || 'MMTC-PAMP'
      }
    };
  }

  // Get settlement status
  getSettlementStatus(settlement_id) {
    const settlement = this.settlements.get(settlement_id);
    if (!settlement) {
      throw new Error('Settlement not found');
    }

    return {
      settlement_id,
      status: settlement.status,
      payment_id: settlement.payment_id,
      merchant_id: settlement.merchant_id,
      amount: settlement.amount,
      currency: settlement.currency,
      settlement_method: settlement.settlement_method,
      fees: settlement.fees,
      net_amount: settlement.net_amount,
      created_at: settlement.created_at,
      transaction_details: settlement.transaction_details,
      error_message: settlement.error_message,
      timestamp: new Date().toISOString()
    };
  }

  // Get settlement history
  getSettlementHistory(merchant_id, limit = 50) {
    const history = Array.from(this.settlements.values())
      .filter(s => s.merchant_id === merchant_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    return history.map(settlement => ({
      settlement_id: settlement.settlement_id,
      payment_id: settlement.payment_id,
      amount: settlement.amount,
      currency: settlement.currency,
      settlement_method: settlement.settlement_method,
      status: settlement.status,
      fees: settlement.fees,
      net_amount: settlement.net_amount,
      created_at: settlement.created_at
    }));
  }

  // Validate settlement data
  validateSettlementData(data) {
    const required_fields = [
      'payment_id',
      'merchant_id', 
      'amount',
      'currency',
      'settlement_method',
      'merchant_account_details'
    ];

    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate settlement method
    if (!this.settlement_methods[data.settlement_method]) {
      throw new Error(`Unsupported settlement method: ${data.settlement_method}`);
    }

    // Validate amount
    const method_config = this.settlement_methods[data.settlement_method];
    if (data.amount < method_config.minimum_amount || data.amount > method_config.maximum_amount) {
      throw new Error(`Amount must be between ${method_config.minimum_amount} and ${method_config.maximum_amount}`);
    }
  }

  // Get settlement methods
  getSettlementMethods() {
    return Object.entries(this.settlement_methods).map(([key, config]) => ({
      code: key,
      ...config
    }));
  }

  // Calculate settlement fees
  calculateFees(amount, settlement_method) {
    const config = this.settlement_methods[settlement_method];
    if (!config) {
      throw new Error(`Unknown settlement method: ${settlement_method}`);
    }

    const settlement_fee = amount * config.fee;
    const gst = settlement_fee * 0.18;
    const total_fee = settlement_fee + gst;
    const net_amount = amount - total_fee;

    return {
      amount,
      settlement_fee,
      gst,
      total_fee,
      net_amount,
      fee_percentage: config.fee
    };
  }
}

// Initialize settlement engine
const settlementEngine = new UTPSettlementEngine();

// GET /api/settlement/methods - Get available settlement methods
router.get('/methods', (req, res) => {
  try {
    const methods = settlementEngine.getSettlementMethods();
    res.json({
      success: true,
      settlement_methods: methods,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'SETTLEMENT_METHODS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/settlement/execute - Execute settlement
router.post('/execute', async (req, res) => {
  try {
    const result = await settlementEngine.executeSettlement(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'SETTLEMENT_EXECUTION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/settlement/status/:settlement_id - Get settlement status
router.get('/status/:settlement_id', (req, res) => {
  try {
    const result = settlementEngine.getSettlementStatus(req.params.settlement_id);
    res.json({
      success: true,
      settlement: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'SETTLEMENT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/settlement/history/:merchant_id - Get settlement history
router.get('/history/:merchant_id', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = settlementEngine.getSettlementHistory(req.params.merchant_id, parseInt(limit));
    res.json({
      success: true,
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'SETTLEMENT_HISTORY_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/settlement/calculate-fees - Calculate settlement fees
router.post('/calculate-fees', (req, res) => {
  try {
    const { amount, settlement_method } = req.body;
    const fees = settlementEngine.calculateFees(amount, settlement_method);
    res.json({
      success: true,
      fees,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'FEE_CALCULATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/settlement/stats/:merchant_id - Get settlement statistics
router.get('/stats/:merchant_id', (req, res) => {
  try {
    const history = settlementEngine.getSettlementHistory(req.params.merchant_id, 1000);
    
    const stats = {
      total_settlements: history.length,
      total_volume: history.reduce((sum, s) => sum + s.amount, 0),
      total_fees: history.reduce((sum, s) => sum + s.fees.total_fee, 0),
      settlement_methods: {},
      status_breakdown: {},
      average_amount: 0
    };

    // Calculate settlement method breakdown
    history.forEach(s => {
      if (!stats.settlement_methods[s.settlement_method]) {
        stats.settlement_methods[s.settlement_method] = { count: 0, volume: 0 };
      }
      stats.settlement_methods[s.settlement_method].count++;
      stats.settlement_methods[s.settlement_method].volume += s.amount;

      if (!stats.status_breakdown[s.status]) {
        stats.status_breakdown[s.status] = 0;
      }
      stats.status_breakdown[s.status]++;
    });

    // Calculate average amount
    stats.average_amount = stats.total_settlements > 0 ? stats.total_volume / stats.total_settlements : 0;

    res.json({
      success: true,
      merchant_id: req.params.merchant_id,
      stats,
      period: 'all_time',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'SETTLEMENT_STATS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;