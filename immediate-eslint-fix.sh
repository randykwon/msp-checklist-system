#!/bin/bash

# Immediate ESLint Dependency Fix for MSP Checklist
# Run this on your EC2 instance to resolve the current ESLint conflict

echo "🔧 Immediate ESLint Dependency Fix"
echo "=================================="

# Navigate to the project directory
cd /opt/msp-checklist-system/msp-checklist || {
    echo "❌ Could not find project directory"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Backup current package.json
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up package.json"

# Create fixed package.json with compatible versions
echo "📝 Creating fixed package.json..."
cat > package.json << 'EOF'
{
  "name": "msp-checklist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.0",
    "lucide-react": "^0.263.1",
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5"
  }
}
EOF

echo "✅ Updated package.json with compatible versions"

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Remove node_modules and lock files
echo "🗑️ Removing old dependencies..."
rm -rf node_modules package-lock.json

# Install with legacy peer deps to handle conflicts
echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps --no-fund --no-audit

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    
    # Try to build
    echo "🔨 Attempting to build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "🎉 Build successful!"
        echo ""
        echo "Next steps:"
        echo "1. Continue with the deployment script"
        echo "2. Or manually start the application with: npm start"
    else
        echo "⚠️ Build failed, but dependencies are now compatible"
        echo "You may need to run the full Nuclear CSS Fix"
    fi
else
    echo "❌ Dependency installation failed"
    echo "Restoring backup..."
    cp package.json.backup.* package.json
    exit 1
fi

echo ""
echo "🏁 ESLint fix completed!"