const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 payments per minute per IP
  message: 'Payment rate limit exceeded. Please try again later.'
});

router.use(paymentLimiter);

// Payment processing class
class UTPPaymentProcessor {
  constructor(utpGateway) {
    this.utpGateway = utpGateway;
    this.transactions = new Map();
  }

  // Create new payment
  async createPayment(paymentData) {
    const {
      customer_id,
      merchant_id,
      amount,
      currency, // bgt, bst, bpt, binr, rwa
      settlement_type, // inr, binr, bgt, mixed
      conversion_preference, // auto, manual, none
      metadata = {}
    } = paymentData;

    try {
      // Validate payment data
      this.validatePaymentData(paymentData);

      // Create payment record
      const payment_id = uuidv4();
      const payment = {
        payment_id,
        customer_id,
        merchant_id,
        amount,
        currency,
        settlement_type,
        conversion_preference,
        status: 'pending',
        created_at: new Date().toISOString(),
        metadata,
        conversion_details: null,
        settlement_details: null
      };

      // Store transaction
      this.transactions.set(payment_id, payment);

      // Process payment based on currency type
      const payment_result = await this.processPayment(payment);

      return {
        success: true,
        payment_id,
        status: 'processing',
        conversion_details: payment_result.conversion_details,
        estimated_settlement: payment_result.estimated_settlement,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  }

  // Process payment with conversion
  async processPayment(payment) {
    const { amount, currency, settlement_type, conversion_preference } = payment;

    // If no conversion needed (same currency settlement)
    if (currency === settlement_type) {
      return {
        conversion_details: {
          type: 'none',
          amount: amount,
          fee: 0
        },
        estimated_settlement: {
          amount: amount,
          currency: currency,
          timeframe: '< 10 seconds'
        }
      };
    }

    // Auto-conversion based on current prices
    const conversion = this.utpGateway.calculateConversion(
      currency,
      settlement_type,
      amount
    );

    // Apply conversion preferences
    let conversion_details = {
      from_currency: currency,
      to_currency: settlement_type,
      conversion_rate: conversion.conversion_rate,
      original_amount: amount,
      converted_amount: conversion.net_amount,
      fee: conversion.fee,
      timestamp: new Date().toISOString()
    };

    // Handle mixed settlement
    if (settlement_type === 'mixed') {
      conversion_details = this.calculateMixedSettlement(amount, currency);
    }

    return {
      conversion_details,
      estimated_settlement: {
        amount: conversion.net_amount,
        currency: settlement_type,
        timeframe: this.getSettlementTimeframe(settlement_type)
      }
    };
  }

  // Calculate mixed settlement
  calculateMixedSettlement(amount, currency) {
    // Example: 70% INR, 30% BINR
    const mix_ratio = { inr: 0.7, binr: 0.3 };
    
    const inr_amount = (amount * mix_ratio.inr);
    const binr_amount = (amount * mix_ratio.binr);

    return {
      type: 'mixed',
      breakdown: [
        {
          currency: 'inr',
          amount: inr_amount,
          percentage: 70
        },
        {
          currency: 'binr', 
          amount: binr_amount,
          percentage: 30
        }
      ],
      total_fee: amount * 0.001, // 0.1% total fee
      timestamp: new Date().toISOString()
    };
  }

  // Get settlement timeframe
  getSettlementTimeframe(settlement_type) {
    const timeframes = {
      'inr': '< 2 seconds',
      'binr': '< 5 seconds',
      'bgt': '< 10 seconds',
      'mixed': '< 5 seconds'
    };
    return timeframes[settlement_type] || '< 10 seconds';
  }

  // Validate payment data
  validatePaymentData(data) {
    const required = ['customer_id', 'merchant_id', 'amount', 'currency', 'settlement_type'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate currency
    const supported_currencies = ['bgt', 'bst', 'bpt', 'binr', 'rwa'];
    if (!supported_currencies.includes(data.currency)) {
      throw new Error(`Unsupported currency: ${data.currency}`);
    }

    // Validate settlement type
    const supported_settlements = ['inr', 'binr', 'bgt', 'mixed'];
    if (!supported_settlements.includes(data.settlement_type)) {
      throw new Error(`Unsupported settlement type: ${data.settlement_type}`);
    }

    // Validate amount
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Check minimum amount (₹10)
    if (data.amount < 10) {
      throw new Error('Minimum payment amount is ₹10');
    }
  }

  // Confirm payment
  async confirmPayment(payment_id, customer_signature) {
    try {
      const payment = this.transactions.get(payment_id);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'pending') {
        throw new Error('Payment already processed');
      }

      // Update payment status
      payment.status = 'processing';
      payment.customer_signature = customer_signature;
      payment.processed_at = new Date().toISOString();

      // Execute settlement
      const settlement_result = await this.executeSettlement(payment);

      // Update payment with settlement details
      payment.status = 'completed';
      payment.settlement_details = settlement_result;
      payment.completed_at = new Date().toISOString();

      this.transactions.set(payment_id, payment);

      return {
        success: true,
        payment_id,
        status: 'completed',
        settlement: settlement_result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // Update payment status to failed
      const payment = this.transactions.get(payment_id);
      if (payment) {
        payment.status = 'failed';
        payment.error_message = error.message;
        payment.failed_at = new Date().toISOString();
        this.transactions.set(payment_id, payment);
      }
      
      throw error;
    }
  }

  // Execute settlement
  async executeSettlement(payment) {
    const { conversion_details, settlement_type } = payment;

    if (settlement_type === 'mixed') {
      return this.executeMixedSettlement(conversion_details);
    } else {
      return this.executeSingleSettlement(conversion_details, settlement_type);
    }
  }

  // Execute single settlement
  async executeSingleSettlement(conversion_details, settlement_type) {
    // Simulate settlement execution
    return {
      settlement_id: uuidv4(),
      type: 'single',
      currency: settlement_type,
      amount: conversion_details.converted_amount,
      transaction_hash: this.generateTransactionHash(),
      status: 'completed',
      executed_at: new Date().toISOString(),
      fee: conversion_details.fee
    };
  }

  // Execute mixed settlement
  async executeMixedSettlement(conversion_details) {
    const settlements = conversion_details.breakdown.map(item => ({
      settlement_id: uuidv4(),
      currency: item.currency,
      amount: item.amount,
      transaction_hash: this.generateTransactionHash(),
      status: 'completed',
      executed_at: new Date().toISOString()
    }));

    return {
      settlement_id: uuidv4(),
      type: 'mixed',
      settlements: settlements,
      total_amount: conversion_details.breakdown.reduce((sum, item) => sum + item.amount, 0),
      total_fee: conversion_details.total_fee,
      executed_at: new Date().toISOString()
    };
  }

  // Generate transaction hash (mock)
  generateTransactionHash() {
    return '0x' + Math.random().toString(16).substr(2, 64);
  }

  // Get payment status
  getPaymentStatus(payment_id) {
    const payment = this.transactions.get(payment_id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      payment_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      settlement_type: payment.settlement_type,
      created_at: payment.created_at,
      processed_at: payment.processed_at,
      completed_at: payment.completed_at,
      settlement_details: payment.settlement_details
    };
  }

  // Get payment history for customer or merchant
  getPaymentHistory(identifier, type = 'customer', limit = 50) {
    const history = [];
    
    for (const [payment_id, payment] of this.transactions) {
      if (type === 'customer' && payment.customer_id === identifier) {
        history.push(this.getPaymentStatus(payment_id));
      } else if (type === 'merchant' && payment.merchant_id === identifier) {
        history.push(this.getPaymentStatus(payment_id));
      }
    }

    // Sort by creation date (newest first) and limit results
    return history
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }
}

// Initialize payment processor
const utpGateway = require('./server').utpGateway;
const paymentProcessor = new UTPPaymentProcessor(utpGateway);

// POST /api/payments/create - Create new payment
router.post('/create', async (req, res) => {
  try {
    const result = await paymentProcessor.createPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'PAYMENT_CREATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/payments/confirm - Confirm payment
router.post('/confirm', async (req, res) => {
  try {
    const { payment_id, customer_signature } = req.body;
    const result = await paymentProcessor.confirmPayment(payment_id, customer_signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'PAYMENT_CONFIRMATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/payments/status/:payment_id - Get payment status
router.get('/status/:payment_id', (req, res) => {
  try {
    const result = paymentProcessor.getPaymentStatus(req.params.payment_id);
    res.json(result);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'PAYMENT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/payments/history/:identifier - Get payment history
router.get('/history/:identifier', (req, res) => {
  try {
    const { type = 'customer', limit = 50 } = req.query;
    const result = paymentProcessor.getPaymentHistory(req.params.identifier, type, parseInt(limit));
    res.json({
      success: true,
      history: result,
      count: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'HISTORY_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/payments/supported-currencies - Get supported currencies
router.get('/supported-currencies', (req, res) => {
  res.json({
    success: true,
    supported_currencies: [
      {
        code: 'bgt',
        name: 'Bharat Gold Token',
        symbol: 'BGT',
        asset_type: 'gold',
        minimum_amount: 10, // INR equivalent
        description: '24K gold-backed tokens (1 BGT = 1g gold)'
      },
      {
        code: 'bst',
        name: 'Bharat Silver Token',
        symbol: 'BST',
        asset_type: 'silver',
        minimum_amount: 10,
        description: 'Silver-backed tokens (1 BST = 1g silver)'
      },
      {
        code: 'bpt',
        name: 'Bharat Platinum Token',
        symbol: 'BPT',
        asset_type: 'platinum',
        minimum_amount: 50,
        description: 'Platinum-backed tokens (1 BPT = 1g platinum)'
      },
      {
        code: 'binr',
        name: 'BINR Stablecoin',
        symbol: 'BINR',
        asset_type: 'stablecoin',
        minimum_amount: 1,
        description: '1:1 INR-pegged stablecoin'
      },
      {
        code: 'rwa',
        name: 'RWA-backed Tokens',
        symbol: 'RWA',
        asset_type: 'real_world_assets',
        minimum_amount: 10,
        description: 'Various real-world asset-backed tokens'
      }
    ],
    settlement_options: [
      {
        code: 'inr',
        name: 'Indian Rupee',
        symbol: 'INR',
        type: 'fiat',
        description: 'Direct bank account settlement'
      },
      {
        code: 'binr',
        name: 'BINR Tokens',
        symbol: 'BINR',
        type: 'digital',
        description: 'BINR stablecoin settlement'
      },
      {
        code: 'bgt',
        name: 'Gold Tokens',
        symbol: 'BGT',
        type: 'asset',
        description: 'Gold token settlement for asset accumulation'
      },
      {
        code: 'mixed',
        name: 'Mixed Settlement',
        symbol: 'MIXED',
        type: 'hybrid',
        description: 'Combination of INR, BINR, and Gold tokens'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;