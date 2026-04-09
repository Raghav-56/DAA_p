import csv
from pathlib import Path
import pandas as pd
import tracemalloc

from ..Algorithms import rank_products


def run_benchmarks(smoke: bool = False):
    """
    Run benchmarks across dataset sizes and k values.
    
    Args:
        smoke: If True, run minimal benchmark; if False, run full suite.
    
    Returns:
        List of benchmark result dictionaries
    """
    # Configuration
    dataset_sizes = {1000, 5000} if smoke else {1000, 5000, 10000, 20000, 30000, 42000}
    k_values = [10, 100, 1000]
    extreme_k_values = [5000, 10000, 20000, 40000]  # For extreme k scaling
    strategies = ["price_desc", "rating_desc", "reviews_desc", "discount_desc"]
    algorithms = ["merge_sort", "quick_sort"]
    
    # Load full dataset
    dataset_path = Path(__file__).parent.parent.parent / "Dataset" / "amazon_products_sales_data" / "amazon_products_sales_data_cleaned.csv"
    df = pd.read_csv(dataset_path)
    full_data = df.to_dict("records")
    
    # Ensure output directories
    output_dir = Path(__file__).parent.parent.parent / "outputs"
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
                current_k_values = k_values.copy()
                if not smoke and size >= 40000:
                    current_k_values.extend([k for k in extreme_k_values if k <= size])

                for k in current_k_values:
                    times = []
                    memory_usages = []
                    for _ in range(3):  # 3 runs per config
                        tracemalloc.start()
                        _, elapsed = rank_products(data, strategy, algorithm, k)
                        current, peak = tracemalloc.get_traced_memory()
                        tracemalloc.stop()
                        times.append(elapsed * 1000)  # Convert to ms
                        memory_usages.append(peak / 1024 / 1024)  # Convert to MB
                    
                    avg_time = sum(times) / len(times)
                    avg_memory = sum(memory_usages) / len(memory_usages)
                    results.append({
                        "dataset_size": size,
                        "strategy": strategy,
                        "algorithm": algorithm,
                        "k": k,
                        "avg_time_ms": round(avg_time, 4),
                        "std_time_ms": round((sum((t - avg_time) ** 2 for t in times) / len(times)) ** 0.5, 4),
                        "avg_memory_mb": round(avg_memory, 4)
                    })
                    print(f"  {strategy} / {algorithm} / k={k}: {avg_time:.2f} ms | {avg_memory:.2f} MB")
    
    # Write CSV
    csv_path = bench_dir / "benchmark_results.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"\nResults saved to {csv_path}")
    
    return results, bench_dir, report_dir
