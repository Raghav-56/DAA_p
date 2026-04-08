import subprocess
import sys
import typer
from Src.benchmark import run_benchmarks


app = typer.Typer(help="E-Commerce Product Ranking CLI: Run benchmarks or start the ranking API server.")


@app.command()
def benchmark(
    full: bool = typer.Option(False, "--full", help="Run full benchmarks (1K, 5K, 10K, 42K) instead of smoke tests (1K, 5K)"),
):
    """
    Run the benchmarking suite for Merge Sort and Quick Sort algorithms.
    By default, runs a quick smoke test on smaller dataset sizes. Use --full for all sizes.
    """
    run_benchmarks(smoke=not full)


@app.command()
def api(
    host: str = typer.Option("0.0.0.0", "--host", help="Host address to bind the API server to"),
    port: int = typer.Option(5000, "--port", help="Port number to bind the API server to"),
):
    """
    Start the FastAPI server providing the /rank and /health endpoints.
    """
    typer.echo(f"Starting API server on {host}:{port}...")
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "Src.app:app",
        f"--host={host}",
        f"--port={port}",
        "--reload"
    ], check=True)


if __name__ == "__main__":
    app()

