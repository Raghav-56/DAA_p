"""Benchmark module for ranking performance analysis."""

import csv
import time
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

from .algorithms import rank_products


def run_benchmarks(smoke: bool = False):
    """
    Run benchmarks across dataset sizes and k values.
    
    Args:
        smoke: If True, run minimal benchmark; if False, run full suite.
    """
    # Configuration
    dataset_sizes = {1000, 5000} if smoke else {1000, 5000, 10000, 42000}
    k_values = [10, 100]
    strategies = ["price_desc", "rating_desc"]
    algorithms = ["merge_sort", "quick_sort"]
    
    # Load full dataset
    dataset_path = Path(__file__).parent.parent / "Dataset" / "amazon_products_sales_data" / "amazon_products_sales_data_cleaned.csv"
    df = pd.read_csv(dataset_path)
    full_data = df.to_dict("records")
    
    # Ensure output directories
    output_dir = Path(__file__).parent.parent / "outputs"
    bench_dir = output_dir / "benchmarks"
    report_dir = output_dir / "reports"
    bench_dir.mkdir(parents=True, exist_ok=True)
    report_dir.mkdir(parents=True, exist_ok=True)
    
    # Run benchmarks and collect results
    results = []
    for size in sorted(dataset_sizes):
        data = full_data[:size]
        print(f"Testing with {size} products...")
        
        for strategy in strategies:
            for algorithm in algorithms:
                for k in k_values:
                    times = []
                    for _ in range(3):  # 3 runs per config
                        _, elapsed = rank_products(data, strategy, algorithm, k)
                        times.append(elapsed * 1000)  # Convert to ms
                    
                    avg_time = sum(times) / len(times)
                    results.append({
                        "dataset_size": size,
                        "strategy": strategy,
                        "algorithm": algorithm,
                        "k": k,
                        "avg_time_ms": round(avg_time, 4),
                        "std_time_ms": round((sum((t - avg_time) ** 2 for t in times) / len(times)) ** 0.5, 4),
                    })
                    print(f"  {strategy} / {algorithm} / k={k}: {avg_time:.2f} ms")
    
    # Write CSV
    csv_path = bench_dir / "benchmark_results.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"\nResults saved to {csv_path}")
    
    # Generate plots
    df_results = pd.DataFrame(results)
    
    # Plot 1: Runtime vs dataset size
    fig, ax = plt.subplots(figsize=(10, 6))
    for algo in algorithms:
        subset = df_results[df_results["algorithm"] == algo]
        grouped = subset.groupby("dataset_size")["avg_time_ms"].mean()
        ax.plot(grouped.index, grouped.values, marker="o", label=algo)
    ax.set_xlabel("Dataset Size")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Runtime Scaling by Dataset Size")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(report_dir / "runtime_scaling.png", dpi=100)
    print(f"Saved: {report_dir / 'runtime_scaling.png'}")
    
    # Plot 2: Algorithm comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    for algo in algorithms:
        subset = df_results[df_results["algorithm"] == algo]
        grouped = subset.groupby("k")["avg_time_ms"].mean()
        ax.bar([str(k) + f"_{algo}" for k in grouped.index], grouped.values, label=algo)
    ax.set_xlabel("K Value")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Algorithm Comparison by K Value")
    ax.legend()
    plt.tight_layout()
    plt.savefig(report_dir / "algorithm_comparison.png", dpi=100)
    print(f"Saved: {report_dir / 'algorithm_comparison.png'}")
    
    # Generate summary report
    report_path = report_dir / "benchmark_report.md"
    with open(report_path, "w") as f:
        f.write("# Benchmark Report\n\n")
        f.write(f"**Test Configuration**: {len(dataset_sizes)} dataset sizes, {len(k_values)} k values, {len(strategies)} strategies, {len(algorithms)} algorithms\n\n")
        f.write("## Summary Statistics\n\n")
        
        # Write algorithm comparison
        f.write("### By Algorithm\n\n")
        for algo in algorithms:
            subset = df_results[df_results["algorithm"] == algo]["avg_time_ms"]
            f.write(f"**{algo.upper()}**\n")
            f.write(f"- Mean: {subset.mean():.4f} ms\n")
            f.write(f"- Min: {subset.min():.4f} ms\n")
            f.write(f"- Max: {subset.max():.4f} ms\n")
            f.write(f"- Std Dev: {subset.std():.4f} ms\n\n")
        
        f.write(f"**Total configurations tested**: {len(results)}\n")
        f.write(f"**Total runs**: {len(results) * 3} (3 per configuration)\n")
    print(f"Saved: {report_path}\n")
    
    return results
