const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Admin management class
class UTPAdminManager {
  constructor() {
    this.system_stats = new Map();
    this.audit_logs = new Map();
    this.system_alerts = new Map();
    this.configurations = new Map();
    this.user_sessions = new Map();
  }

  // Get system overview
  getSystemOverview() {
    const overview = {
      system_health: {
        status: 'healthy',
        uptime: this.calculateUptime(),
        version: '1.0.0',
        last_restart: '2025-11-21T10:00:00Z'
      },
      performance_metrics: {
        total_requests_24h: 125000,
        average_response_time: 145, // ms
        success_rate: 99.95,
        error_rate: 0.05,
        throughput: 850 // requests per second
      },
      payment_stats: {
        total_transactions_24h: 15000,
        total_volume_24h: 125000000, // ₹125 Crores
        successful_payments: 14925,
        failed_payments: 75,
        conversion_rate: 99.5
      },
      token_stats: {
        bgt: { circulation: 1000000, volume_24h: 15000000 },
        bst: { circulation: 500000, volume_24h: 8000000 },
        bpt: { circulation: 100000, volume_24h: 2000000 },
        binr: { circulation: 10000000, volume_24h: 50000000 }
      },
      merchant_stats: {
        total_merchants: 50000,
        active_merchants: 45000,
        new_registrations_24h: 150,
        suspended_merchants: 125
      },
      user_stats: {
        total_users: 500000,
        active_users_24h: 75000,
        new_registrations_24h: 250,
        verification_rate: 85
      },
      infrastructure: {
        database_status: 'healthy',
        blockchain_connections: 5,
        cache_hit_rate: 95.5,
        storage_usage: 68, // percentage
        api_rate_limits: 'active'
      }
    };

    return overview;
  }

  // Get detailed analytics
  getDetailedAnalytics(timeframe = '24h') {
    // In a real implementation, this would query actual analytics data
    const analytics = {
      timeframe,
      payment_analytics: {
        hourly_breakdown: this.generateHourlyBreakdown(),
        currency_distribution: {
          bgt: 45,
          binr: 30,
          bst: 15,
          bpt: 8,
          rwa: 2
        },
        settlement_methods: {
          inr_upi: 70,
          binr_transfer: 20,
          bgt_transfer: 8,
          mixed: 2
        },
        transaction_sizes: {
          small: 60, // < ₹1000
          medium: 30, // ₹1000-₹10000
          large: 10 // > ₹10000
        }
      },
      merchant_analytics: {
        top_merchants: this.generateTopMerchants(),
        business_type_distribution: this.generateBusinessTypeDistribution(),
        verification_status: {
          verified: 80,
          pending: 15,
          rejected: 5
        }
      },
      technical_metrics: {
        api_performance: {
          average_response_time: 145,
          p95_response_time: 250,
          p99_response_time: 500,
          throughput: 850
        },
        error_breakdown: {
          client_errors: 70,
          server_errors: 20,
          network_errors: 10
        },
        uptime_sla: {
          last_30_days: 99.97,
          last_7_days: 99.99,
          last_24_hours: 100
        }
      }
    };

    return analytics;
  }

  // Generate audit log
  generateAuditLog(action_data) {
    const {
      admin_id,
      action,
      target_type, // 'merchant', 'user', 'payment', 'system'
      target_id,
      details = {},
      ip_address,
      user_agent
    } = action_data;

    const log_entry = {
      log_id: uuidv4(),
      admin_id,
      action,
      target_type,
      target_id,
      details,
      ip_address,
      user_agent,
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverity(action)
    };

    this.audit_logs.set(log_entry.log_id, log_entry);
    
    // Keep only last 10,000 log entries
    if (this.audit_logs.size > 10000) {
      const first_key = this.audit_logs.keys().next().value;
      this.audit_logs.delete(first_key);
    }

    return log_entry;
  }

