import * as React from 'react';
import { useState } from 'react';
import {
    ArrowUpIcon, ArrowDownIcon, TrashIcon, BellIcon, CheckIcon, BellAlertIcon, BellSlashIcon,
    CalculatorIcon, ArrowLeftIcon, ArrowRightIcon
} from '@heroicons/react/24/outline';


import type { ChartDataPoint, HistoricalCharts } from '../types';

interface StockCardProps {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
    chart?: ChartDataPoint[];
    onRemove: () => void;
    timezone?: string;
    isMuted: boolean;
    onMuteToggle: () => void;
    onTargetUpdate?: (isNew: boolean) => void;
    error?: string | null;
}


const DEFAULT_SPARKLINE_WIDTH = 80;
const DEFAULT_SPARKLINE_HEIGHT = 30;
const VIEWBOX_X_AXES = -25;
const VIEWBOX_X_NO_AXES = -2;
const PERCENT_MULTIPLIER = 100;
const VIEWBOX_Y_AXES = -5;
const VIEWBOX_Y_NO_AXES = -2;
const VIEWBOX_W_EXTRA_AXES = 30;
const VIEWBOX_W_EXTRA_NO_AXES = 4;
const VIEWBOX_H_EXTRA_AXES = 15;
const VIEWBOX_H_EXTRA_NO_AXES = 4;
const BLUR_TIMEOUT_MS = 150;
const DEFAULT_MAX_CHART_POINTS = 52;

/**
 * Evenly downsample data to maxPoints, always keeping first and last
 */
function downsampleData (data: ChartDataPoint[], maxPoints: number): ChartDataPoint[] {
    if (data.length <= maxPoints) { return data; }
    const result: ChartDataPoint[] = [data[0],];
    const step = (data.length - 1) / (maxPoints - 1);

    for (let i = 1; i < maxPoints - 1; i++) {
        result.push(data[Math.round(i * step)]);
    }
    result.push(data[data.length - 1]);

    return result;
}

