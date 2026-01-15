#!/bin/bash
set -e

echo "🚀 Starting Truth Ledger on Hugging Face Spaces"
echo "================================================"

# Start Ollama in the background
echo "📦 Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is ready"
        break
    fi
    sleep 1
done

# Pull the granite model if not present
echo "📥 Checking for granite3.3:8b model..."
if ! ollama list | grep -q "granite3.3:8b"; then
    echo "⬇️ Pulling granite3.3:8b model (this may take a few minutes on first start)..."
    ollama pull granite3.3:8b
    echo "✅ Model downloaded"
else
    echo "✅ Model already available"
fi

# Start the truth-ledger API
echo "🌐 Starting Truth Ledger API on port ${PORT:-7860}..."
exec node dist/index.js serve
