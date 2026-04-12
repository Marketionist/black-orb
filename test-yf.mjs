/**
 * Standalone test script for Yahoo Finance API (direct fetch).
 */

const BASE_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com',
};

class CrumbManager {
    constructor() {
        this.cookie = null;
        this.crumb = null;
    }

    async refresh() {
        try {
            console.log("Refreshing crumb/cookie...");
            const initialResponse = await fetch('https://fc.yahoo.com/', {
                headers: BASE_HEADERS,
                redirect: 'manual',
            });
            const setCookie = initialResponse.headers.get('set-cookie');
            if (setCookie) {
                this.cookie = setCookie.split(';')[0];
            }

            const crumbResponse = await fetch(
                'https://query1.finance.yahoo.com/v1/test/getcrumb',
                {
                    headers: { ...BASE_HEADERS, Cookie: this.cookie || '' },
                }
            );

            if (crumbResponse.ok) {
                this.crumb = await crumbResponse.text();
                console.log("Success! Crumb:", this.crumb ? "***" : "FAILED");
            } else {
                console.warn("Failed to fetch crumb, status:", crumbResponse.status);
            }
        } catch (e) {
            console.error("Crumb refresh error:", e.message);
        }
    }

    async getCredentials() {
        if (!this.crumb) await this.refresh();
        return { cookie: this.cookie, crumb: this.crumb };
    }
}

const crumbManager = new CrumbManager();

async function fetchQuote(symbols) {
    const { cookie, crumb } = await crumbManager.getCredentials();
    const crumbParam = crumb ? `&crumb=${crumb}` : '';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}${crumbParam}`;

    const res = await fetch(url, {
        headers: { ...BASE_HEADERS, Cookie: cookie || '' }
    });
    const data = await res.json();
    return data.quoteResponse?.result || [];
}

async function fetchChart(symbol, period1, interval = '1d') {
    const p1 = Math.floor(period1.getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000);
    const { cookie, crumb } = await crumbManager.getCredentials();
    const crumbParam = crumb ? `&crumb=${crumb}` : '';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${p1}&period2=${p2}&interval=${interval}${crumbParam}`;

    const res = await fetch(url, {
        headers: { ...BASE_HEADERS, Cookie: cookie || '' }
    });
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return { quotes: [] };

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    return {
        quotes: timestamps.map((t, i) => ({
            date: new Date(t * 1000).toISOString(),
            close: closes[i]
        }))
    };
}

async function run() {
    const symbols = ["VOO", "AAPL", "CAD=X", "IBIT"];
    console.log("--- Testing Quotes ---");
    try {
        const quotes = await fetchQuote(symbols);
        console.log(`Fetched ${quotes.length} quotes.`);
        quotes.forEach(q => console.log(`${q.symbol}: ${q.regularMarketPrice} (${q.regularMarketChangePercent}%)`));
    } catch (e) {
        console.error("QUOTE ERROR:", e.message);
    }

    console.log("\n--- Testing Chart (30d) ---");
    try {
        const period1 = new Date(Date.now() - 30 * 86400000);
        const chart = await fetchChart("AAPL", period1);
        console.log(`Fetched ${chart.quotes.length} data points.`);
        if (chart.quotes.length > 0) {
            console.log("First point:", chart.quotes[0]);
            console.log("Last point :", chart.quotes[chart.quotes.length - 1]);
        }
    } catch (e) {
        console.error("CHART ERROR:", e.message);
    }
}

run();