function Sparkline ({
    data: rawData,
    color,
    showAxes = false,
    width = DEFAULT_SPARKLINE_WIDTH,
    height = DEFAULT_SPARKLINE_HEIGHT,
    targetPrice,
    timezone,
    maxPoints,
}: {
    data: ChartDataPoint[];
    color: string;
    showAxes?: boolean;
    width?: number;
    height?: number;
    targetPrice?: number | null;
    timezone?: string;
    maxPoints?: number;
}) {
    const data = maxPoints ? downsampleData(rawData, maxPoints) : rawData;

    if (!data || data.length < 2) { return null; }
    const closes = data.map((d) => d.close);
    let min = Math.min(...closes);
    let max = Math.max(...closes);

    const hasTarget = targetPrice !== undefined && targetPrice !== null;

    if (hasTarget) {
        min = Math.min(min, targetPrice);
        max = Math.max(max, targetPrice);
    }

    const range = max - min || 1;

    let viewBoxX = VIEWBOX_X_NO_AXES;
    let viewBoxY = VIEWBOX_Y_NO_AXES;
    let viewBoxW = width + VIEWBOX_W_EXTRA_NO_AXES;
    let viewBoxH = height + VIEWBOX_H_EXTRA_NO_AXES;

    if (showAxes) {
        viewBoxX = VIEWBOX_X_AXES;
        viewBoxY = VIEWBOX_Y_AXES;
        viewBoxW = width + VIEWBOX_W_EXTRA_AXES;
        viewBoxH = height + VIEWBOX_H_EXTRA_AXES;
    }

    const points = data.map((val, i) => {
        const x = i / (data.length - 1) * width;
        const y = height - (val.close - min) / range * height;

        return { x, y, val, };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    const targetY = hasTarget ? height - (targetPrice - min) / range * height : null;

    const isRemoteTimezone = timezone && timezone !== 'Local';
    const tzOptions = isRemoteTimezone ? { timeZone: timezone, } : undefined;

    const formatDate = (ds: string) => {
        const d = new Date(ds);
        const options: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
            ...tzOptions,
        };

        return d.toLocaleDateString(undefined, options);
    };

    return (
        <svg
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            className="sparkline-svg"
        >
            {showAxes &&
                <>
                    <polyline
                        points={`0,0 0,${height} ${width},${height}`}
                        className="sparkline-axes-line"
                    />
                    <text x="-4" y="4" className="sparkline-axis-label sparkline-axis-label-end">
                        ${max.toFixed(2)}
                    </text>
                    <text x="-4" y={height} className="sparkline-axis-label sparkline-axis-label-end">
                        ${min.toFixed(2)}
                    </text>
                    <text x="0" y={height + 10} className="sparkline-axis-label sparkline-axis-label-start">
                        {formatDate(data[0].date)}
                    </text>
                    <text x={width} y={height + 10} className="sparkline-axis-label sparkline-axis-label-end">
                        {formatDate(data[data.length - 1].date)}
                    </text>
                </>
            }
            <polyline
                points={polylinePoints}
                stroke={color}
                className="sparkline-path"
            />
            {points.map((p, i) =>
                <circle
                    key={`dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="2.5"
                    fill={color}
                    className="sparkline-dot"
                />
            )}
            {points.map((p, i) =>
                <circle
                    key={`hit-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    className="sparkline-hit-area"
                >
                    <title>{`Price: $${p.val.close.toFixed(2)}\nDate: ${new Date(
                        p.val.date
                    ).toLocaleString(undefined, { ...tzOptions, hour12: false, })}`}</title>
                </circle>
            )}
            {targetY !== null &&
                <>
                    <line
                        x1="0"
                        y1={targetY}
                        x2={width}
                        y2={targetY}
                        className="sparkline-target-line"
                    />
                    {showAxes && hasTarget &&
                        <text
                            x="-4"
                            y={targetY + 3}
                            className="sparkline-target-label"
                        >
                            ${targetPrice?.toFixed(2)}
                        </text>
                    }
                </>
            }
        </svg>
    );
}

const INVESTMENT_BLUR_MS = 200;

function InvestmentSection ({
    investmentSum,
    isEditingInvestment,
    setIsEditingInvestment,
    setInvestmentSum,
    targetPrice,
    symbol,
}: {
    investmentSum: number | null;
    isEditingInvestment: boolean;
    setIsEditingInvestment: (v: boolean) => void;
    setInvestmentSum: (v: number | null) => void;
    targetPrice: number | null;
    symbol: string;
}) {
    if (investmentSum !== null && !isEditingInvestment) {
        const effectivePrice = targetPrice || 1;
        const shares = Math.floor(investmentSum / effectivePrice);
        const leftover = (investmentSum % effectivePrice).toFixed(2);

        return (
            <div className="investment-result">
                $
                <span
                    className="investment-sum-value"
                    onClick={() => setIsEditingInvestment(true)}
                    title="Edit investment sum"
                >
                    {investmentSum}
                </span>
                {` @ $${targetPrice?.toFixed(2)} = ${shares}`}
                {` share(s) and $${leftover} left`}
            </div>
        );
    }

    if (isEditingInvestment) {
        return (
            <form
                className="investment-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const val = formData.get('investment') as string;
                    const num = val ? Number(val) : null;

                    setInvestmentSum(num);
                    if (num === null) {
                        localStorage.removeItem(
                            `dashboard_investment_${symbol}`
                        );
                    } else {
                        localStorage.setItem(
                            `dashboard_investment_${symbol}`,
                            num.toString()
                        );
                    }
                    setIsEditingInvestment(false);
                }}
            >
                <input
                    type="number"
                    name="investment"
                    className="investment-input"
                    placeholder="Investment sum"
                    defaultValue={investmentSum ?? ''}
                    autoFocus
                    onBlur={() => {
                        setTimeout(() => {
                            const active =
                                document.activeElement as HTMLElement;

                            if (
                                !active ||
                                !active.closest('.investment-container')
                            ) {
                                setIsEditingInvestment(false);
                            }
                        }, INVESTMENT_BLUR_MS);
                    }}
                />
                <button
                    type="submit"
                    className="icon-btn-small"
                    title="Save investment sum"
                >
                    <CheckIcon className="icon-inline" />
                </button>
                <button
                    type="button"
                    className="icon-btn-small btn-remove"
                    title="Remove investment sum"
                    onClick={() => {
                        setInvestmentSum(null);
                        localStorage.removeItem(
                            `dashboard_investment_${symbol}`
                        );
                        setIsEditingInvestment(false);
                    }}
                >
                    <TrashIcon className="icon-inline" />
                </button>
            </form>
        );
    }

    return null;
}

