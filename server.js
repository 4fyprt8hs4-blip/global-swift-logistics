"use strict";

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const path = require("path");
const crypto = require("crypto");

const pool = require("./database");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

app.use(helmet());
app.use(express.json({ limit: "20kb" }));

app.use(
    express.static(path.join(__dirname, "..", "public"))
);


// =========================
// HELPERS
// =========================

function requireAdmin(req, res, next) {
    const providedKey = req.get("x-admin-key");
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || !providedKey) {
        return res.status(401).json({
            error: "Unauthorized."
        });
    }

    const providedBuffer = Buffer.from(providedKey);
    const expectedBuffer = Buffer.from(expectedKey);

    if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        return res.status(401).json({
            error: "Unauthorized."
        });
    }

    next();
}


function validTrackingNumber(value) {
    return (
        typeof value === "string" &&
        /^[A-Za-z0-9-]{5,50}$/.test(value)
    );
}


// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            service: "Global Swift Logistics API"
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            status: "unavailable"
        });
    }
});


// =========================
// PUBLIC SHIPMENT TRACKING
// =========================

app.get("/api/track/:trackingNumber", async (req, res) => {
    const trackingNumber = req.params.trackingNumber.trim();

    if (!validTrackingNumber(trackingNumber)) {
        return res.status(400).json({
            error: "Please enter a valid tracking number."
        });
    }

    try {
        const shipmentResult = await pool.query(
            `SELECT
                tracking_number,
                origin,
                destination,
                status,
                estimated_delivery,
                updated_at
             FROM shipments
             WHERE UPPER(tracking_number) = UPPER($1)
             LIMIT 1`,
            [trackingNumber]
        );

        if (shipmentResult.rowCount === 0) {
            return res.status(404).json({
                error: "Shipment not found. Please check your tracking number."
            });
        }

        const shipment = shipmentResult.rows[0];

        const eventsResult = await pool.query(
            `SELECT
                status,
                location,
                description,
                event_time
             FROM shipment_events
             WHERE shipment_id = (
                SELECT id
                FROM shipments
                WHERE UPPER(tracking_number) = UPPER($1)
             )
             ORDER BY event_time DESC, id DESC`,
            [trackingNumber]
        );

        res.json({
            trackingNumber: shipment.tracking_number,
            origin: shipment.origin,
            destination: shipment.destination,
            status: shipment.status,
            estimatedDelivery: shipment.estimated_delivery,
            updatedAt: shipment.updated_at,
            history: eventsResult.rows
        });

    } catch (error) {
        console.error("Tracking request failed:", error.message);

        res.status(500).json({
            error: "Unable to retrieve shipment information right now."
        });
    }
});


// =========================
// CREATE SHIPMENT
// =========================

app.post("/api/admin/shipments", requireAdmin, async (req, res) => {
    const {
        trackingNumber,
        senderName,
        receiverName,
        origin,
        destination,
        estimatedDelivery
    } = req.body;

    if (
        !validTrackingNumber(trackingNumber) ||
        typeof origin !== "string" ||
        typeof destination !== "string" ||
        !origin.trim() ||
        !destination.trim()
    ) {
        return res.status(400).json({
            error: "Provide a valid tracking number, origin, and destination."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const shipmentResult = await client.query(
            `INSERT INTO shipments (
                tracking_number,
                sender_name,
                receiver_name,
                origin,
                destination,
                estimated_delivery
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                trackingNumber.trim().toUpperCase(),
                senderName || null,
                receiverName || null,
                origin.trim(),
                destination.trim(),
                estimatedDelivery || null
            ]
        );

        const shipment = shipmentResult.rows[0];

        await client.query(
            `INSERT INTO shipment_events (
                shipment_id,
                status,
                location,
                description
            )
            VALUES ($1, $2, $3, $4)`,
            [
                shipment.id,
                "Shipment Created",
                origin.trim(),
                "Shipment record created."
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Shipment created successfully.",
            trackingNumber: shipment.tracking_number
        });

    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === "23505") {
            return res.status(409).json({
                error: "That tracking number already exists."
            });
        }

        if (error.code === "23514") {
            return res.status(400).json({
                error: "The shipment contains an invalid value."
            });
        }

        console.error("Shipment creation failed:", error.message);

        res.status(500).json({
            error: "Unable to create shipment."
        });

    } finally {
        client.release();
    }
});


// =========================
// ADD SHIPMENT UPDATE
// =========================

app.post(
    "/api/admin/shipments/:trackingNumber/events",
    requireAdmin,
    async (req, res) => {
        const trackingNumber = req.params.trackingNumber.trim();

        const {
            status,
            location,
            description
        } = req.body;

        const allowedStatuses = [
            "Shipment Created",
            "Picked Up",
            "In Transit",
            "At Facility",
            "Out for Delivery",
            "Delivered",
            "Delivery Exception",
            "On Hold",
            "Returned"
        ];

        if (!validTrackingNumber(trackingNumber)) {
            return res.status(400).json({
                error: "Invalid tracking number."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid shipment status."
            });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const shipmentResult = await client.query(
                `SELECT id
                 FROM shipments
                 WHERE UPPER(tracking_number) = UPPER($1)
                 FOR UPDATE`,
                [trackingNumber]
            );

            if (shipmentResult.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Shipment not found."
                });
            }

            const shipmentId = shipmentResult.rows[0].id;

            await client.query(
                `INSERT INTO shipment_events (
                    shipment_id,
                    status,
                    location,
                    description
                )
                VALUES ($1, $2, $3, $4)`,
                [
                    shipmentId,
                    status,
                    typeof location === "string"
                        ? location.trim()
                        : null,
                    typeof description === "string"
                        ? description.trim()
                        : null
                ]
            );

            await client.query(
                `UPDATE shipments
                 SET status = $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [status, shipmentId]
            );

            await client.query("COMMIT");

            res.json({
                message: "Shipment status updated successfully."
            });

        } catch (error) {
            await client.query("ROLLBACK");

            console.error("Shipment update failed:", error.message);

            res.status(500).json({
                error: "Unable to update shipment."
            });

        } finally {
            client.release();
        }
    }
);


// =========================
// NOT FOUND
// =========================

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});


// =========================
// ERROR HANDLER
// =========================

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error("Unhandled server error:", error.message);

    res.status(500).json({
        error: "An unexpected server error occurred."
    });
});


// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
    console.log(
        `Global Swift Logistics server running on http://localhost:${PORT}`
    );
});