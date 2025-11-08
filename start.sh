#!/bin/bash

# Period Tracker - Quick Start Script
# This script helps you get the application running quickly

set -e

echo "=================================="
echo "Period Tracker - Quick Start"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Check for .env file
echo -e "\n${YELLOW}Setting up environment...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    
    # Check if API keys are provided
    if [ -z "$GROQ_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${YELLOW}⚠ API keys not found in environment${NC}"
        echo -e "You'll need:"
        echo -e "  1. Groq API key from: https://console.groq.com"
        echo -e "  2. OpenAI API key from: https://platform.openai.com"
        
        read -p "Enter your Groq API key: " groq_key
        read -p "Enter your OpenAI API key: " openai_key
        
        cat > .env << EOF
DATABASE_URL=postgresql://tracker_user:secure_password_change_me@db:5432/period_tracker
GROQ_API_KEY=$groq_key
OPENAI_API_KEY=$openai_key
GROQ_MODEL=llama-3.1-70b-versatile
EMBEDDING_MODEL=text-embedding-3-small
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DEBUG=True
LOG_LEVEL=INFO
EOF
    else
        cp .env.example .env
        echo -e "${GREEN}✓ Environment file created${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Start services
echo -e "\n${YELLOW}Starting services with Docker Compose...${NC}"
docker-compose up -d

# Wait for database
echo -e "\n${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Initialize database
echo -e "\n${YELLOW}Initializing database...${NC}"
docker-compose exec -T backend python << 'EOF'
from models import Base
from main import engine
from sqlalchemy import text

# Create tables
Base.metadata.create_all(bind=engine)

# Check pgvector
from sqlalchemy.orm import Session
db = Session(engine)
try:
    db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    db.commit()
    print("✓ Database initialized successfully!")
except Exception as e:
    print(f"Note: {e}")
finally:
    db.close()
EOF

# Run initialization script
echo -e "\n${YELLOW}Setting up initial data...${NC}"
docker-compose exec -T backend python init_db.py << 'EOF'
y
demo@example.com
EOF

# Check service status
echo -e "\n${YELLOW}Checking service status...${NC}"
sleep 5

if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may still be building...${NC}"
fi

# Print access information
echo -e "\n${GREEN}=================================="
echo "✅ Setup Complete!"
echo "==================================${NC}"
echo ""
echo "Access your application:"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:8000"
echo -e "  ${GREEN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "Demo user credentials:"
echo -e "  ${GREEN}Email:${NC} demo@example.com"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart"
echo "  Update code: git pull && docker-compose up -d --build"
echo ""
echo -e "${YELLOW}Note: Frontend may take a minute to compile. Be patient!${NC}"
echo ""
