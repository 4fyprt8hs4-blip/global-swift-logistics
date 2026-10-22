"use strict";

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is missing from the environment.");
}

const pool = new Pool({
    connectionString,

    // Enable SSL for managed databases when required.
    ssl:
        process.env.DATABASE_SSL === "true"
            ? { rejectUnauthorized: true }
            : false
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = pool;