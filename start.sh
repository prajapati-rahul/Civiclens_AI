#!/usr/bin/env bash
echo "==================================================="
echo "Starting CivicLens AI Full-Stack Application"
echo "==================================================="

# Start backend
echo "[1/2] Starting Backend API on http://localhost:8000..."
cd "$(dirname "$0")/backend"
source .venv/bin/activate 2>/dev/null || true
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "[2/2] Starting Frontend on http://localhost:5173..."
cd "../frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "CivicLens AI is running!"
echo "- Web UI:   http://localhost:5173"
echo "- API Docs: http://localhost:8000/api/docs"
echo "Press Ctrl+C to terminate both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
