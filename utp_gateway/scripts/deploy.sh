#!/bin/bash

# UTP Gateway - Unified Token Payments Deployment Script
# Complete setup and deployment automation

set -e

echo "🚀 Starting UTP Gateway Deployment..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"
}

# Install backend dependencies
install_backend() {
    print_status "Installing backend dependencies..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_warning "No package.json found. Creating package.json..."
        cat > package.json << EOF
{
  "name": "utp-gateway-backend",
  "version": "1.0.0",
  "description": "UTP Gateway - Unified Token Payments Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "uuid": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["utp", "gateway", "payments", "blockchain", "tokens"],
  "author": "MiniMax Agent",
  "license": "MIT"
}
EOF
    fi
    
    npm install
    print_success "Backend dependencies installed"
    cd ..
}

# Create environment file
create_env() {
    print_status "Creating environment configuration..."
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# UTP Gateway Configuration
NODE_ENV=production
PORT=3002

# JWT Configuration
JWT_SECRET=utp-jwt-secret-key-$(date +%s)
JWT_REFRESH_SECRET=utp-refresh-secret-key-$(date +%s)

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/utp_gateway
REDIS_URL=redis://localhost:6379

# API Configuration
API_RATE_LIMIT=1000
API_TIMEOUT=30000

# External API Keys (Add your keys here)
BINR_API_KEY=your_binr_api_key_here
GOLD_PRICE_API_KEY=your_gold_price_api_key_here

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# Monitoring
LOG_LEVEL=info
MONITORING_ENABLED=true

# CORS Configuration
FRONTEND_URL=http://localhost:8000
EOF
        print_success "Environment file created (.env)"
    else
        print_warning "Environment file already exists"
    fi
}

# Start the backend server
start_backend() {
    print_status "Starting UTP Gateway backend server..."
    
    cd backend
    
    # Check if PM2 is installed, if not install it globally
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2 for process management..."
        npm install -g pm2
    fi
    
    # Start the server with PM2
    pm2 start server.js --name "utp-gateway-api" --watch
    pm2 save
    pm2 startup
    
    print_success "UTP Gateway backend server started with PM2"
    
    # Check if server is running
    sleep 3
    if pm2 describe utp-gateway-api | grep -q "online"; then
        print_success "Server is running successfully"
        print_status "API Health Check:"
        curl -s http://localhost:3002/health | python3 -m json.tool || echo "Health check completed"
    else
        print_error "Server failed to start. Check logs with: pm2 logs utp-gateway-api"
        exit 1
    fi
    
    cd ..
}

# Create simple static file server for frontend
create_frontend_server() {
    print_status "Setting up frontend server..."
    
    cat > serve-frontend.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.FRONTEND_PORT || 8000;

// Serve static files
app.use(express.static('frontend'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'UTP Gateway Frontend',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🖥️  UTP Gateway Frontend running on port ${PORT}`);
    console.log(`📱 Web Interface: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
EOF

    # Install express for frontend server
    npm install express --save-dev
    
    # Start frontend server with PM2
    pm2 start serve-frontend.js --name "utp-gateway-frontend"
    
    print_success "Frontend server started"
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start-utp.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting UTP Gateway..."

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Please run the deployment script first."
    exit 1
fi

# Start all services
echo "📡 Starting API server..."
pm2 start backend/server.js --name "utp-gateway-api" --watch

echo "🖥️  Starting frontend server..."
pm2 start serve-frontend.js --name "utp-gateway-frontend"

echo "📊 Showing status..."
pm2 status

echo ""
echo "✅ UTP Gateway is starting up!"
echo "🌐 Web Interface: http://localhost:8000"
echo "📊 Dashboard: http://localhost:8000/dashboard"
echo "🔧 API: http://localhost:3002"
echo ""
echo "📝 View logs with: pm2 logs"
echo "⏹️  Stop all with: pm2 delete all"
EOF

    chmod +x start-utp.sh
    print_success "Startup script created (start-utp.sh)"
}

# Create monitoring script
create_monitoring_script() {
    print_status "Creating monitoring script..."
    
    cat > monitor-utp.sh << 'EOF'
#!/bin/bash

echo "📊 UTP Gateway System Status"
echo "=========================="

echo ""
echo "🔄 PM2 Process Status:"
pm2 status

echo ""
echo "🌐 Frontend Health Check:"
curl -s http://localhost:8000/health | python3 -m json.tool || echo "Frontend not responding"

echo ""
echo "🔧 Backend Health Check:"
curl -s http://localhost:3002/health | python3 -m json.tool || echo "Backend not responding"

echo ""
echo "📈 System Resources:"
echo "Memory Usage:"
free -h

echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'

echo ""
echo "🔍 PM2 Logs (last 10 lines):"
pm2 logs --lines 10 --nostream
EOF

    chmod +x monitor-utp.sh
    print_success "Monitoring script created (monitor-utp.sh)"
}

# Display final instructions
show_instructions() {
    echo ""
    echo "🎉 UTP Gateway Deployment Complete!"
    echo "===================================="
    echo ""
    echo "✅ Services Running:"
    echo "   🖥️  Frontend: http://localhost:8000"
    echo "   📊 Dashboard: http://localhost:8000/dashboard"
    echo "   🔧 API: http://localhost:3002"
    echo ""
    echo "📝 Available Commands:"
    echo "   ./start-utp.sh     - Start all services"
    echo "   ./monitor-utp.sh   - Check system status"
    echo "   pm2 status         - View running processes"
    echo "   pm2 logs          - View application logs"
    echo "   pm2 stop all      - Stop all services"
    echo "   pm2 delete all    - Remove all services"
    echo ""
    echo "🧪 Test the System:"
    echo "   curl http://localhost:3002/health"
    echo "   curl http://localhost:8000/health"
    echo ""
    print_success "Ready to accept metal-backed payments! 🚀"
}

# Main deployment function
main() {
    echo ""
    print_status "UTP Gateway - Unified Token Payments"
    print_status "Deployment Script Starting..."
    echo ""
    
    # Change to project directory
    cd "$(dirname "$0")"
    
    # Run deployment steps
    check_node
    check_npm
    install_backend
    create_env
    create_frontend_server
    start_backend
    create_startup_script
    create_monitoring_script
    
    show_instructions
}

# Run main function
main "$@"