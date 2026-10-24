-- Run AFTER scheme.sql. Safe to run more than once.

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS package_description VARCHAR(250),
    ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid'
        CHECK (payment_status IN ('Unpaid', 'Paid', 'Pending'));

CREATE TABLE IF NOT EXISTS receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_number VARCHAR(40) UNIQUE NOT NULL,
    shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    payment_method VARCHAR(60),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_shipment_id ON receipts(shipment_id);
