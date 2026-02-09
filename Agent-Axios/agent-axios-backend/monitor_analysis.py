#!/usr/bin/env python3
"""
Real-time WebSocket event monitor for Agent Axios analysis.
Connects to the analysis namespace and displays all events.
"""
import socketio
import sys
import time
from datetime import datetime
from colorama import init, Fore, Back, Style

# Initialize colorama for colored terminal output
init(autoreset=True)

def log_event(event_name, data, color=Fore.WHITE):
    """Log an event with timestamp and color."""
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f"{Fore.CYAN}[{timestamp}] {color}{event_name}{Style.RESET_ALL}")
    if data:
        for key, value in data.items():
            print(f"  {Fore.YELLOW}{key}: {Fore.WHITE}{value}")
    print()

def main():
    if len(sys.argv) < 2:
        print(f"{Fore.RED}Usage: python monitor_analysis.py <analysis_id>{Style.RESET_ALL}")
        sys.exit(1)
    
    analysis_id = int(sys.argv[1])
    
    print(f"\n{Back.GREEN}{Fore.BLACK} 🚀 Agent Axios - Live Event Monitor {Style.RESET_ALL}")
    print(f"{Fore.CYAN}═══════════════════════════════════════════════════════{Style.RESET_ALL}")
    print(f"{Fore.GREEN}Analysis ID: {Fore.WHITE}{analysis_id}")
    print(f"{Fore.GREEN}Server: {Fore.WHITE}http://localhost:5000")
    print(f"{Fore.CYAN}═══════════════════════════════════════════════════════{Style.RESET_ALL}\n")
    
    # Create Socket.IO client
    sio = socketio.Client(logger=False, engineio_logger=False)
    
    @sio.on('connect', namespace='/analysis')
    def on_connect():
        log_event('✅ CONNECTED', {
            'namespace': '/analysis',
            'status': 'Connected to analysis agent'
        }, Fore.GREEN)
        
        # Start the analysis
        print(f"{Fore.MAGENTA}🎬 Starting autonomous agent...{Style.RESET_ALL}\n")
        sio.emit('start_analysis', {'analysis_id': analysis_id}, namespace='/analysis')
    
    @sio.on('disconnect', namespace='/analysis')
    def on_disconnect():
        log_event('🔌 DISCONNECTED', {
            'status': 'Connection closed'
        }, Fore.RED)
    
    @sio.on('analysis_started', namespace='/analysis')
    def on_started(data):
        log_event('🚀 ANALYSIS STARTED', data, Fore.GREEN)
    
    @sio.on('progress_update', namespace='/analysis')
    def on_progress(data):
        progress = data.get('progress', 0)
        stage = data.get('stage', 'unknown')
        message = data.get('message', '')
        
        # Create progress bar
        bar_length = 40
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)
        
        print(f"{Fore.CYAN}[{datetime.now().strftime('%H:%M:%S')}] "
              f"{Fore.YELLOW}⚡ PROGRESS UPDATE")
        print(f"  {Fore.WHITE}[{bar}] {Fore.GREEN}{progress}%{Style.RESET_ALL}")
        print(f"  {Fore.MAGENTA}Stage: {Fore.WHITE}{stage}")
        print(f"  {Fore.BLUE}Status: {Fore.WHITE}{message}")
        print()
    
    @sio.on('intermediate_result', namespace='/analysis')
    def on_intermediate(data):
        if data.get('type') == 'finding':
            severity_colors = {
                'CRITICAL': Fore.RED,
                'HIGH': Fore.LIGHTRED_EX,
                'MEDIUM': Fore.YELLOW,
                'LOW': Fore.LIGHTBLUE_EX
            }
            severity = data.get('severity', 'UNKNOWN')
            color = severity_colors.get(severity, Fore.WHITE)
            
            log_event('🔍 FINDING DISCOVERED', {
                'CVE ID': data.get('cve_id', 'N/A'),
                'Severity': f"{color}{severity}{Style.RESET_ALL}",
                'File': data.get('file_path', 'N/A'),
                'Confidence': f"{data.get('confidence_score', 0):.2f}"
            }, Fore.LIGHTMAGENTA_EX)
        else:
            log_event('📦 INTERMEDIATE RESULT', data, Fore.LIGHTBLUE_EX)
    
    @sio.on('analysis_complete', namespace='/analysis')
    def on_complete(data):
        print(f"\n{Back.GREEN}{Fore.BLACK} 🎉 ANALYSIS COMPLETE {Style.RESET_ALL}\n")
        log_event('✨ COMPLETION DATA', data, Fore.GREEN)
        
        # Fetch final results
        import requests
        try:
            print(f"{Fore.CYAN}Fetching final results...{Style.RESET_ALL}\n")
            response = requests.get(f'http://localhost:5000/api/analysis/{analysis_id}/results')
            if response.status_code == 200:
                results = response.json()
                summary = results.get('summary', {})
                findings = results.get('findings', [])
                
                print(f"{Back.BLUE}{Fore.WHITE} 📊 FINAL SUMMARY {Style.RESET_ALL}")
                print(f"{Fore.GREEN}Total Files: {Fore.WHITE}{summary.get('total_files', 0)}")
                print(f"{Fore.GREEN}Total Chunks: {Fore.WHITE}{summary.get('total_chunks', 0)}")
                print(f"{Fore.GREEN}Total Findings: {Fore.WHITE}{summary.get('total_findings', 0)}")
                
                if summary.get('severity_breakdown'):
                    print(f"\n{Fore.YELLOW}Severity Breakdown:")
                    for severity, count in summary['severity_breakdown'].items():
                        print(f"  {severity}: {count}")
                
                if findings:
                    print(f"\n{Back.RED}{Fore.WHITE} 🚨 VULNERABILITIES {Style.RESET_ALL}")
                    for idx, finding in enumerate(findings[:5], 1):
                        print(f"\n{Fore.LIGHTRED_EX}{idx}. {finding['cve_id']} - {finding['severity']}")
                        print(f"   File: {finding['file_path']}")
                        print(f"   Confidence: {finding['confidence_score']:.2f}")
                        if finding.get('validation_status'):
                            print(f"   Status: {finding['validation_status']}")
                    
                    if len(findings) > 5:
                        print(f"\n   ... and {len(findings) - 5} more findings")
        except Exception as e:
            print(f"{Fore.RED}Error fetching results: {e}{Style.RESET_ALL}")
        
        print(f"\n{Fore.CYAN}═══════════════════════════════════════════════════════{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Analysis monitoring complete. Disconnecting...{Style.RESET_ALL}\n")
        sio.disconnect()
    
    @sio.on('error', namespace='/analysis')
    def on_error(data):
        log_event('❌ ERROR', {
            'message': data.get('message', 'Unknown error'),
            'details': data.get('details', 'No details available')
        }, Fore.RED)
    
    # Connect to the server
    try:
        sio.connect('http://localhost:5000', namespaces=['/analysis'])
        sio.wait()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Interrupted by user. Disconnecting...{Style.RESET_ALL}")
        sio.disconnect()
    except Exception as e:
        print(f"{Fore.RED}Connection error: {e}{Style.RESET_ALL}")
        sys.exit(1)

if __name__ == '__main__':
    main()
