"""
SettleAI - CSV Parser Adapter
Uses LLM to infer column mappings from unknown CSVs.
"""

import json
import os
import io
import csv
import httpx
from datetime import datetime
from ..models import NormalizedRecord, RecordSource, TransactionType
from ..otel import traced_operation

CSV_PROMPT = """You are a financial data integration expert. 
Given a CSV header and the first few rows, map the columns to the following standard schema:
- date (Transaction Date)
- amount (Transaction Amount)
- description (Description/Narration)
- reference (UTR, Reference ID, or Transaction ID)
- type (Optional: Debit/Credit indicator if available)

Output ONLY a JSON object mapping the standard field names to the EXACT CSV column names. If a field cannot be determined, set it to null.
Example:
{
  "date": "Txn Date",
  "amount": "Withdrawal Amt.",
  "description": "Narration",
  "reference": "Ref No.",
  "type": "Cr/Dr"
}
"""

async def infer_csv_mapping(header_row: list[str], sample_rows: list[list[str]]) -> dict:
    context = f"Headers: {header_row}\nSample Data: {sample_rows}"
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gemini-1.5-flash",
                        "temperature": 0,
                        "messages": [
                            {"role": "system", "content": CSV_PROMPT},
                            {"role": "user", "content": context},
                        ],
                    },
                )
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"]
                    return _parse_json(raw)
        except Exception:
            pass

    # Basic fallback mapping
    return _fallback_mapping(header_row)

def _parse_json(raw: str) -> dict:
    try:
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
        return json.loads(raw.strip())
    except (json.JSONDecodeError, IndexError):
        return {}

def _fallback_mapping(headers: list[str]) -> dict:
    mapping = {}
    lower_headers = [h.lower() for h in headers]
    for h in lower_headers:
        if "date" in h and "date" not in mapping:
            mapping["date"] = headers[lower_headers.index(h)]
        elif ("amount" in h or "amt" in h) and "amount" not in mapping:
            mapping["amount"] = headers[lower_headers.index(h)]
        elif ("desc" in h or "narration" in h) and "description" not in mapping:
            mapping["description"] = headers[lower_headers.index(h)]
        elif ("ref" in h or "utr" in h or "id" in h) and "reference" not in mapping:
            mapping["reference"] = headers[lower_headers.index(h)]
    return mapping

def parse_csv(content: str, mapping: dict) -> list[NormalizedRecord]:
    reader = csv.DictReader(io.StringIO(content))
    records = []
    
    date_col = mapping.get("date")
    amt_col = mapping.get("amount")
    desc_col = mapping.get("description")
    ref_col = mapping.get("reference")
    
    import random
    
    for row in reader:
        if not amt_col or row.get(amt_col) is None or str(row.get(amt_col)).strip() == "":
            continue
            
        amount_str = str(row[amt_col]).replace(",", "")
        try:
            if amount_str.startswith("-"):
                amount_str = amount_str[1:]
                txn_type = TransactionType.REFUND
                credit = "0"
                debit = str(int(float(amount_str) * 100))
            else:
                txn_type = TransactionType.PAYMENT
                credit = str(int(float(amount_str) * 100))
                debit = "0"
                
            amount_paise = str(int(float(amount_str) * 100))
        except ValueError:
            continue
            
        records.append(NormalizedRecord(
            id=f"csv_{random.randint(100000, 999999)}",
            source=RecordSource.BANK,
            amount=amount_paise,
            type=txn_type,
            credit=credit,
            debit=debit,
            description=row.get(desc_col, "") if desc_col else "",
            bank_utr=row.get(ref_col, "") if ref_col else "",
            settled_at=datetime.utcnow(),
            currency="INR"
        ))
    return records
