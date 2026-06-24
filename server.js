const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Secure memory cache defaults
let cachedData = {
    success: false,
    puts: [],
    calls: [],
    lastUpdated: null,
    error: "Initializing server memory. Your first data payload is downloading right now..."
};

// Fixed API Stream Scraper
async function performAutomatedScrape() {
    console.log("Executing background endpoint pull...");
    
    // Target the actual underlying raw JSON data streams to bypass complex HTML parsing
    const putApiUrl = "https://optioncharts.io";
    const callApiUrl = "https://optioncharts.io";

    try {
        const [putRes, callRes] = await Promise.all([
            axios.get(putApiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }),
            axios.get(callApiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 })
        ]);

        // Standardize the raw dataset objects directly from the host's internal database
        cachedData = {
            success: true,
            puts: Array.isArray(putRes.data) ? putRes.data : [],
            calls: Array.isArray(callRes.data) ? callRes.data : [],
            lastUpdated: Date.now(),
            error: null
        };
        console.log("Data cache successfully refreshed.");
    } catch (error) {
        console.error("Fetch failed:", error.message);
        cachedData.error = `Scraper network delay: ${error.message}. Serving previous records.`;
    }
}

// ROUTE: Instantly delivers whatever is currently sitting in memory cache
app.get('/api/live-options', (req, res) => {
    res.json(cachedData);
});

// CRITICAL FIX: Listen to the network port FIRST so Render flags the app as "Healthy"
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    
    // Kick off the first scrape 2 seconds AFTER the server has safely booted up
    setTimeout(performAutomatedScrape, 2000);
    
    // Run loop exactly once every 60 seconds
    setInterval(performAutomatedScrape, 60000);
});
