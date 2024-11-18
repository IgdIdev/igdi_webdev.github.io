const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Create a new PostgreSQL client
const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: '1234',
    database: 'IGDI_DB',
    // Removed schema from the pool config, as it's not necessary here
});

// Set schema search path
pool.query('SET search_path TO public, gdb', (err) => {
    if (err) {
        console.error('Error setting search path:', err);
    } else {
        console.log('Search path set to public, gdb');
    }
});

// PostgreSQL notification listener
pool.connect((err, client, done) => {
    if (err) throw err;
    // Listen for PostgreSQL notifications
    client.on('notification', (msg) => {
        if (msg.channel === 'geojson_update') {
            console.log('Data in "01_kanluran" table has changed.');
            // You can trigger an action here, like refreshing data in the app
        }
    });
    client.query('LISTEN geojson_update');
});

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to the Leaflet API Server!');
});
// Sample API endpoint
app.get('/api/kanluran', async (req, res) => {
    try {
        // Query to get data in GeoJSON format
        const result = await pool.query(`
            SELECT 
                ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson, 
                * 
            FROM gdb."01_kanluran"
        `);
        
        // Transform the result into GeoJSON FeatureCollection format
        const geojsonFeatures = result.rows.map(row => ({
            type: 'Feature',
            geometry: JSON.parse(row.geojson),
            properties: { ...row },  // Attach other properties as needed
        }));

        // Send GeoJSON response
        res.json({
            type: 'FeatureCollection',
            features: geojsonFeatures
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});
// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${3000}`);
});