interface TargetPriceSectionProps {
    isEditingTarget: boolean;
    setIsEditingTarget: (v: boolean) => void;
    onTargetChange: (v: string) => void;
    targetPrice: number | null;
    isTargetReached: boolean;
}

function TargetPriceSection (props: TargetPriceSectionProps) {
    const {
        isEditingTarget, setIsEditingTarget, onTargetChange,
        targetPrice, isTargetReached,
    } = props;

    if (isEditingTarget) {
        return (
            <form
                className="target-price-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const val = formData.get('target') as string;

                    setIsEditingTarget(false);
                    onTargetChange(val);
                }}
            >
                <input
                    type="number"
                    name="target"
                    step="any"
                    className="target-input"
                    placeholder="Target price"
                    defaultValue={targetPrice ?? ''}
                    onBlur={(e) => {
                        setTimeout(() => {
                            const active = document.activeElement as HTMLElement;

                            if (!active || !active.closest('.target-price-container')) {
                                setIsEditingTarget(false);
                                if (e.target.value) {
                                    onTargetChange(e.target.value);
                                }
                            }
                        }, BLUR_TIMEOUT_MS);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setIsEditingTarget(false);
                        }
                    }}
                    autoFocus
                />
                <button
                    type="submit"
                    className="icon-btn-small"
                    title="Save target price"
                    aria-label="Save target price"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <CheckIcon className="icon-inline" />
                </button>
                <button
                    type="button"
                    className="icon-btn-small btn-remove"
                    title="Remove target price"
                    aria-label="Remove target price"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        setIsEditingTarget(false);
                        onTargetChange('');
                    }}
                >
                    <TrashIcon className="icon-inline" />
                </button>
            </form>
        );
    }

    return (
        <div className="target-price-display">
            {targetPrice !== null &&
                <span className={`target-price-text ${isTargetReached ? 'target-reached metallic-gold' : ''
                }`}>
                    $
                    <span
                        className={`target-price-value ${isTargetReached ? 'metallic-gold' : ''}`}
                        onClick={() => setIsEditingTarget(true)}
                        title="Edit target price"
                    >
                        {targetPrice?.toFixed(2)}
                    </span>
                </span>
            }
        </div>
    );
}

