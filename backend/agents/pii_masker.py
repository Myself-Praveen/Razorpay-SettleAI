"""
SettleAI — Deterministic PII Masking.

Provides safe UUID-based masking of sensitive strings (descriptions, IDs)
to prevent PII leakage when transmitting context to LLMs.
"""

import hashlib

class PIIMasker:
    """Masks PII deterministically."""

    @staticmethod
    def mask(value: str) -> str:
        """Deterministically mask a string with a SHA-256 derived UUID-like string."""
        if not value:
            return ""
        
        # Hash the value to get a deterministic replacement
        h = hashlib.sha256(value.encode('utf-8')).hexdigest()
        # Return a faux UUID format: 8-4-4-4-12
        return f"MASKED-{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

    @staticmethod
    def mask_dict(data: dict, fields_to_mask: list[str]) -> dict:
        """Mask specific fields in a dictionary."""
        masked_data = data.copy()
        for field in fields_to_mask:
            if field in masked_data and isinstance(masked_data[field], str):
                masked_data[field] = PIIMasker.mask(masked_data[field])
        return masked_data
