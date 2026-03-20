import { useEffect, useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { StockCard } from "./components/StockCard";
import { SettingsModal } from "./components/SettingsModal";

const getDefaultTickers = (): string[] => {
    const envTickers = import.meta.env.STOCKS;
    if (envTickers && typeof envTickers === "string") {
        return envTickers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return ["VOO", "VGT", "IBIT", "IAUM"];
};

function App() {
    const [tickers, setTickers] = useState<string[]>([]);
    const [refreshRate, setRefreshRate] = useState<number>(10);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Load state from localStorage on mount
    useEffect(() => {
        const storedTickers = localStorage.getItem("dashboard_tickers");
        const storedRate = localStorage.getItem("dashboard_refreshRate");

        if (storedTickers) {
            setTickers(JSON.parse(storedTickers));
        } else {
            // Default tickers
            setTickers(getDefaultTickers());
        }

        if (storedRate) {
            setRefreshRate(Number(storedRate));
        }
    }, []);

    // Fetch data
    useEffect(() => {
        if (tickers.length === 0) {
            setQuotes([]);
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const ipcRenderer = (window as any).ipcRenderer;
                if (ipcRenderer && ipcRenderer.invoke) {
                    const results = await ipcRenderer.invoke(
                        "get-stock-quotes",
                        tickers,
                    );
                    setQuotes(results);
                    setLastUpdated(new Date());
                }
            } catch (error) {
                console.error("Failed to fetch quotes:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const interval = setInterval(fetchData, refreshRate * 1000);
        return () => clearInterval(interval);
    }, [tickers, refreshRate]);

    const handleAddTicker = (symbol: string) => {
        const newTickers = [...tickers, symbol];
        setTickers(newTickers);
        localStorage.setItem("dashboard_tickers", JSON.stringify(newTickers));
    };

    const handleRemoveTicker = (symbol: string) => {
        const newTickers = tickers.filter((t) => t !== symbol);
        setTickers(newTickers);
        localStorage.setItem("dashboard_tickers", JSON.stringify(newTickers));
    };

    const handleUpdateRate = (rate: number) => {
        setRefreshRate(rate);
        localStorage.setItem("dashboard_refreshRate", rate.toString());
    };

    const handleResetStorage = () => {
        localStorage.removeItem("dashboard_tickers");
        localStorage.removeItem("dashboard_refreshRate");
        setTickers(getDefaultTickers());
        setRefreshRate(10);
    };

    return (
        <>
            <header className="app-header">
                <h1 className="app-title">
                    <img
                        src="/icon.png"
                        width="32"
                        height="32"
                        alt="Titanium Dashboard Logo"
                        style={{ borderRadius: "6px" }}
                    />
                    Titanium Dashboard
                </h1>
                <button
                    className="icon-btn"
                    onClick={() => setIsSettingsOpen(true)}
                >
                    <Cog6ToothIcon style={{ width: 20, height: 20 }} />
                </button>
            </header>

            <main>
                {isLoading && quotes.length === 0 ? (
                    <div className="loader-container">
                        <div className="loader"></div>
                        <div>Loading market data...</div>
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {quotes.map((quote) => (
                            <StockCard
                                key={quote.symbol}
                                symbol={quote.symbol}
                                name={quote.shortName || quote.longName}
                                price={quote.regularMarketPrice}
                                change={quote.regularMarketChange}
                                changePercent={quote.regularMarketChangePercent}
                                chart={quote.chart}
                            />
                        ))}
                        {quotes.length === 0 && !isLoading && (
                            <div className="empty-state">
                                <h3>No Tickers</h3>
                                <p>
                                    Add some stock symbols in the settings to
                                    get started.
                                </p>
                                <button
                                    className="btn-primary"
                                    onClick={() => setIsSettingsOpen(true)}
                                    style={{ margin: "0 auto" }}
                                >
                                    Open Settings
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {lastUpdated && quotes.length > 0 && (
                    <div className="last-updated">
                        Last updated: {lastUpdated.toLocaleTimeString()}{" "}
                        (Updates every {refreshRate}s)
                    </div>
                )}
            </main>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                tickers={tickers}
                refreshRate={refreshRate}
                onAddTicker={handleAddTicker}
                onRemoveTicker={handleRemoveTicker}
                onUpdateRate={handleUpdateRate}
                onReset={handleResetStorage}
            />
        </>
    );
}

export default App;
