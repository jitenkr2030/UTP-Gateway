// UTP Gateway Dashboard JavaScript

// Dashboard state
let dashboardState = {
    currentSection: 'overview',
    merchantData: {},
    transactions: [],
    analytics: {}
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    console.log('📊 Initializing UTP Dashboard...');
    
    // Initialize components
    initializeNavigation();
    initializeCharts();
    initializeModals();
    loadDashboardData();
    
    console.log('✅ UTP Dashboard initialized!');
}

// Navigation functionality
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const section = this.dataset.section;
            
            if (section) {
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding content section
                contentSections.forEach(section => section.classList.remove('active'));
                const targetSection = document.getElementById(section);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
                
                // Update dashboard state
                dashboardState.currentSection = section;
                updatePageTitle(section);
                
                // Load section-specific data
                loadSectionData(section);
            }
        });
    });
}

// Update page title based on current section
function updatePageTitle(section) {
    const titles = {
        'overview': 'Dashboard',
        'payments': 'Transactions',
        'analytics': 'Analytics',
        'settlements': 'Settlements',
        'refunds': 'Refunds',
        'profile': 'Profile',
        'api': 'API Keys',
        'webhooks': 'Webhooks'
    };
    
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && titles[section]) {
        pageTitle.textContent = titles[section];
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Simulate API calls to load dashboard data
        await loadMerchantData();
        await loadTransactions();
        await loadAnalytics();
        await loadMetrics();
        
        console.log('📈 Dashboard data loaded');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorToast('Failed to load dashboard data');
    }
}

// Load merchant data
async function loadMerchantData() {
    // Simulate API call
    dashboardState.merchantData = {
        id: 'merchant_123',
        name: 'TechCorp Solutions',
        status: 'active',
        kyc_status: 'verified',
        total_transactions: 15420,
        total_volume: 125000000,
        joined_date: '2024-01-15'
    };
}

// Load transactions
async function loadTransactions() {
    // Simulate API call
    dashboardState.transactions = [
        {
            id: 'txn_001',
            order_id: '12345',
            customer_name: 'Rahul S.',
            amount: 1500,
            token_type: 'bgt',
            token_amount: 0.265,
            status: 'completed',
            timestamp: new Date().toISOString()
        },
        {
            id: 'txn_002',
            order_id: '12346',
            customer_name: 'Priya M.',
            amount: 800,
            token_type: 'binr',
            token_amount: 800,
            status: 'completed',
            timestamp: new Date().toISOString()
        },
        {
            id: 'txn_003',
            order_id: '12347',
            customer_name: 'Amit K.',
            amount: 2100,
            token_type: 'bst',
            token_amount: 28.97,
            status: 'pending',
            timestamp: new Date().toISOString()
        }
    ];
}

// Load analytics
async function loadAnalytics() {
    // Simulate API call
    dashboardState.analytics = {
        daily_revenue: [45000, 52000, 38000, 67000, 55000, 62000, 70000],
        token_distribution: {
            bgt: 45,
            binr: 30,
            bst: 15,
            bpt: 10
        },
        success_rate: 99.7,
        average_order_value: 197
    };
}

// Load metrics
async function loadMetrics() {
    // Update metric cards with real data
    updateMetricsDisplay();
}

function updateMetricsDisplay() {
    const revenueMetric = document.querySelector('.metric-card .metric-value');
    const transactionsMetric = document.querySelectorAll('.metric-card .metric-value')[1];
    const aovMetric = document.querySelectorAll('.metric-card .metric-value')[2];
    const successMetric = document.querySelectorAll('.metric-card .metric-value')[3];
    
    if (revenueMetric) {
        revenueMetric.textContent = formatCurrency(245670);
    }
    
    if (transactionsMetric) {
        transactionsMetric.textContent = '1,247';
    }
    
    if (aovMetric) {
        aovMetric.textContent = formatCurrency(197);
    }
    
    if (successMetric) {
        successMetric.textContent = '99.7%';
    }
}

// Initialize charts
function initializeCharts() {
    const chartButtons = document.querySelectorAll('.chart-btn');
    
    chartButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.dataset.period;
            
            // Update active button
            chartButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load chart data for period
            loadChartData(period);
        });
    });
}

// Load chart data
async function loadChartData(period) {
    // Simulate API call to load chart data
    const chartData = generateChartData(period);
    updateRevenueChart(chartData);
}

// Generate chart data (mock)
function generateChartData(period) {
    const data = {
        '7d': Array.from({length: 7}, () => Math.floor(Math.random() * 50000) + 30000),
        '30d': Array.from({length: 30}, () => Math.floor(Math.random() * 50000) + 30000),
        '90d': Array.from({length: 90}, () => Math.floor(Math.random() * 50000) + 30000)
    };
    
    return data[period] || data['7d'];
}

