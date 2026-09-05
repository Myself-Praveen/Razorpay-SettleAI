# M1: CSV Parsing & Data Ingestion

## Goals
- Support uploading and parsing of standard CSV bank statements.
- Map custom CSV columns to SettleAI's internal standard ledger schema.
- Validate data types and handle missing values before passing to the reconciliation DAG.

## Non-Goals
- Real-time API integration with banks.
- Direct database persistence of raw statements (temporary file processing only).

## Requirements
- **Standard CSV Support:** The system must accept generic CSV uploads from the frontend UI.
- **Dynamic Column Mapping:** The backend must be able to map varying column headers to internal fields (Date, Description, Amount, Reference ID).
- **Validation:** The system must validate the parsed rows against expected types and flag rows with missing or malformed data.
