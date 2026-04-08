"""CLI entry point for benchmarking and API."""

import sys
import subprocess
from Src.benchmark import run_benchmarks


def main():
    """CLI interface."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python main.py benchmark [--smoke|--full]")
        print("  python main.py api [--host HOST] [--port PORT]")
        return
    
    command = sys.argv[1]
    
    if command == "benchmark":
        smoke = "--smoke" in sys.argv
        run_benchmarks(smoke=smoke)
    
    elif command == "api":
        host = "0.0.0.0"
        port = 5000
        
        # Parse options
        for i, arg in enumerate(sys.argv[2:]):
            if arg == "--host" and i + 3 < len(sys.argv):
                host = sys.argv[i + 3]
            elif arg == "--port" and i + 3 < len(sys.argv):
                port = int(sys.argv[i + 3])
        
        print(f"Starting API server on {host}:{port}...")
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "Src.app:app",
            f"--host={host}",
            f"--port={port}",
            "--reload"
        ])
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
