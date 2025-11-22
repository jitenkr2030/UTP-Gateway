const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for merchant endpoints
const merchantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Merchant API rate limit exceeded. Please try again later.'
});

router.use(merchantLimiter);

// Merchant management class
class UTPMerchantManager {
  constructor() {
    this.merchants = new Map();
    this.merchant_configs = new Map();
    this.merchant_analytics = new Map();
  }

  // Register new merchant
  async registerMerchant(merchantData) {
    const {
      business_name,
      business_type,
      contact_person,
      email,
      phone,
      address,
      tax_id,
      bank_details,
      settlement_preferences,
      api_config = {},
      webhook_config = {}
    } = merchantData;

    try {
      // Validate merchant data
      this.validateMerchantData(merchantData);

      // Create merchant
      const merchant_id = uuidv4();
      const merchant = {
        merchant_id,
        business_name,
        business_type,
        contact_person,
        email,
        phone,
        address,
        tax_id,
        bank_details,
        status: 'pending_verification',
        registration_date: new Date().toISOString(),
        kyc_status: 'pending',
        verification_level: 1,
        created_by: 'utp_system'
      };

      // Store merchant
      this.merchants.set(merchant_id, merchant);

      // Create merchant configuration
      const config = {
        merchant_id,
        settlement_preferences: {
          default_settlement: settlement_preferences?.default || 'inr',
          allowed_settlement_types: settlement_preferences?.allowed || ['inr', 'binr'],
          settlement_schedule: settlement_preferences?.schedule || 'instant',
          fee_structure: this.getDefaultFeeStructure(merchantData.business_type),
          minimum_transaction: settlement_preferences?.minimum || 10,
          maximum_transaction: settlement_preferences?.maximum || 1000000
        },
        api_config: {
          webhook_url: api_config.webhook_url || null,
          api_version: api_config.version || 'v1',
          rate_limit: api_config.rate_limit || 1000,
          timeout: api_config.timeout || 30000
        },
        webhook_config: {
          events: webhook_config.events || [
            'payment.completed',
            'payment.failed',
            'settlement.completed',
            'account.updated'
          ],
          retry_attempts: webhook_config.retry_attempts || 3,
          authentication: webhook_config.authentication || 'none'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.merchant_configs.set(merchant_id, config);

      // Initialize analytics
      this.merchant_analytics.set(merchant_id, {
        total_transactions: 0,
        total_volume: 0,
        success_rate: 0,
        average_transaction_value: 0,
        settlement_stats: {
          inr: { count: 0, volume: 0 },
          binr: { count: 0, volume: 0 },
          bgt: { count: 0, volume: 0 }
        },
        monthly_stats: new Map(),
        last_updated: new Date().toISOString()
      });

      return {
        success: true,
        merchant_id,
        status: 'pending_verification',
        kyc_required: true,
        next_steps: [
          'Complete KYC verification',
          'Configure settlement preferences',
          'Test API integration',
          'Go live'
        ],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Merchant registration failed: ${error.message}`);
    }
  }

  // Get merchant details
  getMerchantDetails(merchant_id) {
    const merchant = this.merchants.get(merchant_id);
    const config = this.merchant_configs.get(merchant_id);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return {
      merchant_id,
      business_details: {
        business_name: merchant.business_name,
        business_type: merchant.business_type,
        contact_person: merchant.contact_person,
        email: merchant.email,
        phone: merchant.phone,
        address: merchant.address,
        tax_id: merchant.tax_id
      },
      account_status: {
        status: merchant.status,
        kyc_status: merchant.kyc_status,
        verification_level: merchant.verification_level,
        registration_date: merchant.registration_date
      },
      configuration: config,
      timestamp: new Date().toISOString()
    };
  }

  // Update merchant configuration
  updateMerchantConfig(merchant_id, updates) {
    const config = this.merchant_configs.get(merchant_id);
    if (!config) {
      throw new Error('Merchant configuration not found');
    }

    // Merge updates
    const updated_config = {
      ...config,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.merchant_configs.set(merchant_id, updated_config);

    return {
      success: true,
      merchant_id,
      updated_fields: Object.keys(updates),
      timestamp: new Date().toISOString()
    };
  }

  // Update merchant analytics
  updateMerchantAnalytics(merchant_id, transaction_data) {
    const analytics = this.merchant_analytics.get(merchant_id);
    if (!analytics) {
      throw new Error('Merchant analytics not found');
    }

    const {
      amount,
      currency,
      settlement_type,
      status,
      timestamp
    } = transaction_data;

    // Update basic stats
    analytics.total_transactions += 1;
    analytics.total_volume += amount;

    // Update settlement stats
    if (analytics.settlement_stats[settlement_type]) {
      analytics.settlement_stats[settlement_type].count += 1;
      analytics.settlement_stats[settlement_type].volume += amount;
    }

    // Calculate success rate (simplified)
    const current_success_rate = analytics.success_rate;
    const new_success_rate = status === 'completed' 
      ? (current_success_rate * 0.95 + 0.05) 
      : (current_success_rate * 0.95);
    analytics.success_rate = new_success_rate;

    // Update average transaction value
    analytics.average_transaction_value = analytics.total_volume / analytics.total_transactions;

    // Update monthly stats
    const month_key = new Date(timestamp).toISOString().slice(0, 7); // YYYY-MM
    if (!analytics.monthly_stats.has(month_key)) {
      analytics.monthly_stats.set(month_key, {
        transactions: 0,
        volume: 0,
        success_rate: 0
      });
    }

    const monthly_stats = analytics.monthly_stats.get(month_key);
    monthly_stats.transactions += 1;
    monthly_stats.volume += amount;

    analytics.last_updated = new Date().toISOString();

    // Clean up old monthly stats (keep only last 24 months)
    if (analytics.monthly_stats.size > 24) {
      const sorted_months = Array.from(analytics.monthly_stats.keys()).sort();
      const to_remove = sorted_months.slice(0, analytics.monthly_stats.size - 24);
      to_remove.forEach(month => analytics.monthly_stats.delete(month));
    }

    this.merchant_analytics.set(merchant_id, analytics);

    return analytics;
  }

  // Get merchant analytics
  getMerchantAnalytics(merchant_id, period = '30d') {
    const analytics = this.merchant_analytics.get(merchant_id);
    if (!analytics) {
      throw new Error('Merchant analytics not found');
    }

    // Calculate period stats
    const end_date = new Date();
    const start_date = this.getStartDate(period, end_date);

    const period_stats = this.calculatePeriodStats(analytics, start_date, end_date);

    return {
      merchant_id,
      period,
      date_range: {
        start: start_date.toISOString(),
        end: end_date.toISOString()
      },
      summary: {
        total_transactions: period_stats.transactions,
        total_volume: period_stats.volume,
        success_rate: period_stats.success_rate,
        average_transaction_value: period_stats.average_value
      },
      settlement_breakdown: this.getSettlementBreakdown(analytics),
      monthly_trends: this.getMonthlyTrends(analytics.monthly_stats),
      performance_metrics: this.calculatePerformanceMetrics(analytics),
      timestamp: new Date().toISOString()
    };
  }

  // Validate merchant data
  validateMerchantData(data) {
    const required_fields = [
      'business_name',
      'business_type', 
      'contact_person',
      'email',
      'phone',
      'address',
      'tax_id'
    ];

    for (const field of required_fields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate business types
    const supported_business_types = [
      'individual',
      'proprietorship',
      'partnership',
      'private_limited',
      'public_limited',
      'ngo',
      'government'
    ];

    if (!supported_business_types.includes(data.business_type)) {
      throw new Error(`Unsupported business type: ${data.business_type}`);
    }

    // Validate email format
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number
    const phone_regex = /^[+]?[\d\s-()]+$/;
    if (!phone_regex.test(data.phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  // Get default fee structure
  getDefaultFeeStructure(business_type) {
    const fee_structures = {
      'individual': {
        transaction_fee: 0.003, // 0.3%
        settlement_fee: 0.001,  // 0.1%
        minimum_fee: 1,         // ₹1
        maximum_fee: 1000       // ₹1000
      },
      'proprietorship': {
        transaction_fee: 0.002, // 0.2%
        settlement_fee: 0.001,  // 0.1%
        minimum_fee: 2,         // ₹2
        maximum_fee: 2000       // ₹2000
      },
      'private_limited': {
        transaction_fee: 0.0015, // 0.15%
        settlement_fee: 0.0005,  // 0.05%
        minimum_fee: 5,          // ₹5
        maximum_fee: 5000        // ₹5000
      },
      'public_limited': {
        transaction_fee: 0.001, // 0.1%
        settlement_fee: 0.0005, // 0.05%
        minimum_fee: 10,        // ₹10
        maximum_fee: 10000      // ₹10000
      }
    };

    return fee_structures[business_type] || fee_structures['individual'];
  }

  // Get start date for period
  getStartDate(period, end_date) {
    const start_date = new Date(end_date);
    
    switch (period) {
      case '7d':
        start_date.setDate(start_date.getDate() - 7);
        break;
      case '30d':
        start_date.setDate(start_date.getDate() - 30);
        break;
      case '90d':
        start_date.setDate(start_date.getDate() - 90);
        break;
      case '1y':
        start_date.setFullYear(start_date.getFullYear() - 1);
        break;
      default:
        start_date.setDate(start_date.getDate() - 30);
    }
    
    return start_date;
  }

  // Calculate period stats
  calculatePeriodStats(analytics, start_date, end_date) {
    // This would filter transactions by date range in a real implementation
    // For now, return simplified stats
    return {
      transactions: analytics.total_transactions,
      volume: analytics.total_volume,
      success_rate: analytics.success_rate,
      average_value: analytics.average_transaction_value
    };
  }

  // Get settlement breakdown
  getSettlementBreakdown(analytics) {
    return analytics.settlement_stats;
  }

  // Get monthly trends
  getMonthlyTrends(monthly_stats) {
    const trends = Array.from(monthly_stats.entries())
      .map(([month, stats]) => ({
        month,
        transactions: stats.transactions,
        volume: stats.volume,
        success_rate: stats.success_rate
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  }

  // Calculate performance metrics
  calculatePerformanceMetrics(analytics) {
    return {
      monthly_growth_rate: this.calculateGrowthRate(analytics.monthly_stats),
      settlement_efficiency: this.calculateSettlementEfficiency(analytics.settlement_stats),
      risk_score: this.calculateRiskScore(analytics),
      compliance_score: 95 // Simplified for demo
    };
  }

  // Calculate growth rate
  calculateGrowthRate(monthly_stats) {
    if (monthly_stats.size < 2) return 0;
    
    const months = Array.from(monthly_stats.keys()).sort();
    const last_month = monthly_stats.get(months[months.length - 1]);
    const previous_month = monthly_stats.get(months[months.length - 2]);
    
    if (!last_month || !previous_month) return 0;
    
    return ((last_month.volume - previous_month.volume) / previous_month.volume) * 100;
  }

  // Calculate settlement efficiency
  calculateSettlementEfficiency(settlement_stats) {
    const total_transactions = Object.values(settlement_stats)
      .reduce((sum, stat) => sum + stat.count, 0);
    
    const instant_settlements = settlement_stats.inr?.count || 0;
    
    return total_transactions > 0 ? (instant_settlements / total_transactions) * 100 : 0;
  }

  // Calculate risk score
  calculateRiskScore(analytics) {
    // Simplified risk scoring
    let risk_score = 50; // Base risk
    
    // Adjust based on success rate
    risk_score += (1 - analytics.success_rate) * 30;
    
    // Adjust based on transaction volume
    if (analytics.total_volume > 10000000) risk_score -= 10; // Low risk for high volume
    if (analytics.total_volume < 10000) risk_score += 10;   // Higher risk for low volume
    
    return Math.max(0, Math.min(100, risk_score));
  }

  // List all merchants
  listMerchants(filters = {}) {
    const merchants = Array.from(this.merchants.values());
    
    let filtered_merchants = merchants;
    
    if (filters.status) {
      filtered_merchants = filtered_merchants.filter(m => m.status === filters.status);
    }
    
    if (filters.business_type) {
      filtered_merchants = filtered_merchants.filter(m => m.business_type === filters.business_type);
    }
    
    if (filters.kyc_status) {
      filtered_merchants = filtered_merchants.filter(m => m.kyc_status === filters.kyc_status);
    }
    
    return {
      merchants: filtered_merchants.map(merchant => ({
        merchant_id: merchant.merchant_id,
        business_name: merchant.business_name,
        business_type: merchant.business_type,
        status: merchant.status,
        kyc_status: merchant.kyc_status,
        registration_date: merchant.registration_date
      })),
      total_count: filtered_merchants.length,
      filters_applied: filters,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize merchant manager
const merchantManager = new UTPMerchantManager();

// POST /api/merchant/register - Register new merchant
router.post('/register', async (req, res) => {
  try {
    const result = await merchantManager.registerMerchant(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'MERCHANT_REGISTRATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/merchant/:merchant_id - Get merchant details
router.get('/:merchant_id', (req, res) => {
  try {
    const result = merchantManager.getMerchantDetails(req.params.merchant_id);
    res.json(result);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'MERCHANT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/merchant/:merchant_id/config - Update merchant configuration
router.put('/:merchant_id/config', (req, res) => {
  try {
    const result = merchantManager.updateMerchantConfig(req.params.merchant_id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'CONFIG_UPDATE_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/merchant/:merchant_id/analytics - Get merchant analytics
router.get('/:merchant_id/analytics', (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const result = merchantManager.getMerchantAnalytics(req.params.merchant_id, period);
    res.json(result);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'ANALYTICS_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/merchant - List all merchants (admin only)
router.get('/', (req, res) => {
  try {
    const { status, business_type, kyc_status } = req.query;
    const filters = { status, business_type, kyc_status };
    const result = merchantManager.listMerchants(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'MERCHANT_LIST_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/merchant/:merchant_id/analytics/update - Update merchant analytics
router.post('/:merchant_id/analytics/update', (req, res) => {
  try {
    const result = merchantManager.updateMerchantAnalytics(req.params.merchant_id, req.body);
    res.json({
      success: true,
      analytics: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'ANALYTICS_UPDATE_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;