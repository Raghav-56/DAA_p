from typing import Any
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .algorithms import rank_product_rows, rank_products


app = FastAPI(title="Product Ranking API")

# Load dataset
DATASET_PATH = Path(__file__).parent.parent / "Dataset" / "amazon_products_sales_data" / "amazon_products_sales_data_cleaned.csv"
STATIC_DIR = Path(__file__).parent / "static"
_cache = {}

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def load_data():
    """Load and cache the dataset."""
    if "data" not in _cache:
        df = pd.read_csv(DATASET_PATH)
        # Ensure required columns
        required = ["product_title", "discounted_price", "product_rating"]
        if not all(col in df.columns for col in required):
            raise ValueError(f"Dataset missing required columns: {required}")
        
        # Add product_id based on index if not present
        if "product_id" not in df.columns:
            df["product_id"] = [f"prod_{i}" for i in range(len(df))]
        
        # Convert to list of dicts
        _cache["data"] = df.to_dict("records")
    return _cache["data"]


class RankRequest(BaseModel):
    """Request body for /rank endpoint."""
    strategy: str  # e.g., "price_desc", "rating_asc"
    algorithm: str  # "merge_sort" or "quick_sort"
    k: int


class RankResponse(BaseModel):
    """Response from /rank endpoint."""
    ranked_ids: list[str]
    elapsed_time_ms: float
    count: int


class RankRowsResponse(BaseModel):
    """Response from /rank/rows endpoint with full product rows."""
    ranked_products: list[dict[str, Any]]
    elapsed_time_ms: float
    count: int


@app.get("/")
def home():
    """Serve a minimal frontend for ranking and card display."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/rank", response_model=RankResponse)
def rank(request: RankRequest):
    """Rank products by strategy using selected algorithm."""
    try:
        data = load_data()
        ranked_ids, elapsed = rank_products(data, request.strategy, request.algorithm, request.k)
        return RankResponse(
            ranked_ids=ranked_ids,
            elapsed_time_ms=elapsed * 1000,
            count=len(ranked_ids),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/rank/rows", response_model=RankRowsResponse)
def rank_rows(request: RankRequest):
    """Rank products and return full row data for top-k results."""
    try:
        data = load_data()
        ranked_rows, elapsed = rank_product_rows(data, request.strategy, request.algorithm, request.k)
        return RankRowsResponse(
            ranked_products=ranked_rows,
            elapsed_time_ms=elapsed * 1000,
            count=len(ranked_rows),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
