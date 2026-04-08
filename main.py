import subprocess
import typer
from Src.benchmark import run_benchmarks


app = typer.Typer()


@app.command()
def benchmark(
    full: bool = typer.Option(False, "--full", help="Run full benchmarks instead of smoke tests"),
):
    """Run benchmarking suite."""
    run_benchmarks(smoke=not full)


@app.command()
def api(
    host: str = typer.Option("0.0.0.0", "--host", help="Host to bind the API server to"),
    port: int = typer.Option(5000, "--port", help="Port to bind the API server to"),
):
    """Start the API server."""
    typer.echo(f"Starting API server on {host}:{port}...")
    subprocess.run([
        "python", "-m", "uvicorn",
        "Src.app:app",
        f"--host={host}",
        f"--port={port}",
        "--reload"
    ], check=True)


if __name__ == "__main__":
    app()

