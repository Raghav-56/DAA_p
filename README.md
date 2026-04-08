# E-Commerce Product Ranking: Proof of Concept

## Overview

This project is a simple proof-of-concept for ranking products from a 42K e-commerce dataset.

It has two parts:
1. A basic HTTP API that returns ranked product IDs.
2. A benchmark module that compares algorithm runtime.

## Objectives

1. Build a simple ranking API with clear request and response format.
2. Measure performance across dataset sizes and Top-K values.

---

## Core Deliverables

### Component A: Ranking Server

**HTTP API**: `POST /rank` accepts strategy, algorithm, and `k`. Returns ranked product IDs and timing info.

**Implementation stack**: FastAPI + Uvicorn.

**Supported strategies**:
- Single-attribute ranking (ascending or descending)

**Algorithms**:
- Merge Sort ($O(n \log n)$)
- Quick Sort (average $O(n \log n)$)

**Main behavior**:
- Deterministic ranking order
- Basic input validation
- Optional simple caching

**Details**: See [project.md § 4](project.md#4-server-architecture--requestresponse-protocol)

### Component B: Benchmarking

Benchmarks run on dataset sizes `{1K, 5K, 10K, 42K}` and Top-K values `{10, 100}`.

Outputs include runtime CSV files and summary plots.

**Details**: See [project.md § 9](project.md#9-benchmark-design-and-validation-protocol)

---

## Scope: What Is Included

- Python API with `/rank` and `/health` endpoints
- Merge Sort and Quick Sort ranking paths
- Single-attribute ranking strategies (ascending, descending)
- Benchmark runs across 4 dataset sizes and 2 k values
- Output CSV and report artifacts
- Basic smoke tests

## Scope: What Is Out of Scope

- Pareto ranking and multi-objective optimization
- Personalized ranking profiles
- Explainable rank reasoning per product
- Advanced ETL pipelines

For extended ideas, refer to `Extended/README_extended.md` and `Extended/project_extended.md`.

## Dataset

**Amazon Products Sales 42K (2025)**

- Source: [Kaggle](https://www.kaggle.com/datasets/ikramshah512/amazon-products-sales-dataset-42k-items-2025)
- License: CC BY-NC 4.0 (non-commercial research)
- Scale: 42,000+ products
- Core attributes: `price`, `rating`
- Optional attributes: `discount`, `reviews_count`, `delivery_time`, `category`

Data notes and schema mapping are in [dataset.md](dataset.md).

## Ranking & Algorithms

Ranking order is deterministic.

- Primary key: selected strategy score/value
- Tie-breakers: stable strategy rules, then `product_id`, then `row_uid`
- Floating-point tolerance for score equality: $|a-b| \le 1e-9$

More details: [project.md](project.md)

## References

- [project.md](project.md): technical specification
- [dataset.md](dataset.md): dataset details and mapping
- [links.md](links.md): data and repository links
- [Extended/](Extended/): advanced roadmap

## Setup and Reproducibility

Install dependencies:

```bash
uv sync
```

Optional package commands:

```bash
uv add <package>
uv add --dev <package>
```

## Run API Server

```bash
uv run uvicorn Src.api.app:app --host 0.0.0.0 --port 5000
```

Health check:

```bash
uv run curl http://localhost:5000/health
```

## Run Benchmarks

Smoke run:

```bash
uv run python Src/main.py benchmark --smoke
```

Full run:

```bash
uv run python Src/main.py benchmark --full
```

## Run Tests

Smoke tests:

```bash
uv run pytest -m smoke -v
```

Full suite:

```bash
uv run pytest -v
```

## Output Artifacts

- `outputs/benchmarks/benchmark_results.csv`
- `outputs/rankings/*.json`
- `outputs/reports/benchmark_report.md`
- `outputs/reports/runtime_scaling.png`
- `outputs/reports/algorithm_comparison.png`
- `outputs/reports/speedup_analysis.png`