function CardFront (props: StockCardProps & {
    targetPrice: number | null;
    isEditingTarget: boolean;
    setIsEditingTarget: (v: boolean) => void;
    onTargetChange: (v: string) => void;
    isMuted: boolean;
    onMuteToggle: () => void;
    isTargetReached: boolean;
    investmentSum: number | null;
    setInvestmentSum: (v: number | null) => void;
    isEditingInvestment: boolean;
    setIsEditingInvestment: (v: boolean) => void;
    onFlip: () => void;
    error?: string | null;
}) {

    const {
        symbol, price, change, changePercent, name, chart, onRemove,
        targetPrice, isEditingTarget, setIsEditingTarget, onTargetChange,
        isMuted, onMuteToggle, isTargetReached,
        investmentSum, setInvestmentSum, isEditingInvestment, setIsEditingInvestment,
        onFlip, error,
    } = props;

    const isPositive = change >= 0;


    const CHART_WIDTH = 240;
    const CHART_HEIGHT = 75;

    const bellActionLabel = isMuted ? 'Unmute' : 'Mute';
    const bellTitle = targetPrice === null ? 'Set target price' : bellActionLabel;

    const handleBellClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (targetPrice === null) {
            setIsEditingTarget(true);
        } else {
            onMuteToggle();
        }
    };


    return (
        <div className="card-front" onClick={onFlip}>
            <div className="stock-header" onClick={(e) => e.stopPropagation()}>
                <div className="stock-symbol metallic-gold">{symbol}</div>
                <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ?
                        <ArrowUpIcon className="stock-change-arrow" /> :
                        <ArrowDownIcon className="stock-change-arrow" />
                    }
                    <span>
                        {(typeof change === 'number' ? Math.abs(change) : 0).toFixed(2)} (
                        {(typeof changePercent === 'number' ? Math.abs(changePercent) : 0).toFixed(2)}%)
                    </span>
                </div>

                {name ?
                    <div className="stock-name" title={name}>
                        {name}
                    </div> :
                    <div />}
                <div className="stock-header-actions">
                    {!isEditingTarget &&
                        <button
                            className={`icon-btn-small ${targetPrice === null ? 'icon-grey' : ''}`}
                            onClick={handleBellClick}
                            title={bellTitle}
                            aria-label={bellTitle}
                        >
                            {(() => {
                                if (targetPrice === null) {
                                    return <BellIcon className="icon-inline" />;
                                }
                                return isMuted ?
                                    <BellAlertIcon className="icon-inline" /> :
                                    <BellSlashIcon className="icon-inline" />;
                            })()}
                        </button>
                    }
                    {investmentSum === null &&
                        <button
                            className="icon-btn-small icon-grey"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingInvestment(true);
                            }}
                            title="Calculate number of shares"
                        >
                            <CalculatorIcon className="icon-inline" />
                        </button>
                    }
                </div>
            </div>
            <div className="stock-price stock-price-decorated" onClick={(e) => e.stopPropagation()}>
                <div className="price-row">
                    <div className="current-price-container">
                        {typeof price === 'number' ?
                            <span className="metallic-gold">{`$${price.toFixed(2)}`}</span> :
                            <div className="na-container">
                                <span className="metallic-gold">N/A</span>
                                <button
                                    className="btn-remove icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove();
                                    }}
                                    title="Remove ticker"
                                    aria-label="Remove ticker"
                                >
                                    <TrashIcon className="icon-inline" />
                                </button>
                            </div>
                        }
                    </div>

                    <div className="target-price-container" onClick={(e) => e.stopPropagation()}>
                        <TargetPriceSection
                            isEditingTarget={isEditingTarget}
                            setIsEditingTarget={setIsEditingTarget}
                            onTargetChange={onTargetChange}
                            targetPrice={targetPrice}
                            isTargetReached={isTargetReached}
                        />
                    </div>
                </div>

                <div className="investment-container">
                    <InvestmentSection
                        investmentSum={investmentSum}
                        isEditingInvestment={isEditingInvestment}
                        setIsEditingInvestment={setIsEditingInvestment}
                        setInvestmentSum={setInvestmentSum}
                        targetPrice={targetPrice}
                        symbol={symbol}
                    />
                </div>
            </div>
            {chart && chart.length > 0 &&
                <div className="sparkline-container sparkline-container-front" onClick={(e) => e.stopPropagation()}>
                    <Sparkline
                        data={chart}
                        color={isPositive ? 'var(--success)' : 'var(--danger)'}
                        showAxes={true}
                        width={CHART_WIDTH}
                        height={CHART_HEIGHT}
                        targetPrice={targetPrice}
                        timezone={props.timezone}
                    />
                </div>
            }
            {error && <div className="card-front-error">{error}</div>}
        </div>
    );
}

interface CardBackProps {
    symbol: string;
    isLoading: boolean;
    showLongTerm: boolean;
    history30d: ChartDataPoint[] | null;
    history1y: ChartDataPoint[] | null;
    history3y: ChartDataPoint[] | null;
    historyAll: ChartDataPoint[] | null;
    onToggleHistory: (long: boolean) => void;
    targetPrice: number | null;
    timezone?: string;
    error: string | null;
}

