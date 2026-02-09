#!/bin/bash

# ReAct Agent Setup Script
# Run this to verify the installation and test the agent

echo "🔧 Setting up ReAct Agent for Repository Analyzer v3.0"
echo ""

# Check Python version
echo "📍 Checking Python version..."
python --version

# Check if virtual environment is active
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtual environment active: $VIRTUAL_ENV"
else
    echo "⚠️  No virtual environment detected. Consider using one:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
fi

echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "🔍 Checking environment variables..."

# Check .env file
if [ -f .env ]; then
    echo "✅ .env file found"
    
    # Check required variables
    if grep -q "AZURE_OPENAI_API_KEY" .env; then
        echo "  ✅ AZURE_OPENAI_API_KEY present"
    else
        echo "  ❌ AZURE_OPENAI_API_KEY missing"
    fi
    
    if grep -q "AZURE_OPENAI_ENDPOINT" .env; then
        echo "  ✅ AZURE_OPENAI_ENDPOINT present"
    else
        echo "  ❌ AZURE_OPENAI_ENDPOINT missing"
    fi
    
    if grep -q "TAVILY_API_KEY" .env; then
        echo "  ✅ TAVILY_API_KEY present (web search enabled)"
    else
        echo "  ⚠️  TAVILY_API_KEY missing (web search will be disabled)"
        echo "     Get one at: https://tavily.com/"
    fi
else
    echo "❌ .env file not found!"
    echo "   Create a .env file with:"
    echo "   AZURE_OPENAI_API_KEY=your_key"
    echo "   AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/"
    echo "   AZURE_OPENAI_API_VERSION=2024-12-01-preview"
    echo "   AZURE_OPENAI_MODEL=gpt-4.1"
    echo "   TAVILY_API_KEY=your_tavily_key (optional)"
    exit 1
fi

echo ""
echo "🧪 Testing configuration..."
python -c "from src.config import config; config.display_config()"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Quick start:"
echo "   python main.py analyze pallets/flask"
echo "   python main.py analyze pallets/flask --output flask_report.md"
echo ""
echo "📚 Documentation: See REACT_AGENT_README.md"
