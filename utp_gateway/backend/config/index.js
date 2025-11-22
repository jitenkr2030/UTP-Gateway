/**
 * UTP Gateway Configuration
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3002,
    node_env: process.env.NODE_ENV || 'development',
    frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refresh_secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expires_in: process.env.JWT_EXPIRES_IN || '24h',
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Rate Limiting
  rateLimit: {
    window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    auth_limit: parseInt(process.env.AUTH_RATE_LIMIT) || 10,
    payment_limit: parseInt(process.env.PAYMENT_RATE_LIMIT) || 100,
    conversion_limit: parseInt(process.env.CONVERSION_RATE_LIMIT) || 1000,
    settlement_limit: parseInt(process.env.SETTLEMENT_RATE_LIMIT) || 50,
    admin_limit: parseInt(process.env.ADMIN_RATE_LIMIT) || 5
  },

  // Hyperledger Fabric Configuration
  fabric: {
    connection_profile: process.env.FABRIC_CONNECTION_PROFILE || './config/fabric-connection.json',
    channel_name: process.env.FABRIC_CHANNEL_NAME || 'mainchannel',
    chaincode_name: process.env.FABRIC_CHAINCODE_NAME || 'utp-gateway',
    network_config_path: path.join(__dirname, '../../network/'),
    wallet_path: path.join(__dirname, '../../wallet/')
  },

  // Price Feed Configuration
  priceFeed: {
    update_interval: parseInt(process.env.PRICE_UPDATE_INTERVAL) || 30000, // 30 seconds
    bgt_price_api: process.env.BGT_PRICE_API || 'https://api.lbma.org.uk/gold/pricing',
    bst_price_api: process.env.BST_PRICE_API || 'https://api.lme.co.uk/lists',
    bpt_price_api: process.env.BPT_PRICE_API || 'https://api.lppm.org/platinum/pricing',
    binr_price_source: process.env.BINR_PRICE_SOURCE || 'fixed',
    
    // Base prices (INR per unit)
    base_prices: {
      bgt: 5650.00, // Gold per gram
      bst: 72.50,   // Silver per gram
      bpt: 3200.00, // Platinum per gram
      binr: 1.00,   // 1 BINR = 1 INR
      rwa: 100.00   // Generic RWA token
    }
  },

  // Settlement Configuration
  settlement: {
    inr_min: parseFloat(process.env.INR_SETTLEMENT_MIN) || 10,
    inr_max: parseFloat(process.env.INR_SETTLEMENT_MAX) || 1000000,
    binr_min: parseFloat(process.env.BINR_SETTLEMENT_MIN) || 1,
    binr_max: parseFloat(process.env.BINR_SETTLEMENT_MAX) || 100000,
    batch_size: parseInt(process.env.SETTLEMENT_BATCH_SIZE) || 100,
    
    // Settlement methods
    methods: {
      inr_upi: {
        name: 'UPI Transfer',
        fee_rate: 0.001, // 0.1%
        min_amount: 10,
        max_amount: 100000
      },
      inr_neft: {
        name: 'NEFT Transfer',
        fee_rate: 0.002, // 0.2%
        min_amount: 1,
        max_amount: 10000000
      },
      binr_transfer: {
        name: 'BINR Token Transfer',
        fee_rate: 0.001, // 0.1%
        min_amount: 1,
        max_amount: 1000000
      },
      bgt_transfer: {
        name: 'Gold Token Transfer',
        fee_rate: 0.0015, // 0.15%
        min_amount: 0.1,
        max_amount: 1000
      }
    }
  },

  // Bank Integration
  bank: {
    api_url: process.env.BANK_API_URL || 'https://api.bank.in/sandbox',
    api_key: process.env.BANK_API_KEY || 'your-bank-api-key',
    webhook_secret: process.env.BANK_WEBHOOK_SECRET || 'your-bank-webhook-secret',
    timeout: 30000 // 30 seconds
  },

  // Database Configuration
  database: {
    type: process.env.DB_TYPE || 'mongodb',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 27017,
    name: process.env.DB_NAME || 'utp_gateway',
    user: process.env.DB_USER || 'utp_user',
    password: process.env.DB_PASS || 'utp_password',
    uri: process.env.DATABASE_URL || null
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    password: process.env.SMTP_PASS || 'your-app-password'
  },

  // Security Configuration
  security: {
    cors_origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    helmet_enabled: process.env.HELMET_ENABLED !== 'false',
    csrf_enabled: process.env.CSRF_ENABLED === 'true',
    encryption_key: process.env.ENCRYPTION_KEY || 'default-encryption-key'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/utp-gateway.log',
    max_size: process.env.LOG_MAX_SIZE || '10m',
    max_files: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // Feature Flags
  features: {
    multi_token_payments: process.env.ENABLE_MULTI_TOKEN_PAYMENTS !== 'false',
    instant_settlement: process.env.ENABLE_INSTANT_SETTLEMENT !== 'false',
    rwa_tokens: process.env.ENABLE_RWA_TOKENS !== 'false',
    mixed_settlement: process.env.ENABLE_MIXED_SETTLEMENT !== 'false',
    real_time_conversion: process.env.ENABLE_REAL_TIME_CONVERSION !== 'false',
    webhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    monitoring: process.env.MONITORING_ENABLED !== 'false',
    analytics: process.env.ANALYTICS_ENABLED !== 'false'
  },

  // UTP Gateway Specific
  utp: {
    supported_tokens: (process.env.SUPPORTED_TOKENS || 'BGT,BST,BPT,BINR,RWA').split(','),
    supported_settlements: (process.env.SUPPORTED_SETTLEMENTS || 'INR,BINR,BGT,MIXED').split(','),
    default_settlement: process.env.DEFAULT_SETTLEMENT || 'INR',
    max_payment_amount: parseFloat(process.env.MAX_PAYMENT_AMOUNT) || 10000000,
    min_payment_amount: parseFloat(process.env.MIN_PAYMENT_AMOUNT) || 1
  },

  // Contact Information
  contact: {
    support_email: process.env.SUPPORT_EMAIL || 'support@utpgateway.com',
    technical_docs_url: process.env.TECHNICAL_DOCS_URL || 'https://docs.utpgateway.com',
    api_docs_url: process.env.API_DOCS_URL || 'https://api.utpgateway.com/docs'
  },

  // Development/Production flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

// Validate critical configuration
const validateConfig = () => {
  const required = ['jwt.secret', 'jwt.refresh_secret'];
  const missing = required.filter(key => {
    const parts = key.split('.');
    let value = config;
    for (const part of parts) {
      value = value[part];
      if (value === undefined) break;
    }
    return !value || value.includes('default');
  });

  if (missing.length > 0 && !config.isDevelopment) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

validateConfig();

module.exports = config;