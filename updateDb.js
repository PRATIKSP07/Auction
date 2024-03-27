const cron = require('node-cron');
const { Pool } = require('pg');
require("dotenv").config();
const pool = require('./dbConfig');

const updateQuery = `
    UPDATE Auctions SET
        prodStatus = CASE
            WHEN highestBid > 0 AND CURRENT_TIMESTAMP > endTime THEN 'sold'
            WHEN highestBid > 0 THEN 'unsold'
            ELSE prodStatus
        END,
        auctionStatus = CASE
            WHEN CURRENT_TIMESTAMP < startTime THEN 'upcoming'
            WHEN CURRENT_TIMESTAMP >= startTime AND CURRENT_TIMESTAMP <= endTime THEN 'ongoing'
            ELSE 'ended'
        END
`;

cron.schedule('* * * * * *', async () => {
    try {
        const client = await pool.connect();
        await client.query(updateQuery);
        client.release();
        
    } catch (error) {
        console.error('Error updating auction statuses:', error);
        exit(1);
    }
});
