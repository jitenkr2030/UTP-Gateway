const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const router = express.Router();

// Real-time conversion engine
class UTPConversionEngine {
  constructor() {
    this.price_cache = new Map();
    this.conversion_history = new Map();
    this.slippage_protection = true;
    this.max_slippage = 0.002; // 0.2%
  }

  // Get real-time price for asset
  async getPrice(asset_type) {
    try {
      const cache_key = `price_${asset_type}`;
      const cached_price = this.price_cache.get(cache_key);

      // Return cached price if less than 30 seconds old
      if (cached_price && (Date.now() - cached_price.timestamp) < 30000) {
        return cached_price;
      }

      // Fetch fresh price
      const fresh_price = await this.fetchPriceFromSource(asset_type);
      
      // Cache the price
      this.price_cache.set(cache_key, {
        ...fresh_price,
        timestamp: Date.now()
      });

      return fresh_price;

    } catch (error) {
      console.error(`Price fetch failed for ${asset_type}:`, error);
      // Return cached price or fallback
      return this.getCachedPrice(asset_type) || this.getFallbackPrice(asset_type);
    }
  }

  // Fetch price from external source
  async fetchPriceFromSource(asset_type) {
    // In a real implementation, this would fetch from:
    // - LBMA for gold prices
    // - LME for silver prices  
    // - LPPM for platinum prices
    // - Internal APIs for BINR

    const base_prices = {
      'bgt': 5650.00, // INR per gram (24K gold)
      'bst': 72.50,   // INR per gram (silver)
      'bpt': 3200.00, // INR per gram (platinum)
      'binr': 1.00,   // 1 BINR = 1 INR
      'rwa': 100.00   // Generic RWA token (example)
    };

    const price = base_prices[asset_type] || 100.00;
    const volatility = this.getVolatilityLevel(asset_type);

    // Add some random fluctuation (±0.1%)
    const fluctuation = (Math.random() - 0.5) * 0.002;
    const adjusted_price = price * (1 + fluctuation);

    return {
      asset_type,
      price: adjusted_price,
      currency: 'INR',
      source: this.getPriceSource(asset_type),
      timestamp: new Date().toISOString(),
      volatility,
      confidence: 0.95
    };
  }

  // Get cached price
  getCachedPrice(asset_type) {
    const cache_key = `price_${asset_type}`;
    const cached = this.price_cache.get(cache_key);
    return cached ? {
      ...cached,
      source: 'cache',
      confidence: 0.70
    } : null;
  }

  // Get fallback price (static prices)
  getFallbackPrice(asset_type) {
    const fallback_prices = {
      'bgt': 5650.00,
      'bst': 72.50,
      'bpt': 3200.00,
      'binr': 1.00,
      'rwa': 100.00
    };

    return {
      asset_type,
      price: fallback_prices[asset_type] || 100.00,
      currency: 'INR',
      source: 'fallback',
      timestamp: new Date().toISOString(),
      volatility: 'unknown',
      confidence: 0.50
    };
  }

