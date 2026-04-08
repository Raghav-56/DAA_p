"""Sorting algorithms and ranking logic."""

import time
import random
import sys
from typing import Callable

# Increase recursion limit for large datasets
sys.setrecursionlimit(50000)


def merge_sort(arr: list[tuple], key: Callable = lambda x: x[0], descending: bool = False) -> list[tuple]:
    """Merge Sort: O(n log n) time, stable."""
    if len(arr) <= 1:
        return arr

    def merge(left, right):
        result = []
        i = j = 0
        while i < len(left) and j < len(right):
            l_val, r_val = key(left[i]), key(right[j])
            if (l_val > r_val) if descending else (l_val < r_val):
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        result.extend(left[i:])
        result.extend(right[j:])
        return result

    def merge_sort_recursive(arr):
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = merge_sort_recursive(arr[:mid])
        right = merge_sort_recursive(arr[mid:])
        return merge(left, right)

    return merge_sort_recursive(arr)


def quick_sort(arr: list[tuple], key: Callable = lambda x: x[0], descending: bool = False) -> list[tuple]:
    """Quick Sort with random pivot: average $O(n \\log n)$ time, in-place variation."""
    if len(arr) <= 1:
        return arr

    def partition(arr, low, high):
        # Random pivot selection to avoid worst case
        rand_idx = random.randint(low, high)
        arr[rand_idx], arr[high] = arr[high], arr[rand_idx]
        
        pivot = key(arr[high])
        i = low - 1
        for j in range(low, high):
            if (key(arr[j]) > pivot) if descending else (key(arr[j]) < pivot):
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        return i + 1

    def quick_sort_recursive(arr, low, high):
        if low < high:
            pi = partition(arr, low, high)
            quick_sort_recursive(arr, low, pi - 1)
            quick_sort_recursive(arr, pi + 1, high)
        return arr

    arr_copy = arr.copy()
    return quick_sort_recursive(arr_copy, 0, len(arr_copy) - 1)


def rank_products(
    data: list[dict],
    strategy: str,
    algorithm: str,
    k: int,
) -> tuple[list[str], float]:
    """
    Rank products using specified strategy and algorithm.
    
    Args:
        data: List of product dicts with 'product_title', 'discounted_price', 'product_rating', etc.
        strategy: 'price_asc', 'price_desc', 'rating_asc', 'rating_desc'
        algorithm: 'merge_sort' or 'quick_sort'
        k: Return top-k product IDs
    
    Returns:
        (ranked_ids, elapsed_time)
    """
    if not data:
        return [], 0.0

    # Map strategy to key function and sort order
    strategy_map = {
        "price_asc": (lambda x: float(x[1].get("discounted_price", 0)), False),
        "price_desc": (lambda x: float(x[1].get("discounted_price", 0)), True),
        "rating_asc": (lambda x: float(x[1].get("product_rating", 0)), False),
        "rating_desc": (lambda x: float(x[1].get("product_rating", 0)), True),
    }

    if strategy not in strategy_map:
        raise ValueError(f"Unknown strategy: {strategy}")

    key_func, descending = strategy_map[strategy]
    
    # Prepare data as (product_id, product_dict) tuples
    # Use row index as product_id if not present
    items = [(item.get("product_id", f"prod_{i}"), item) for i, item in enumerate(data)]

    # Sort using selected algorithm
    start = time.perf_counter()
    if algorithm == "merge_sort":
        sorted_items = merge_sort(items, key=key_func, descending=descending)
    elif algorithm == "quick_sort":
        sorted_items = quick_sort(items, key=key_func, descending=descending)
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    elapsed = time.perf_counter() - start

    # Extract top-k product IDs
    ranked_ids = [item[0] for item in sorted_items[:k]]
    
    return ranked_ids, elapsed
