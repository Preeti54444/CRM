#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Database initialization and migration script
# ═══════════════════════════════════════════════════════════════

set -e

echo "🗄️  Initializing CRM Database..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Check if database URL is configured
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not configured in backend/.env"
    exit 1
fi

echo "📝 Running Alembic migrations..."
alembic upgrade head

echo "✅ Database initialized successfully!"