  // Convert between assets
  async convert(from_asset, to_asset, amount, options = {}) {
    try {
      // Validate conversion
      this.validateConversion(from_asset, to_asset);

      // Get current prices
      const from_price_data = await this.getPrice(from_asset);
      const to_price_data = await this.getPrice(to_asset);

      // Calculate conversion
      const conversion = this.calculateConversion(
        from_price_data,
        to_price_data,
        amount,
        options
      );

      // Store conversion in history
      this.storeConversionHistory(from_asset, to_asset, amount, conversion);

      return conversion;

    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  // Calculate conversion details
  calculateConversion(from_price_data, to_price_data, amount, options) {
    const from_price = from_price_data.price;
    const to_price = to_price_data.price;

    // Base conversion
    const conversion_rate = from_price / to_price;
    const converted_amount = amount * conversion_rate;

    // Calculate fees
    const conversion_fee_rate = options.fee_rate || 0.0005; // 0.05%
    const conversion_fee = amount * conversion_fee_rate;

    // Slippage protection
    let actual_conversion_rate = conversion_rate;
    let slippage = 0;

    if (this.slippage_protection && options.slippage_protection !== false) {
      const { adjusted_rate, slippage_amount } = this.applySlippageProtection(
        conversion_rate,
        amount,
        to_price_data.volatility
      );
      actual_conversion_rate = adjusted_rate;
      slippage = slippage_amount;
    }

    const final_converted_amount = amount * actual_conversion_rate - conversion_fee;
    const total_fee = conversion_fee + slippage;

    return {
      conversion_id: uuidv4(),
      from_asset: {
        type: from_price_data.asset_type,
        amount: amount,
        price_per_unit: from_price,
        currency: from_price_data.currency
      },
      to_asset: {
        type: to_price_data.asset_type,
        amount: final_converted_amount,
        price_per_unit: to_price,
        currency: to_price_data.currency
      },
      conversion_rate: actual_conversion_rate,
      original_rate: conversion_rate,
      fees: {
        conversion_fee: conversion_fee,
        slippage: slippage,
        total_fee: total_fee,
        fee_rate: conversion_fee_rate + (slippage / amount)
      },
      market_impact: this.calculateMarketImpact(amount, to_price_data),
      timestamps: {
        calculated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 5000).toISOString(), // 5 second validity
      },
      price_data: {
        from_price_source: from_price_data.source,
        to_price_source: to_price_data.source,
        price_confidence: Math.min(from_price_data.confidence, to_price_data.confidence)
      }
    };
  }

  // Apply slippage protection
  applySlippageProtection(conversion_rate, amount, volatility) {
    const volatility_multipliers = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'unknown': 1.0
    };

    const multiplier = volatility_multipliers[volatility] || 1.0;
    const max_slippage = this.max_slippage * multiplier;

    // Calculate potential slippage
    const potential_slippage = Math.random() * max_slippage * 0.5; // Half of max for protection
    const adjusted_rate = conversion_rate * (1 - potential_slippage);
    const slippage_amount = amount * potential_slippage;

    return {
      adjusted_rate,
      slippage_amount
    };
  }

  // Calculate market impact
  calculateMarketImpact(amount, to_price_data) {
    // Higher amounts have more market impact
    const base_impact = 0.0001; // 0.01%
    const impact_multiplier = Math.log10(amount + 1) * 0.00005;
    
    return {
      percentage: base_impact + impact_multiplier,
      absolute: (base_impact + impact_multiplier) * to_price_data.price,
      assessment: this.getMarketImpactLevel(base_impact + impact_multiplier)
    };
  }

  // Get market impact level
  getMarketImpactLevel(impact) {
    if (impact < 0.0005) return 'minimal';
    if (impact < 0.001) return 'low';
    if (impact < 0.002) return 'medium';
    return 'high';
  }

  // Validate conversion
  validateConversion(from_asset, to_asset) {
    const supported_assets = ['bgt', 'bst', 'bpt', 'binr', 'rwa'];
    
    if (!supported_assets.includes(from_asset)) {
      throw new Error(`Unsupported source asset: ${from_asset}`);
    }
    
    if (!supported_assets.includes(to_asset)) {
      throw new Error(`Unsupported target asset: ${to_asset}`);
    }

    if (from_asset === to_asset) {
      throw new Error('Source and target assets cannot be the same');
    }
  }

  // Get volatility level for asset
  getVolatilityLevel(asset_type) {
    const volatility_map = {
      'bgt': 'low',    // Gold is relatively stable
      'bst': 'medium', // Silver has medium volatility
      'bpt': 'high',   // Platinum is more volatile
      'binr': 'minimal', // Stablecoin should be stable
      'rwa': 'medium'  // RWA varies by asset type
    };
    return volatility_map[asset_type] || 'medium';
  }

  // Get price source for asset
  getPriceSource(asset_type) {
    const source_map = {
      'bgt': 'LBMA/MMEX',
      'bst': 'LME',
      'bpt': 'LPPM',
      'binr': 'BINR Network',
      'rwa': 'UTP Internal'
    };
    return source_map[asset_type] || 'UTP Internal';
  }

