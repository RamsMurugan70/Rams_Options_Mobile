const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const log = require('./utils/logger');
const optionsRoutes = require('./routes/optionsRoutes');

const app = express();
const PORT = process.env.PORT || 5003; // Dedicated 5003 port for Mobile App

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/options', optionsRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve Frontend Static Files (Local Dev Only. Netlify handles this via CDN automatically)
if (!process.env.NETLIFY) {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    app.listen(PORT, () => {
        log.info(`Server running on port ${PORT}`);
    });
}

// Export the App for the Netlify serverless wrapper
module.exports = app;
