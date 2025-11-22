#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const merchantRoutes = require('./routes/merchant');
const settlementRoutes = require('./routes/settlement');
const conversionRoutes = require('./routes/conversion');
const integrationRoutes = require('./routes/integration');
const adminRoutes = require('./routes/admin');

// Import services
const UTPConversionService = require('./services/conversion');
const UTPSettlementService = require('./services/settlement');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize services
const conversionService = new UTPConversionService();
const settlementService = new UTPSettlementService();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'UTP Gateway API',
    version: '1.0.0',
    features: [
      'Multi-asset payments',
      'Real-time conversion',
      'Instant settlement',
      'Cross-chain integration'
    ],
    services: {
      conversion: conversionService.getStatus(),
      settlement: settlementService.getStatus()
    }
  });
});

// UTP System Status
app.get('/status', (req, res) => {
  res.json({
    utp_gateway: 'active',
    supported_tokens: {
      bgt: { name: 'Bharat Gold Token', status: 'active', price_feed: 'live' },
      bst: { name: 'Bharat Silver Token', status: 'active', price_feed: 'live' },
      bpt: { name: 'Bharat Platinum Token', status: 'active', price_feed: 'live' },
      binr: { name: 'BINR Stablecoin', status: 'active', price_feed: 'fixed' },
      rwa: { name: 'RWA-backed Tokens', status: 'active', price_feed: 'dynamic' }
    },
    settlement_options: {
      inr: { name: 'Indian Rupee', type: 'fiat', status: 'active' },
      binr: { name: 'BINR Tokens', type: 'digital', status: 'active' },
      bgt: { name: 'Gold Tokens', type: 'asset', status: 'active' },
      mixed: { name: 'Mixed Settlement', type: 'hybrid', status: 'active' }
    },
    uptime: '99.99%',
    last_updated: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/admin', adminRoutes);

// Frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('UTP Gateway Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    error_code: 'UTP_500',
    timestamp: new Date().toISOString(),
    request_id: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    error_code: 'UTP_404',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🏆 UTP Gateway Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🔍 Status: http://localhost:${PORT}/status
🌐 Frontend: http://localhost:${PORT}
🛡️ Dashboard: http://localhost:${PORT}/dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Supported Tokens:
• BGT (Bharat Gold Token) - ₹${conversionService.getTokenPrice('bgt')}/g
• BST (Bharat Silver Token) - ₹${conversionService.getTokenPrice('bst')}/g  
• BPT (Bharat Platinum Token) - ₹${conversionService.getTokenPrice('bpt')}/g
• BINR (BINR Stablecoin) - ₹${conversionService.getTokenPrice('binr')}/INR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Instant Settlement Ready
💰 Multi-asset Payment Support
🔒 Secure API with Rate Limiting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

module.exports = app;