import { useEffect, useState, useRef, useCallback } from 'react';
import {
    Cog6ToothIcon, BellIcon, BellSlashIcon, BellAlertIcon
} from '@heroicons/react/24/outline';
import { StockCard } from './components/StockCard';
import { SettingsModal } from './components/SettingsModal';
import type { StockQuote } from './types';

const getDefaultTickers = (): string[] => {
    interface ImportMetaWithEnv {
        env: {
            STOCKS?: string;
        };
    }
    const envTickers = (import.meta as unknown as ImportMetaWithEnv).env.STOCKS;

    if (envTickers && typeof envTickers === 'string') {
        return envTickers
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return ['VOO', 'VGT', 'IBIT', 'IAUM', 'CAD=X',];
};

function App () {
    const [tickers, setTickers,] = useState<string[]>([]);
    const [refreshRate, setRefreshRate,] = useState<number>(10);
    const [quotes, setQuotes,] = useState<StockQuote[]>([]);
    const [isLoading, setIsLoading,] = useState<boolean>(true);
    const [isSettingsOpen, setIsSettingsOpen,] = useState<boolean>(false);
    const [hasError, setHasError,] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated,] = useState<Date | null>(null);
    const [timezone, setTimezone,] = useState<string>('Local');
    const [isTeslaMode, setIsTeslaMode,] = useState<boolean>(false);
    const [resetKey, setResetKey,] = useState<number>(0);
    const [tickerMutes, setTickerMutes,] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('dashboard_ticker_mutes');

        return stored ? JSON.parse(stored) : {};
    });
    const lastPlayedRef = useRef<Record<string, number>>({});
    const initialCheckRef = useRef<Record<string, boolean>>({});

    const playAlarm = useCallback(() => {
        type IpcInvoke = (channel: string, ...args: unknown[]) => Promise<void>;
        const winWithIpc = window as unknown as { ipcRenderer: { invoke: IpcInvoke } };

        if (winWithIpc.ipcRenderer && winWithIpc.ipcRenderer.invoke) {
            winWithIpc.ipcRenderer.invoke('play-alarm').catch((err) => console.error('Audio play failed', err));
        }
    }, []);

    const checkAlarms = useCallback((quotesToCheck: StockQuote[]) => {
        quotesToCheck.forEach((quote) => {
            const isMuted = tickerMutes[quote.symbol] || false;

            if (isMuted) { return; }

            const saved = localStorage.getItem(`dashboard_target_${quote.symbol}`);

            if (!saved) { return; }

            const target = Number(saved);

            if (isNaN(target)) { return; }

            const lastTarget = lastPlayedRef.current[`${quote.symbol}_target`] || 0;

            if (lastTarget !== target) {
                initialCheckRef.current[quote.symbol] = false;
                lastPlayedRef.current[`${quote.symbol}_target`] = target;
                delete lastPlayedRef.current[`${quote.symbol}_alerted_level`];
            }

            const lastLevelAlerted = lastPlayedRef.current[`${quote.symbol}_alerted_level`] || 0;
            const hasInitialChecked = initialCheckRef.current[quote.symbol];

            const prices = quote.chart && quote.chart.length > 0 ? quote.chart.map((p) => p.close) : [];
            const currentPrice = quote.regularMarketPrice;
            const allPrices = [...prices, currentPrice,];
            const dayMin = Math.min(...allPrices);
            const dayMax = Math.max(...allPrices);

            const isReached = target >= dayMin && target <= dayMax;

            if (isReached && lastLevelAlerted !== target) {
                playAlarm();
                lastPlayedRef.current[`${quote.symbol}_alerted_level`] = target;
                initialCheckRef.current[quote.symbol] = true;
            } else if (!hasInitialChecked) {
                initialCheckRef.current[quote.symbol] = true;
            }
        });
    }, [tickerMutes, playAlarm,]);

    const handleTargetUpdate = (symbol: string, isNew: boolean) => {
        if (isNew) {
            setTickerMutes((prev) => {
                if (!prev[symbol]) { return prev; }
                const next = { ...prev, [symbol]: false, };

                localStorage.setItem('dashboard_ticker_mutes', JSON.stringify(next));
                return next;
            });
        }

        if (quotes.length > 0) {
            checkAlarms(quotes);
        }
    };


    // Keyboard shortcut for Tesla Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                setIsTeslaMode((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Prevent scrolling in Tesla Mode
    useEffect(() => {
        if (isTeslaMode) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [isTeslaMode]);

    // Load state from localStorage on mount
    useEffect(() => {
        const storedTickers = localStorage.getItem('dashboard_tickers');
        const storedRate = localStorage.getItem('dashboard_refreshRate');
        const storedTimezone = localStorage.getItem('dashboard_timezone');

        if (storedTickers) {
            setTickers(JSON.parse(storedTickers));
        } else {
            // Default tickers
            setTickers(getDefaultTickers());
        }

        if (storedRate) {
            setRefreshRate(Number(storedRate));
        }

        if (storedTimezone) {
            setTimezone(storedTimezone);
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
            setHasError(false);
            try {
                type IpcInvoke = (channel: string, ...args: unknown[]) => Promise<StockQuote[]>;
                const winWithIpc = window as unknown as { ipcRenderer: { invoke: IpcInvoke } };
                const ipcRenderer = winWithIpc.ipcRenderer;

                if (ipcRenderer && ipcRenderer.invoke) {
                    const results = await ipcRenderer.invoke(
                        'get-stock-quotes',
                        tickers,
                        timezone
                    );

                    setQuotes(results);
                    setLastUpdated(new Date());
                    checkAlarms(results);
                }
            } catch (error) {
                console.error('Failed to fetch quotes:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData().catch((err) => {
            console.error('Initial fetch failed:', err);
        });

        const interval = setInterval(() => {
            fetchData().catch((err) => {
                console.error('Interval fetch failed:', err);
            });
        }, refreshRate * 1000);

        return () => clearInterval(interval);
    }, [tickers, refreshRate, timezone, checkAlarms,]);

    const handleMuteToggle = (symbol: string) => {

        setTickerMutes((prev) => {
            const next = { ...prev, [symbol]: !prev[symbol], };

            localStorage.setItem('dashboard_ticker_mutes', JSON.stringify(next));
            return next;
        });
    };

    const handleGlobalMuteToggle = () => {
        const anyUnmuted = tickers.some((t) => !tickerMutes[t]);
        const next: Record<string, boolean> = {};

        tickers.forEach((t) => {
            next[t] = anyUnmuted;
        });
        setTickerMutes(next);
        localStorage.setItem('dashboard_ticker_mutes', JSON.stringify(next));
    };

    const handleSaveSettings = (

        newTickers: string[],
        newRate: number,
        newTimezone: string
    ) => {
        setTickers(newTickers);
        setRefreshRate(newRate);
        setTimezone(newTimezone);
        localStorage.setItem('dashboard_tickers', JSON.stringify(newTickers));
        localStorage.setItem('dashboard_refreshRate', newRate.toString());
        localStorage.setItem('dashboard_timezone', newTimezone);
        setIsSettingsOpen(false);
    };

    const handleResetStorage = () => {
        localStorage.removeItem('dashboard_tickers');
        localStorage.removeItem('dashboard_refreshRate');
        localStorage.removeItem('dashboard_timezone');

        const targetKeys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.startsWith('dashboard_target_')) {
                targetKeys.push(key);
            }
        }
        targetKeys.forEach((key) => localStorage.removeItem(key));

        setTickers(getDefaultTickers());
        setRefreshRate(10);
        setTimezone('Local');
        setResetKey((prev) => prev + 1);
    };

    const handleRemoveTicker = (symbol: string) => {
        const newTickers = tickers.filter((t) => t !== symbol);

        setTickers(newTickers);
        localStorage.setItem('dashboard_tickers', JSON.stringify(newTickers));
    };

    const renderTeslaMode = () =>
        <div className="tesla-mode-container">
            <svg width="0" height="0" className="hidden-svg-defs">
                {[1, 2, 3, 4, 5, 6, 7, 8,].map((i) => {
                    const patterns = [
                        '0.01;0.02;0.015;0.025;0.01',
                        '0.03;0.015;0.035;0.02;0.03',
                        '0.015;0.035;0.01;0.03;0.015',
                        '0.02;0.01;0.04;0.015;0.02',
                        '0.01;0.03;0.02;0.04;0.01',
                        '0.035;0.015;0.03;0.01;0.035',
                        '0.015;0.04;0.015;0.03;0.015',
                        '0.03;0.01;0.02;0.04;0.03',
                    ];
                    const seedMultiplier = 42;
                    const baseDuration = 7.5;
                    const durationMultiplier = 2.5;
                    const baseScale = 12;
                    const scaleMultiplier = 1.5;

                    return (
                        <filter
                            id={`lightning-wobble-${i}`}
                            key={i}
                            x="-10%"
                            y="-50%"
                            width="120%"
                            height="200%"
                            colorInterpolationFilters="sRGB"
                        >
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.02"
                                numOctaves="2"
                                seed={i * seedMultiplier}
                                result="noise"
                            >
                                <animate
                                    attributeName="baseFrequency"
                                    values={patterns[i - 1]}
                                    dur={`${baseDuration + i * durationMultiplier}s`}
                                    repeatCount="indefinite"
                                />
                            </feTurbulence>
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="noise"
                                scale={baseScale + i * scaleMultiplier}
                                xChannelSelector="R"
                                yChannelSelector="G"
                            />
                        </filter>
                    );
                })}
            </svg>
            <div className="tesla-sphere">
                <div className="tesla-core"></div>
                <div className="plasma-ray ray-1"></div>
                <div className="plasma-ray ray-2"></div>
                <div className="plasma-ray ray-3"></div>
                <div className="plasma-ray ray-4"></div>
                <div className="plasma-ray ray-5"></div>
                <div className="plasma-ray ray-6"></div>
                <div className="plasma-ray ray-7"></div>
                <div className="plasma-ray ray-8"></div>
            </div>
        </div>;

    const renderTimezoneHint = () => {
        const resolvedTz =
            timezone === 'Local' ?
                new Intl.DateTimeFormat().resolvedOptions().timeZone :
                timezone;
        let off = new Intl.DateTimeFormat('en-US', {
            timeZone: resolvedTz,
            timeZoneName: 'shortOffset',
        })
            .formatToParts(new Date())
            .find((p) => p.type === 'timeZoneName')
            ?.value.replace('GMT', 'UTC') || 'UTC+0';

        if (off === 'UTC') { off = 'UTC+0'; }
        return `${resolvedTz} (${off})`;
    };

    const renderDashboard = () => {
        if (hasError && quotes.length === 0) {
            return (
                <div className="loader-container">
                    <div className="error-message">Unable to load market data</div>
                    <button
                        className="btn-primary btn-centered"
                        onClick={handleResetStorage}
                        title="Reset all storage"
                        aria-label="Reset all storage"
                    >
                        Reset all storage
                    </button>
                </div>
            );
        }

        if (isLoading && quotes.length === 0) {
            return (
                <div className="loader-container">
                    <div className="loader"></div>
                    <div>Loading market data...</div>
                </div>
            );
        }

        return (
            <div className="dashboard-grid">
                {quotes.map((quote) =>
                    <StockCard
                        key={`${quote.symbol}-${resetKey}`}
                        symbol={quote.symbol}
                        name={quote.shortName || quote.longName}
                        price={quote.regularMarketPrice}
                        change={quote.regularMarketChange}
                        changePercent={quote.regularMarketChangePercent}
                        chart={quote.chart}
                        onRemove={() => handleRemoveTicker(quote.symbol)}
                        timezone={timezone}
                        isMuted={tickerMutes[quote.symbol] || false}
                        onMuteToggle={() => handleMuteToggle(quote.symbol)}
                        onTargetUpdate={(isNew) => handleTargetUpdate(quote.symbol, isNew)}
                    />
                )}

                {quotes.length === 0 && !isLoading &&
                    <div className="empty-state">
                        <h3>No Tickers</h3>
                        <p>Add some stock symbols in the settings to get started.</p>
                        <button
                            className="btn-primary btn-centered"
                            onClick={() => setIsSettingsOpen(true)}
                            title="Open settings"
                            aria-label="Open settings"
                        >
                            Open Settings
                        </button>

                    </div>
                }
            </div>
        );
    };

    return (
        <>
            <header className="app-header">
                <h1 className="app-title" onClick={() => setIsTeslaMode(!isTeslaMode)}>
                    <img
                        src="./logo.png"
                        alt="Black Orb logo"
                        className={`app-logo ${isTeslaMode ? 'logo-tesla-glow' : ''}`}
                    />
                </h1>
                <div className="header-actions">
                    <button
                        className="icon-btn"
                        onClick={handleGlobalMuteToggle}
                        title={tickers.every((t) => tickerMutes[t]) ? 'Unmute all' : 'Mute all'}
                        aria-label={tickers.every((t) => tickerMutes[t]) ? 'Unmute all' : 'Mute all'}
                    >
                        {(() => {
                            if (tickers.every((t) => tickerMutes[t])) {
                                return <BellAlertIcon className="header-icon" />;
                            }
                            const hasActiveTargets = tickers.some(
                                (t) => !tickerMutes[t] && localStorage.getItem(`dashboard_target_${t}`)
                            );

                            if (hasActiveTargets) {
                                return <BellSlashIcon className="header-icon" />;
                            }
                            return <BellIcon className="header-icon" />;
                        })()}

                    </button>

                    <button
                        className="icon-btn"
                        onClick={() => setIsSettingsOpen(true)}
                        title="Open settings"
                        aria-label="Open settings"
                    >
                        <Cog6ToothIcon className="header-icon" />
                    </button>

                </div>
            </header>

            <main>{isTeslaMode ? renderTeslaMode() : renderDashboard()}</main>

            {!isTeslaMode && lastUpdated && quotes.length > 0 &&
                <div className="last-updated">
                    Last updated: {lastUpdated.toLocaleTimeString(undefined, {
                        timeZone: timezone === 'Local' ? undefined : timezone,
                    })}{' '}
                    (Updates every {refreshRate}s) | {renderTimezoneHint()}
                </div>
            }

            {isSettingsOpen &&
                <SettingsModal
                    key={`settings-${tickers.join(',')}-${refreshRate}`}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    tickers={tickers}
                    refreshRate={refreshRate}
                    timezone={timezone}
                    onSave={handleSaveSettings}
                    onReset={handleResetStorage}
                />
            }
        </>
    );
}

export default App;