// Update revenue chart
function updateRevenueChart(data) {
    const chartBars = document.querySelectorAll('.bar');
    
    if (chartBars.length > 0) {
        const maxValue = Math.max(...data.slice(0, 7)); // Use first 7 for display
        
        chartBars.forEach((bar, index) => {
            if (data[index]) {
                const height = (data[index] / maxValue) * 100;
                bar.style.height = height + '%';
            }
        });
    }
}

// Initialize modals
function initializeModals() {
    const modal = document.getElementById('quickPaymentModal');
    const form = modal.querySelector('.quick-payment-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        createQuickPayment();
    });
}

// Quick payment functions
function showQuickPayment() {
    const modal = document.getElementById('quickPaymentModal');
    modal.style.display = 'flex';
    
    // Animate in
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeQuickPayment() {
    const modal = document.getElementById('quickPaymentModal');
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
        // Reset form
        modal.querySelector('.quick-payment-form').reset();
    }, 300);
}

async function createQuickPayment() {
    const form = document.querySelector('.quick-payment-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Get form data
    const amount = parseFloat(document.getElementById('qpAmount').value);
    const description = document.getElementById('qpDescription').value;
    const tokens = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (!amount || amount < 10) {
        showErrorToast('Please enter a valid amount (minimum ₹10)');
        return;
    }
    
    if (!description.trim()) {
        showErrorToast('Please provide a description');
        return;
    }
    
    if (tokens.length === 0) {
        showErrorToast('Please select at least one payment token');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
        // Simulate API call
        await simulateAPICall();
        
        // Show success
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Created!';
        submitBtn.className = 'btn btn-success';
        
        // Show success toast
        showSuccessToast('Payment link created successfully!');
        
        // Close modal after delay
        setTimeout(() => {
            closeQuickPayment();
        }, 2000);
        
    } catch (error) {
        showErrorToast('Failed to create payment link');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.className = 'btn btn-primary';
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function simulateAPICall() {
    return new Promise((resolve) => {
        setTimeout(resolve, 1500);
    });
}

// Data export function
function exportData() {
    const data = {
        merchant: dashboardState.merchantData,
        transactions: dashboardState.transactions,
        analytics: dashboardState.analytics,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `utp-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showSuccessToast('Dashboard data exported successfully!');
}

// Load section-specific data
function loadSectionData(section) {
    console.log(`Loading data for section: ${section}`);
    
    switch (section) {
        case 'overview':
            // Overview data is already loaded
            break;
        case 'payments':
            loadPaymentsSection();
            break;
        case 'analytics':
            loadAnalyticsSection();
            break;
        case 'settlements':
            loadSettlementsSection();
            break;
        case 'profile':
            loadProfileSection();
            break;
        case 'api':
            loadAPISection();
            break;
        case 'webhooks':
            loadWebhooksSection();
            break;
    }
}

// Load payments section
function loadPaymentsSection() {
    console.log('Loading payments section...');
    // In a real implementation, this would load payment history
}

// Load analytics section
function loadAnalyticsSection() {
    console.log('Loading analytics section...');
    // In a real implementation, this would load detailed analytics
}

// Load settlements section
function loadSettlementsSection() {
    console.log('Loading settlements section...');
    // In a real implementation, this would load settlement history
}

// Load profile section
function loadProfileSection() {
    console.log('Loading profile section...');
    // In a real implementation, this would load merchant profile
}

// Load API section
function loadAPISection() {
    console.log('Loading API section...');
    // In a real implementation, this would load API keys management
}

// Load webhooks section
function loadWebhooksSection() {
    console.log('Loading webhooks section...');
    // In a real implementation, this would load webhooks configuration
}

// Toast notification functions
function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Real-time updates
function startRealTimeUpdates() {
    // Update metrics every 30 seconds
    setInterval(() => {
        if (dashboardState.currentSection === 'overview') {
            updateMetricsDisplay();
        }
    }, 30000);
    
    // Check for new transactions every 15 seconds
    setInterval(() => {
        if (dashboardState.currentSection === 'overview' || dashboardState.currentSection === 'payments') {
            checkForNewTransactions();
        }
    }, 15000);
}

function checkForNewTransactions() {
    // In a real implementation, this would check for new transactions
    console.log('Checking for new transactions...');
}

// Initialize real-time updates
startRealTimeUpdates();

// Error handling
window.addEventListener('error', function(e) {
    console.error('Dashboard Error:', {
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno,
        error: e.error
    });
    
    showErrorToast('An error occurred in the dashboard');
});

// Performance monitoring
function trackDashboardPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('📊 Dashboard Performance:', {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                    totalTime: perfData.loadEventEnd - perfData.navigationStart
                });
            }, 1000);
        });
    }
}

trackDashboardPerformance();