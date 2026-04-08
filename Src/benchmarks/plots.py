import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def generate_benchmark_plots(results, report_dir):
    """
    Generate benchmark plots from results.
    
    Args:
        results: List of benchmark result dictionaries
        report_dir: Path to save plots
    """
    if not results:
        return
    
    # Set modern style
    sns.set_theme(style="whitegrid", context="talk")
    sns.set_palette("husl")

    df_results = pd.DataFrame(results)
    algorithms = list(set(r["algorithm"] for r in results))
    
    # Common filter: we only plot base k for standard comparisons to avoid clutter
    base_k = [10, 100, 1000]
    df_base = df_results[df_results["k"].isin(base_k)]

    # 1. Runtime vs dataset size (Line chart)
    fig, ax = plt.subplots(figsize=(12, 7))
    for algo in algorithms:
        subset = df_base[df_base["algorithm"] == algo]
        grouped = subset.groupby("dataset_size")["avg_time_ms"].mean()
        ax.plot(grouped.index, grouped.values, marker="o", linewidth=2.5, markersize=8, label=algo.replace('_', ' ').title())
    
    ax.set_xlabel("Dataset Size (Number of Products)")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Runtime Scaling by Dataset Size\n(Lower is better)", pad=15)
    ax.legend(title="Algorithm")
    plt.tight_layout()
    plt.savefig(report_dir / "runtime_scaling.png", dpi=150)
    plt.close()
    
    # 2. Algorithm comparison by K Value (Bar chart)
    fig, ax = plt.subplots(figsize=(12, 7))
    sns.barplot(
        data=df_base, 
        x="k", 
        y="avg_time_ms", 
        hue="algorithm",
        errorbar="sd", 
        capsize=0.1,
        ax=ax
    )
    
    ax.set_xlabel("Top K Items Requested")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Algorithm Performance by K Value\n(Error bars indicate standard deviation)", pad=15)
    
    # Modify legend titles
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, [l.replace('_', ' ').title() for l in labels], title="Algorithm")
    
    plt.tight_layout()
    plt.savefig(report_dir / "algorithm_comparison.png", dpi=150)
    plt.close()

    # 3. Space Complexity - Memory Usage (Line chart)
    if "avg_memory_mb" in df_results.columns:
        fig, ax = plt.subplots(figsize=(12, 7))
        for algo in algorithms:
            subset = df_base[df_base["algorithm"] == algo]
            grouped = subset.groupby("dataset_size")["avg_memory_mb"].mean()
            ax.plot(grouped.index, grouped.values, marker="s", linestyle="--", linewidth=2.5, markersize=8, label=algo.replace('_', ' ').title())
        
        ax.set_xlabel("Dataset Size (Number of Products)")
        ax.set_ylabel("Peak Auxiliary Memory (MB)")
        ax.set_title("Space Complexity: Auxiliary Memory Usage\n(Lower is better)", pad=15)
        ax.legend(title="Algorithm")
        plt.tight_layout()
        plt.savefig(report_dir / "memory_scaling.png", dpi=150)
        plt.close()

    # 4. Extreme K Scaling (Line chart for max dataset size)
    max_size = df_results["dataset_size"].max()
    df_extreme = df_results[df_results["dataset_size"] == max_size]
    
    if len(df_extreme["k"].unique()) > len(base_k):
        fig, ax = plt.subplots(figsize=(12, 7))
        for algo in algorithms:
            subset = df_extreme[df_extreme["algorithm"] == algo]
            grouped = subset.groupby("k")["avg_time_ms"].mean()
            ax.plot(grouped.index, grouped.values, marker="^", linewidth=2.5, markersize=8, label=algo.replace('_', ' ').title())
        
        ax.set_xscale('log')
        ax.set_xlabel(f"K Value (Log Scale, Max N = {max_size})")
        ax.set_ylabel("Average Time (ms)")
        ax.set_title("Extreme K Scaling Performance\n(How algorithms perform as K approaches N)", pad=15)
        ax.legend(title="Algorithm")
        plt.tight_layout()
        plt.savefig(report_dir / "extreme_k_scaling.png", dpi=150)
        plt.close()

