#!/usr/bin/env python3
"""
Real-time Analysis Monitor with Socket.IO
Starts and monitors analysis progress
"""
import socketio
import time
import sys
from datetime import datetime

# Configuration
SERVER_URL = 'http://localhost:5000'
ANALYSIS_ID = 124  # The analysis to monitor

# Create Socket.IO client
sio = socketio.Client()

# Progress tracking
last_progress = -1
start_time = None

@sio.event
def connect():
    """Handle connection"""
    print(f"{'='*60}")
    print(f"🔌 Connected to {SERVER_URL}")
    print(f"{'='*60}\n")

@sio.on('connected', namespace='/analysis')
def on_connected(data):
    """Handle server confirmation"""
    print(f"✅ Server confirmed: {data.get('message')}\n")
    
    # Join analysis room
    room_name = f'analysis_{ANALYSIS_ID}'
    print(f"📡 Joining room: {room_name}")
    try:
        sio.emit('join_room', {'room': room_name}, namespace='/analysis')
    except Exception as e:
        print(f"Warning joining room: {e}")
    time.sleep(0.5)
    
    # Start the analysis
    global start_time
    start_time = time.time()
    print(f"🚀 Starting analysis {ANALYSIS_ID}...")
    print(f"   Emitting 'start_analysis' event to /analysis namespace\n")
    try:
        sio.emit('start_analysis', {'analysis_id': ANALYSIS_ID}, namespace='/analysis')
        print(f"✅ start_analysis event sent!\n")
    except Exception as e:
        print(f"❌ Error sending start_analysis: {e}\n")

@sio.on('*', namespace='/analysis')
def catch_all(event, data):
    """Catch all events for debugging"""
    print(f"[DEBUG] Event received: {event}")
    if data:
        print(f"[DEBUG] Data: {data}")

@sio.event
def disconnect():
    """Handle disconnection"""
    print(f"\n{'='*60}")
    print(" Disconnected from server")
    print(f"{'='*60}")

@sio.on('progress_update', namespace='/analysis')
def on_progress(data):
    """Handle progress updates"""
    global last_progress
    
    progress = data.get('progress', 0)
    stage = data.get('stage', 'unknown')
    message = data.get('message', '')
    timestamp = data.get('timestamp', '')
    
    # Show progress bar
    if progress != last_progress:
        bar_length = 40
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)
        
        elapsed = time.time() - start_time if start_time else 0
        
        print(f"\r[{bar}] {progress:3d}% | {stage:12s} | {message[:50]:<50} | {elapsed:.1f}s", end='', flush=True)
        
        if progress != last_progress and progress % 10 == 0:
            print()  # New line every 10%
        
        last_progress = progress

@sio.on('analysis_complete', namespace='/analysis')
def on_complete(data):
    """Handle analysis completion"""
    elapsed = time.time() - start_time if start_time else 0
    
    print(f"\n\n{'='*60}")
    print(f"✅ Analysis Complete!")
    print(f"{'='*60}")
    print(f"Analysis ID: {data.get('analysis_id')}")
    print(f"Total Time: {elapsed:.1f}s")
    print(f"Findings: {data.get('total_findings', 0)}")
    print(f"Chunks: {data.get('total_chunks', 0)}")
    print(f"Files: {data.get('total_files', 0)}")
    print(f"Report: {data.get('report_path', 'N/A')}")
    print(f"{'='*60}\n")
    
    # Disconnect after completion
    time.sleep(2)
    sio.disconnect()

@sio.on('error', namespace='/analysis')
def on_error(data):
    """Handle errors"""
    print(f"\n\n{'='*60}")
    print(f"❌ Error Occurred")
    print(f"{'='*60}")
    print(f"Analysis ID: {data.get('analysis_id')}")
    print(f"Stage: {data.get('stage', 'unknown')}")
    print(f"Error: {data.get('error', 'Unknown error')}")
    print(f"{'='*60}\n")
    
    # Disconnect after error
    time.sleep(2)
    sio.disconnect()

@sio.on('milvus_connection', namespace='/analysis')
def on_milvus_status(data):
    """Handle Milvus connection status"""
    if data.get('connected'):
        print(f"✅ Milvus connected: {data.get('collection')} ({data.get('count', 0)} CVEs)")
    else:
        print(f"❌ Milvus connection failed: {data.get('error')}")

def main():
    """Main function"""
    print(f"\n{'='*60}")
    print(f" 🚀 Agent Axios - Analysis Monitor")
    print(f"{'='*60}")
    print(f" Server: {SERVER_URL}")
    print(f" Analysis ID: {ANALYSIS_ID}")
    print(f" Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        # Connect to server
        print("Connecting to server...")
        sio.connect(SERVER_URL, namespaces=['/analysis'], wait_timeout=10)
        print("✅ Connected!\n")
        
        # Wait for events
        sio.wait()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        if sio.connected:
            sio.disconnect()
    except Exception as e:
        print(f"\n\n❌ Connection Error: {str(e)}")
        print("Make sure the Flask backend is running on port 5000")
        sys.exit(1)

if __name__ == "__main__":
    main()