  // Get audit logs
  getAuditLogs(filters = {}, limit = 100) {
    let logs = Array.from(this.audit_logs.values());

    // Apply filters
    if (filters.admin_id) {
      logs = logs.filter(log => log.admin_id === filters.admin_id);
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.target_type) {
      logs = logs.filter(log => log.target_type === filters.target_type);
    }

    if (filters.start_date) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.start_date));
    }

    if (filters.end_date) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.end_date));
    }

    // Sort by timestamp (newest first) and limit
    logs = logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return {
      logs,
      total_count: logs.length,
      filters_applied: filters,
      timestamp: new Date().toISOString()
    };
  }

  // Create system alert
  createSystemAlert(alert_data) {
    const {
      type, // 'error', 'warning', 'info', 'critical'
      category, // 'payment', 'merchant', 'system', 'security'
      title,
      description,
      severity = 'medium',
      metadata = {}
    } = alert_data;

    const alert_id = uuidv4();
    const alert = {
      alert_id,
      type,
      category,
      title,
      description,
      severity,
      metadata,
      status: 'active',
      created_at: new Date().toISOString(),
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_by: null,
      resolved_at: null
    };

    this.system_alerts.set(alert_id, alert);

    return alert;
  }

  // Get system alerts
  getSystemAlerts(status = 'active', limit = 50) {
    let alerts = Array.from(this.system_alerts.values());

    if (status !== 'all') {
      alerts = alerts.filter(alert => alert.status === status);
    }

    // Sort by creation time and severity
    alerts = alerts
      .sort((a, b) => {
        const severity_order = { critical: 4, high: 3, medium: 2, low: 1 };
        const severity_diff = (severity_order[b.severity] || 0) - (severity_order[a.severity] || 0);
        if (severity_diff !== 0) return severity_diff;
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(0, limit);

    return {
      alerts,
      total_count: alerts.length,
      status_filter: status,
      timestamp: new Date().toISOString()
    };
  }

  // Acknowledge alert
  acknowledgeAlert(alert_id, admin_id) {
    const alert = this.system_alerts.get(alert_id);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'acknowledged';
    alert.acknowledged_by = admin_id;
    alert.acknowledged_at = new Date().toISOString();

    this.system_alerts.set(alert_id, alert);

    return alert;
  }

  // Resolve alert
  resolveAlert(alert_id, admin_id, resolution_notes = '') {
    const alert = this.system_alerts.get(alert_id);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'resolved';
    alert.resolved_by = admin_id;
    alert.resolved_at = new Date().toISOString();
    alert.resolution_notes = resolution_notes;

    this.system_alerts.set(alert_id, alert);

    return alert;
  }

  // Update system configuration
  updateSystemConfig(config_data) {
    const {
      admin_id,
      config_key,
      config_value,
      description = ''
    } = config_data;

    const config = {
      config_key,
      config_value,
      description,
      updated_by: admin_id,
      updated_at: new Date().toISOString(),
      version: Date.now() // Simple versioning
    };

    this.configurations.set(config_key, config);

    // Generate audit log
    this.generateAuditLog({
      admin_id,
      action: 'config_update',
      target_type: 'system',
      target_id: config_key,
      details: { old_value: this.configurations.get(config_key)?.config_value, new_value: config_value }
    });

    return config;
  }

  // Get system configuration
  getSystemConfig() {
    const configs = Object.fromEntries(this.configurations);

    return {
      configurations: configs,
      total_configs: Object.keys(configs).length,
      timestamp: new Date().toISOString()
    };
  }

  // Calculate uptime
  calculateUptime() {
    // In a real implementation, this would track actual uptime
    const uptime_seconds = 86400 * 15; // 15 days
    const days = Math.floor(uptime_seconds / 86400);
    const hours = Math.floor((uptime_seconds % 86400) / 3600);
    const minutes = Math.floor((uptime_seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  }

  // Calculate severity based on action
  calculateSeverity(action) {
    const severity_map = {
      'merchant_suspend': 'high',
      'merchant_activate': 'medium',
      'payment_refund': 'high',
      'config_update': 'low',
      'system_maintenance': 'medium',
      'security_incident': 'critical'
    };

    return severity_map[action] || 'medium';
  }

  // Generate hourly breakdown (mock data)
  generateHourlyBreakdown() {
    const breakdown = [];
    for (let hour = 0; hour < 24; hour++) {
      breakdown.push({
        hour,
        transactions: Math.floor(Math.random() * 1000) + 500,
        volume: Math.floor(Math.random() * 5000000) + 2000000
      });
    }
    return breakdown;
  }

  // Generate top merchants (mock data)
  generateTopMerchants() {
    return [
      { merchant_id: 'm_001', business_name: 'TechCorp Solutions', volume: 15000000 },
      { merchant_id: 'm_002', business_name: 'RetailChain Inc', volume: 12500000 },
      { merchant_id: 'm_003', business_name: 'ServiceHub Ltd', volume: 10000000 },
      { merchant_id: 'm_004', business_name: 'DigitalStore', volume: 8000000 },
      { merchant_id: 'm_005', business_name: 'MarketPlace Pro', volume: 6000000 }
    ];
  }

  // Generate business type distribution
  generateBusinessTypeDistribution() {
    return {
      private_limited: 35,
      proprietorship: 25,
      individual: 20,
      partnership: 15,
      public_limited: 5
    };
  }

  // Get user sessions (admin monitoring)
  getUserSessions() {
    const sessions = Array.from(this.user_sessions.values());
    
    return {
      total_sessions: sessions.length,
      active_sessions: sessions.filter(s => s.status === 'active').length,
      sessions: sessions.slice(0, 20), // Latest 20 sessions
      timestamp: new Date().toISOString()
    };
  }

  // Record user session
  recordUserSession(session_data) {
    const {
      user_id,
      session_id,
      ip_address,
      user_agent,
      login_time
    } = session_data;

    this.user_sessions.set(session_id, {
      user_id,
      session_id,
      ip_address,
      user_agent,
      login_time,
      last_activity: new Date().toISOString(),
      status: 'active'
    });
  }

  // End user session
  endUserSession(session_id) {
    const session = this.user_sessions.get(session_id);
    if (session) {
      session.status = 'ended';
      session.end_time = new Date().toISOString();
      this.user_sessions.set(session_id, session);
    }
  }
}

// Initialize admin manager
const adminManager = new UTPAdminManager();

// GET /api/admin/system/overview - Get system overview
router.get('/system/overview', (req, res) => {
  try {
    const overview = adminManager.getSystemOverview();
    res.json({
      success: true,
      overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'SYSTEM_OVERVIEW_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/analytics - Get detailed analytics
router.get('/analytics', (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    const analytics = adminManager.getDetailedAnalytics(timeframe);
    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'ANALYTICS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', (req, res) => {
  try {
    const filters = {
      admin_id: req.query.admin_id,
      action: req.query.action,
      target_type: req.query.target_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const { limit = 100 } = req.query;
    const result = adminManager.getAuditLogs(filters, parseInt(limit));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'AUDIT_LOGS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/admin/audit-log - Generate audit log
router.post('/audit-log', (req, res) => {
  try {
    const result = adminManager.generateAuditLog(req.body);
    res.json({
      success: true,
      log_entry: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'AUDIT_LOG_CREATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/alerts - Get system alerts
router.get('/alerts', (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query;
    const result = adminManager.getSystemAlerts(status, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'ALERTS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/admin/alerts - Create system alert
router.post('/alerts', (req, res) => {
  try {
    const alert = adminManager.createSystemAlert(req.body);
    res.json({
      success: true,
      alert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'ALERT_CREATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/admin/alerts/:alert_id/acknowledge - Acknowledge alert
router.put('/alerts/:alert_id/acknowledge', (req, res) => {
  try {
    const { admin_id } = req.body;
    const alert = adminManager.acknowledgeAlert(req.params.alert_id, admin_id);
    res.json({
      success: true,
      alert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'ALERT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/admin/alerts/:alert_id/resolve - Resolve alert
router.put('/alerts/:alert_id/resolve', (req, res) => {
  try {
    const { admin_id, resolution_notes = '' } = req.body;
    const alert = adminManager.resolveAlert(req.params.alert_id, admin_id, resolution_notes);
    res.json({
      success: true,
      alert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
      error_code: 'ALERT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/config - Get system configuration
router.get('/config', (req, res) => {
  try {
    const result = adminManager.getSystemConfig();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'CONFIG_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/admin/config - Update system configuration
router.put('/config', (req, res) => {
  try {
    const result = adminManager.updateSystemConfig(req.body);
    res.json({
      success: true,
      configuration: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      error_code: 'CONFIG_UPDATE_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/sessions - Get user sessions
router.get('/sessions', (req, res) => {
  try {
    const result = adminManager.getUserSessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'SESSIONS_FETCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;