CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,

    tracking_number VARCHAR(50) UNIQUE NOT NULL,

    sender_name VARCHAR(150),
    receiver_name VARCHAR(150),

    origin VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,

    status VARCHAR(40) NOT NULL DEFAULT 'Shipment Created',

    estimated_delivery DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_shipment_status CHECK (
        status IN (
            'Shipment Created',
            'Picked Up',
            'In Transit',
            'At Facility',
            'Out for Delivery',
            'Delivered',
            'Delivery Exception',
            'On Hold',
            'Returned'
        )
    )
);


CREATE TABLE IF NOT EXISTS shipment_events (
    id BIGSERIAL PRIMARY KEY,

    shipment_id BIGINT NOT NULL
        REFERENCES shipments(id)
        ON DELETE CASCADE,

    status VARCHAR(40) NOT NULL,

    location VARCHAR(150),

    description TEXT,

    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number
ON shipments(tracking_number);


CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id
ON shipment_events(shipment_id);


CREATE INDEX IF NOT EXISTS idx_shipment_events_event_time
ON shipment_events(event_time);