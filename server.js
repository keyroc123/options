const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Global cache variable to store the data in server memory
let cachedData = {
    success: false,
    puts: [],
    calls: [],
    lastUpdated: null,
    error: "Server is currently performing its initial data pull. Please wait..."
};

// Main scraper function
async function performAutomatedScrape() {
    console.log(`[${new Date().toISOString()}] Automated background scrape started...`);
    
    const url1 = "https://optioncharts.io/options/SPY/option-chain?option_type=put&expiration_dates=2026-06-23:w&view=list&strike_range=all";
    const url2 = "https://optioncharts.io/options/SPY/option-chain?option_type=call&expiration_dates=2026-06-23:w&view=list&strike_range=all";

    try {
        const [response1, response2] = await Promise.all([
            axios.get(url1, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }),
            axios.get(url2, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
        ]);

        // Parse Puts
        const $1 = cheerio.load(response1.data);
        const putRows = [];
        const putHeaders = [];
        $1('#option_chain_table_id-put thead th').each((i, el) => putHeaders.push($1(el).text().trim() || `col_${i}`));
        $1('#option_chain_table_id-put tbody tr').each((i, rowEl) => {
            let rowData = {};
            $1(rowEl).find('td').each((j, cellEl) => { rowData[putHeaders[j]] = $1(cellEl).text().trim(); });
            if (Object.keys(rowData).length > 0) putRows.push(rowData);
        });

        // Parse Calls
        const $2 = cheerio.load(response2.data);
        const callRows = [];
        const callHeaders = [];
        $2('#option_chain_table_id-call thead th').each((i, el) => callHeaders.push($2(el).text().trim() || `col_${i}`));
        $2('#option_chain_table_id-call tbody tr').each((i, rowEl) => {
            let rowData = {};
            $2(rowEl).find('td').each((j, cellEl) => { rowData[callHeaders[j]] = $2(cellEl).text().trim(); });
            if (Object.keys(rowData).length > 0) callRows.push(rowData);
        });

        // Update the global memory cache safely
        cachedData = {
            success: true,
            puts: putRows,
            calls: callRows,
            lastUpdated: new Date().getTime(),
            error: null
        };
        console.log(`[${new Date().toISOString()}] Cache updated successfully. Puts: ${putRows.length}, Calls: ${callRows.length}`);

    } catch (error) {
        console.error("Background scraper error:", error.message);
        // Do not erase old successful cache on a single network failure
        cachedData.error = `Last scrape failed: ${error.message}. Serving stale data.`;
    }
}

// 1. Run immediately when the server starts up
performAutomatedScrape();

// 2. Automatically repeat the scrape exactly once every 60,000 milliseconds (1 minute)
setInterval(performAutomatedScrape, 60000);

// API Endpoint now instantly returns the cached memory payload
app.get('/api/live-options', (req, res) => {
    res.json(cachedData);
});

app.listen(PORT, () => console.log(`Server executing live on port ${PORT}`));