function HistoricalChange ({ data, }: { data: ChartDataPoint[] | null }) {
    if (!data || data.length < 2) { return null; }
    const first = data[0].close;
    const last = data[data.length - 1].close;
    const change = ((last - first) / first) * PERCENT_MULTIPLIER;
    const isPositive = change >= 0;

    return (
        <div className={`back-chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <ArrowUpIcon className="change-icon" /> : <ArrowDownIcon className="change-icon" />}
            {Math.abs(change).toFixed(2)}%
        </div>
    );
}

function CardBack (props: CardBackProps & { onFlip: () => void }) {
    const {
        symbol, isLoading, showLongTerm, history30d, history1y, history3y,
        historyAll, onToggleHistory, targetPrice, timezone,
        onFlip, error,
    } = props;

    const dataTop = showLongTerm ? history3y : history30d;
    const dataBottom = showLongTerm ? historyAll : history1y;

    const labelTop = showLongTerm ? '3 years' : '30 days';
    const labelBottom = showLongTerm ? 'All history' : '1 year';

    const colorTop = showLongTerm ? 'var(--graph-blue)' : 'var(--gold-deep-medium)';
    const colorBottom = showLongTerm ? 'var(--text-muted)' : 'var(--graph-brown)';

    const CHART_WIDTH = 240;
    const CHART_HEIGHT_BACK = 60;

    return (
        <div className="card-back" onClick={onFlip}>
            {isLoading ?
                <div className="loader"></div> :
                <>
                    <div className="card-back-header" onClick={(e) => e.stopPropagation()}>
                        <div className="card-back-subtitle">
                            {symbol} • {labelTop} / {labelBottom}
                        </div>
                        <div className="card-back-actions">
                            {showLongTerm ?
                                <button
                                    className="icon-btn-small"
                                    onClick={() => onToggleHistory(false)}
                                    title="Show 30 days / 1 year"
                                    aria-label="Show 30 days / 1 year"
                                >
                                    <ArrowLeftIcon className="icon-inline" />
                                </button> :
                                <button
                                    className="icon-btn-small"
                                    onClick={() => onToggleHistory(true)}
                                    title="Show 3 years / All history"
                                    aria-label="Show 3 years / All history"
                                >
                                    <ArrowRightIcon className="icon-inline" />
                                </button>
                            }
                        </div>
                    </div>

                    <div className="sparkline-container sparkline-container-back" onClick={(e) => e.stopPropagation()}>
                        <div className="back-chart-item">
                            <div className="back-chart-header">
                                <div className="back-chart-label">{labelTop}</div>
                                <HistoricalChange data={dataTop} />
                            </div>
                            {dataTop && dataTop.length > 0 ?
                                <Sparkline
                                    data={dataTop}
                                    color={colorTop}
                                    showAxes={true}
                                    width={CHART_WIDTH}
                                    height={CHART_HEIGHT_BACK}
                                    targetPrice={targetPrice}
                                    timezone={timezone}
                                    maxPoints={DEFAULT_MAX_CHART_POINTS}
                                /> :
                                <span className="card-back-empty">No {labelTop} data</span>
                            }
                        </div>
                        <div className="back-chart-item">
                            <div className="back-chart-header">
                                <div className="back-chart-label">{labelBottom}</div>
                                <HistoricalChange data={dataBottom} />
                            </div>
                            {dataBottom && dataBottom.length > 0 ?
                                <Sparkline
                                    data={dataBottom}
                                    color={colorBottom}
                                    showAxes={true}
                                    width={CHART_WIDTH}
                                    height={CHART_HEIGHT_BACK}
                                    targetPrice={targetPrice}
                                    timezone={timezone}
                                    maxPoints={DEFAULT_MAX_CHART_POINTS}
                                /> :
                                <span className="card-back-empty">No {labelBottom} data</span>
                            }
                        </div>
                    </div>
                    {error && <div className="card-back-error">{error}</div>}
                </>
            }
        </div>
    );
}

export function StockCard (props: StockCardProps) {
    const { symbol, } = props;
    const [isFlipped, setIsFlipped,] = useState(false);
    const [history30d, setHistory30d,] = useState<ChartDataPoint[] | null>(null);
    const [history1y, setHistory1y,] = useState<ChartDataPoint[] | null>(null);
    const [history3y, setHistory3y,] = useState<ChartDataPoint[] | null>(null);
    const [historyAll, setHistoryAll,] = useState<ChartDataPoint[] | null>(null);
    const [isLoadingHistory, setIsLoadingHistory,] = useState(false);
    const [showLongTerm, setShowLongTerm,] = useState(false);
    const [historyError, setHistoryError,] = useState<string | null>(null);
    const [isEditingTarget, setIsEditingTarget,] = useState(false);
    const [targetPrice, setTargetPrice,] = useState<number | null>(() => {
        const saved = localStorage.getItem(`dashboard_target_${symbol}`);

        return saved ? Number(saved) : null;
    });
    const [investmentSum, setInvestmentSum,] = useState<number | null>(() => {
        const saved = localStorage.getItem(`dashboard_investment_${symbol}`);

        return saved ? Number(saved) : null;
    });
    const [isEditingInvestment, setIsEditingInvestment,] = useState(false);

    const handleTargetChange = (val: string) => {
        if (val === '') {
            setTargetPrice(null);
            localStorage.removeItem(`dashboard_target_${symbol}`);
            if (props.onTargetUpdate) { props.onTargetUpdate(false); }
        } else {
            const num = Number(val);
            const isNew = targetPrice === null;

            setTargetPrice(num);
            localStorage.setItem(`dashboard_target_${symbol}`, num.toString());
            if (props.onTargetUpdate) { props.onTargetUpdate(isNew); }
        }
        setIsEditingTarget(false);
    };


    const handleFlip = async () => {
        setIsFlipped(!isFlipped);

        if (isFlipped || isLoadingHistory || history30d !== null) {
            return;
        }

        setIsLoadingHistory(true);
        setHistoryError(null);

        // Load from cache for immediate display
        const cached = localStorage.getItem(`dashboard_history_${symbol}`);
        let hasCachedData = false;

        if (cached) {
            try {
                const data = JSON.parse(cached);

                if (data && data.chart30d) {
                    setHistory30d(data.chart30d);
                    setHistory1y(data.chart1y);
                    setHistory3y(data.chart3y);
                    setHistoryAll(data.chartAll);
                    hasCachedData = true;
                }
            } catch (e) {
                console.error('Failed to parse cached history', e);
            }
        }

        try {
            type IpcInvoke = (channel: string, ...args: unknown[]) => Promise<HistoricalCharts>;
            const winWithIpc = window as unknown as { ipcRenderer: { invoke: IpcInvoke } };
            const ipcRenderer = winWithIpc.ipcRenderer;

            if (!ipcRenderer || !ipcRenderer.invoke) {
                return;
            }

            const data = await ipcRenderer.invoke('get-historical-charts', symbol);

            if (data && data.chart30d && data.chart30d.length > 0) {
                setHistory30d(data.chart30d);
                setHistory1y(data.chart1y);
                setHistory3y(data.chart3y);
                setHistoryAll(data.chartAll);
                localStorage.setItem(`dashboard_history_${symbol}`, JSON.stringify(data));
            } else {
                throw new Error('Empty data');
            }
        } catch (error) {
            console.error('Failed to fetch historical charts', error);
            const nowHasData = history30d !== null || hasCachedData;

            if (nowHasData) {
                setHistoryError('Unable to load market data, using last available');
            } else {
                setHistoryError('Unable to load market data and localStorage data');
            }
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const onToggleHistory = (long: boolean) => {
        setShowLongTerm(long);
    };

    const isTargetReached = targetPrice !== null && props.chart && props.chart.length > 0 && (() => {
        const prices = props.chart.map((p) => p.close);
        const allPrices = [...prices, props.price,];
        const dayMin = Math.min(...allPrices);
        const dayMax = Math.max(...allPrices);

        return targetPrice >= dayMin && targetPrice <= dayMax;
    })();

    return (
        <div
            className={`stock-card ${isFlipped ? 'is-flipped' : ''}`}
        >
            <div className="card-inner">
                <CardFront
                    {...props}
                    targetPrice={targetPrice}
                    isEditingTarget={isEditingTarget}
                    setIsEditingTarget={setIsEditingTarget}
                    onTargetChange={handleTargetChange}
                    isTargetReached={!!isTargetReached}
                    investmentSum={investmentSum}
                    setInvestmentSum={setInvestmentSum}
                    isEditingInvestment={isEditingInvestment}
                    setIsEditingInvestment={setIsEditingInvestment}
                    onFlip={() => {
                        handleFlip().catch((err) => {
                            console.error('Flip failed', err);
                        });
                    }}
                />
                <CardBack
                    symbol={symbol}
                    isLoading={isLoadingHistory}
                    showLongTerm={showLongTerm}
                    history30d={history30d}
                    history1y={history1y}
                    history3y={history3y}
                    historyAll={historyAll}
                    onToggleHistory={onToggleHistory}
                    targetPrice={targetPrice}
                    timezone={props.timezone}
                    error={historyError}
                    onFlip={() => {
                        handleFlip().catch((err) => {
                            console.error('Flip failed', err);
                        });
                    }}
                />
            </div>
        </div>
    );
}