  // Store conversion in history
  storeConversionHistory(from_asset, to_asset, amount, conversion) {
    const history_key = `conversion_${Date.now()}`;
    this.conversion_history.set(history_key, {
      from_asset,
      to_asset,
      amount,
      conversion,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10,000 conversions
    if (this.conversion_history.size > 10000) {
      const first_key = this.conversion_history.keys().next().value;
      this.conversion_history.delete(first_key);
    }
  }

  // Get conversion rate without executing
  async getConversionRate(from_asset, to_asset) {
    try {
      const from_price = await this.getPrice(from_asset);
      const to_price = await this.getPrice(to_asset);

      return {
        from_asset,
        to_asset,
        rate: from_price.price / to_price.price,
        from_price: from_price,
        to_price: to_price,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get conversion rate: ${error.message}`);
    }
  }

  // Get all current prices
  async getAllPrices() {
    const assets = ['bgt', 'bst', 'bpt', 'binr', 'rwa'];
    const prices = {};

    for (const asset of assets) {
      try {
        prices[asset] = await this.getPrice(asset);
      } catch (error) {
        prices[asset] = {
          asset_type: asset,
          error: error.message,
          fallback_price: this.getFallbackPrice(asset)
        };
      }
    }

    return {
      prices,
      last_updated: new Date().toISOString(),
      total_assets: assets.length,
      successful_fetches: Object.values(prices).filter(p => !p.error).length
    };
  }

  // Get conversion history
  getConversionHistory(limit = 100) {
    const history = Array.from(this.conversion_history.entries())
      .map(([key, value]) => ({
        conversion_id: key,
        ...value
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return {
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize conversion engine
const conversionEngine = new UTPConversionEngine();

// GET /api/conversion/price/:asset - Get price for specific asset
router.get('/price/:asset', async (req, res) => {
  try {
    const { asset } = req.params;
    const price_data = await conversionEngine.getPrice(asset);
    res.json({
      success: true,
      price: price_data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'PRICE_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversion/rate/:from/:to - Get conversion rate
router.get('/rate/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    const rate_data = await conversionEngine.getConversionRate(from, to);
    res.json({
      success: true,
      rate: rate_data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'RATE_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/conversion/calculate - Calculate conversion
router.post('/calculate', async (req, res) => {
  try {
    const { from_asset, to_asset, amount, options = {} } = req.body;
    const conversion = await conversionEngine.convert(from_asset, to_asset, amount, options);
    res.json({
      success: true,
      conversion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'CONVERSION_CALCULATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversion/prices - Get all current prices
router.get('/prices', async (req, res) => {
  try {
    const all_prices = await conversionEngine.getAllPrices();
    res.json({
      success: true,
      ...all_prices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'PRICES_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversion/history - Get conversion history
router.get('/history', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = conversionEngine.getConversionHistory(parseInt(limit));
    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'HISTORY_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversion/supported-pairs - Get supported conversion pairs
router.get('/supported-pairs', (req, res) => {
  const supported_pairs = [
    { from: 'bgt', to: 'binr', description: 'Gold to INR Stablecoin' },
    { from: 'bst', to: 'binr', description: 'Silver to INR Stablecoin' },
    { from: 'bpt', to: 'binr', description: 'Platinum to INR Stablecoin' },
    { from: 'binr', to: 'bgt', description: 'INR Stablecoin to Gold' },
    { from: 'binr', to: 'bst', description: 'INR Stablecoin to Silver' },
    { from: 'binr', to: 'bpt', description: 'INR Stablecoin to Platinum' },
    { from: 'bgt', to: 'bst', description: 'Gold to Silver' },
    { from: 'bst', to: 'bgt', description: 'Silver to Gold' },
    { from: 'bgt', to: 'bpt', description: 'Gold to Platinum' },
    { from: 'bpt', to: 'bgt', description: 'Platinum to Gold' },
    { from: 'bst', to: 'bpt', description: 'Silver to Platinum' },
    { from: 'bpt', to: 'bst', description: 'Platinum to Silver' },
    { from: 'rwa', to: 'binr', description: 'RWA Tokens to INR Stablecoin' },
    { from: 'binr', to: 'rwa', description: 'INR Stablecoin to RWA Tokens' }
  ];

  res.json({
    success: true,
    supported_pairs,
    total_pairs: supported_pairs.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;