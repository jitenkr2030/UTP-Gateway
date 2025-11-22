const axios = require('axios');

/**
 * UTP Conversion Service
 * Handles real-time price conversion between different asset tokens
 * Supports BGT, BST, BPT, BINR, and RWA tokens
 */
class UTPConversionService {
  constructor() {
    this.price_cache = new Map();
    this.conversion_history = new Map();
    this.slippage_protection = true;
    this.max_slippage = 0.002; // 0.2%
    this.price_sources = {
      'bgt': 'LBMA Gold Fix',
      'bst': 'LME Silver',
      'bpt': 'LPPM Platinum',
      'binr': 'Fixed Rate',
      'rwa': 'Dynamic Market'
    };
    
    // Base prices (INR per unit)
    this.base_prices = {
      'bgt': 5650.00, // Gold per gram
      'bst': 72.50,   // Silver per gram  
      'bpt': 3200.00, // Platinum per gram
      'binr': 1.00,   // 1 BINR = 1 INR
      'rwa': 100.00   // Generic RWA token
    };
  }

  /**
   * Get real-time price for an asset
   * @param {string} asset_type - Type of asset (bgt, bst, bpt, binr, rwa)
   * @returns {Promise<Object>} Price information
   */
  async getPrice(asset_type) {
    try {
      const cache_key = `price_${asset_type}`;
      const cached_price = this.price_cache.get(cache_key);

      // Return cached price if less than 30 seconds old
      if (cached_price && (Date.now() - cached_price.timestamp) < 30000) {
        return {
          ...cached_price,
          source: 'cache'
        };
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
      return this.getFallbackPrice(asset_type);
    }
  }

  /**
   * Convert amount from one asset to another
   * @param {string} from_asset - Source asset
   * @param {string} to_asset - Target asset
   * @param {number} amount - Amount to convert
   * @returns {Promise<Object>} Conversion result
   */
  async convertAmount(from_asset, to_asset, amount) {
    try {
      if (from_asset === to_asset) {
        return {
          from_amount: amount,
          to_amount: amount,
          rate: 1.0,
          fee: 0,
          net_amount: amount,
          slippage: 0
        };
      }

      // Get current prices
      const from_price = await this.getPrice(from_asset);
      const to_price = await this.getPrice(to_asset);

      // Calculate conversion rate
      const rate = from_price.price / to_price.price;
      
      // Calculate initial converted amount
      let converted_amount = amount * rate;

      // Apply slippage protection
      const slippage = this.calculateSlippage(from_asset, to_asset, rate);
      const slippage_amount = converted_amount * slippage;

      // Calculate fee (0.25% for UTP Gateway)
      const fee_rate = 0.0025;
      const fee_amount = (converted_amount - slippage_amount) * fee_rate;

      // Final amount after slippage and fees
      const net_amount = converted_amount - slippage_amount - fee_amount;

      return {
        from_asset,
        to_asset,
        from_amount: amount,
        to_amount: Math.round(converted_amount * 100) / 100,
        rate: Math.round(rate * 100000) / 100000,
        slippage: Math.round(slippage * 10000) / 100, // percentage
        fee_rate: fee_rate * 100, // percentage
        fee: Math.round(fee_amount * 100) / 100,
        net_amount: Math.round(net_amount * 100) / 100,
        price_from: from_price.price,
        price_to: to_price.price,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  /**
   * Get multiple token prices at once
   * @param {Array} assets - Array of asset types
   * @returns {Promise<Object>} Object with all prices
   */
  async getMultiplePrices(assets) {
    const prices = {};
    
    await Promise.all(
      assets.map(async (asset) => {
        try {
          prices[asset] = await this.getPrice(asset);
        } catch (error) {
          prices[asset] = this.getFallbackPrice(asset);
        }
      })
    );

    return prices;
  }

  /**
   * Fetch price from external source
   * @private
   */
  async fetchPriceFromSource(asset_type) {
    // In production, this would fetch from real APIs:
    // - LBMA for gold prices
    // - LME for silver prices  
    // - LPPM for platinum prices
    // - Internal APIs for BINR

    const base_price = this.base_prices[asset_type] || 100.00;
    const volatility = this.getVolatilityLevel(asset_type);

    // Add realistic market fluctuation (±0.1%)
    const fluctuation = (Math.random() - 0.5) * 0.002;
    const adjusted_price = base_price * (1 + fluctuation);

    return {
      asset_type,
      price: Math.round(adjusted_price * 100) / 100,
      currency: 'INR',
      source: this.price_sources[asset_type],
      timestamp: new Date().toISOString(),
      volatility,
      confidence: 0.95
    };
  }

  /**
   * Calculate expected slippage
   * @private
   */
  calculateSlippage(from_asset, to_asset, rate) {
    if (!this.slippage_protection) return 0;

    const from_volatility = this.getVolatilityLevel(from_asset);
    const to_volatility = this.getVolatilityLevel(to_asset);
    const avg_volatility = (from_volatility + to_volatility) / 2;

    // Slippage is proportional to volatility
    const slippage = Math.min(avg_volatility * 0.1, this.max_slippage);
    return slippage;
  }

  /**
   * Get volatility level for asset
   * @private
   */
  getVolatilityLevel(asset_type) {
    const volatility_map = {
      'bgt': 0.001, // Gold is stable
      'bst': 0.003, // Silver more volatile
      'bpt': 0.005, // Platinum most volatile
      'binr': 0.0001, // Stablecoin is stable
      'rwa': 0.002  // RWA tokens
    };

    return volatility_map[asset_type] || 0.002;
  }

  /**
   * Get fallback price when external source fails
   * @private
   */
  getFallbackPrice(asset_type) {
    return {
      asset_type,
      price: this.base_prices[asset_type] || 100.00,
      currency: 'INR',
      source: 'fallback',
      timestamp: new Date().toISOString(),
      volatility: this.getVolatilityLevel(asset_type),
      confidence: 0.60
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'UTP Conversion Service',
      status: 'active',
      uptime: '99.99%',
      cache_size: this.price_cache.size,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Get current token price for quick access
   */
  getTokenPrice(token) {
    const cached = this.price_cache.get(`price_${token}`);
    return cached ? cached.price : this.base_prices[token];
  }
}

module.exports = UTPConversionService;