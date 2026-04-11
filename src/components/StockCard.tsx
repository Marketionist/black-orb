import * as React from 'react';
import { useState } from 'react';
import {
    ArrowUpIcon, ArrowDownIcon, TrashIcon, BellIcon, CheckIcon, BellAlertIcon, BellSlashIcon
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
}


const DEFAULT_SPARKLINE_WIDTH = 80;
const DEFAULT_SPARKLINE_HEIGHT = 30;
const VIEWBOX_X_AXES = -25;
const VIEWBOX_X_NO_AXES = -2;
const VIEWBOX_Y_AXES = -5;
const VIEWBOX_Y_NO_AXES = -2;
const VIEWBOX_W_EXTRA_AXES = 30;
const VIEWBOX_W_EXTRA_NO_AXES = 4;
const VIEWBOX_H_EXTRA_AXES = 15;
const VIEWBOX_H_EXTRA_NO_AXES = 4;
const BLUR_TIMEOUT_MS = 150;

function Sparkline ({
    data,
    color,
    showAxes = false,
    width = DEFAULT_SPARKLINE_WIDTH,
    height = DEFAULT_SPARKLINE_HEIGHT,
    targetPrice,
    timezone,
}: {
    data: ChartDataPoint[];
    color: string;
    showAxes?: boolean;
    width?: number;
    height?: number;
    targetPrice?: number | null;
    timezone?: string;
}) {
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
            ...tzOptions,
        };

        return d.toLocaleDateString(undefined, options);
    };

    return (
        <svg
            width="100%"
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            className="sparkline-svg"
        >
            {showAxes &&
                <>
                    <polyline
                        points={`0,0 0,${height} ${width},${height}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                    />
                    <text x="-4" y="4" fill="var(--text-muted)" fontSize="8" textAnchor="end">
                        ${max.toFixed(2)}
                    </text>
                    <text x="-4" y={height} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                        ${min.toFixed(2)}
                    </text>
                    <text x="0" y={height + 10} fill="var(--text-muted)" fontSize="8" textAnchor="start">
                        {formatDate(data[0].date)}
                    </text>
                    <text x={width} y={height + 10} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                        {formatDate(data[data.length - 1].date)}
                    </text>
                </>
            }
            <polyline
                points={polylinePoints}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="sparkline-path"
            />
            {points.map((p, i) =>
                <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="1.5" fill={color} />
            )}
            {points.map((p, i) =>
                <circle
                    key={`hit-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill="transparent"
                    stroke="transparent"
                    className="sparkline-hit-area"
                >
                    <title>{`Price: $${p.val.close.toFixed(2)}\nDate: ${new Date(
                        p.val.date
                    ).toLocaleString(undefined, tzOptions)}`}</title>
                </circle>
            )}
            {targetY !== null &&
                <>
                    <line
                        x1="0"
                        y1={targetY}
                        x2={width}
                        y2={targetY}
                        stroke="var(--gold-deep-medium, #b8860b)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                    {showAxes && hasTarget &&
                        <text
                            x="-4"
                            y={targetY + 3}
                            fill="var(--gold-deep-medium, #b8860b)"
                            fontSize="8"
                            textAnchor="end"
                        >
                            ${targetPrice?.toFixed(2)}
                        </text>
                    }
                </>
            }
        </svg>
    );
}

function CardFront (props: StockCardProps & {
    targetPrice: number | null;
    isEditingTarget: boolean;
    setIsEditingTarget: (v: boolean) => void;
    onTargetChange: (v: string) => void;
    isMuted: boolean;
    onMuteToggle: () => void;
}) {

    const {
        symbol, price, change, changePercent, name, chart, onRemove,
        targetPrice, isEditingTarget, setIsEditingTarget, onTargetChange,
        isMuted, onMuteToggle,
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
        <div className="card-front">
            <div className="stock-header">
                <div className="stock-symbol metallic-gold">{symbol}</div>
                <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ?
                        <ArrowUpIcon className="w-4 h-4 inline" /> :
                        <ArrowDownIcon className="w-4 h-4 inline" />
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

                <div className="target-price-container" onClick={(e) => e.stopPropagation()}>
                    {isEditingTarget ?
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
                                className="icon-btn target-action-btn"
                                title="Save target price"
                                aria-label="Save target price"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                <CheckIcon />
                            </button>
                            <button
                                type="button"
                                className="btn-remove icon-btn target-action-btn"
                                title="Remove target price"
                                aria-label="Remove target price"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    setIsEditingTarget(false);
                                    onTargetChange('');
                                }}
                            >
                                <TrashIcon />
                            </button>
                        </form> :
                        <div className="target-price-display">
                            {targetPrice !== null &&
                                <span
                                    className="target-price-text"
                                    onClick={() => setIsEditingTarget(true)}
                                    title="Edit target price"
                                >
                                    $
                                    <span className="target-price-value">
                                        {targetPrice?.toFixed(2)}
                                    </span>
                                </span>
                            }
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


                        </div>
                    }
                </div>
            </div>
            <div className="stock-price stock-price-decorated">
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
                            <TrashIcon />
                        </button>
                    </div>
                }
            </div>
            {chart && chart.length > 0 &&
                <div className="sparkline-container sparkline-container-front">
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
        </div>
    );
}

interface CardBackProps {
    symbol: string;
    isLoading: boolean;
    show1Year: boolean;
    history30d: ChartDataPoint[] | null;
    history1y: ChartDataPoint[] | null;
    onToggleHistory: (e: React.MouseEvent) => void;
    targetPrice: number | null;
    timezone?: string;
}

function CardBack (props: CardBackProps) {
    const { symbol, isLoading, show1Year, history30d, history1y, onToggleHistory, targetPrice, timezone, } = props;

    const historicalData = show1Year ? history1y : history30d;
    let historicalChange = 0;
    let absoluteChange = 0;

    const PERC_MULTIPLIER = 100;
    const MIN_DATA_POINTS = 2;

    if (historicalData && historicalData.length >= MIN_DATA_POINTS) {
        const start = historicalData[0].close;
        const end = historicalData[historicalData.length - 1].close;

        historicalChange = (end - start) / start * PERC_MULTIPLIER;
        absoluteChange = end - start;
    }

    const isHistoricalPositive = historicalChange >= 0;
    const CHART_WIDTH = 240;
    const CHART_HEIGHT_BACK = 80;
    const ICON_SIZE_BACK = 14;

    return (
        <div className="card-back">
            {isLoading ?
                <div className="loader"></div> :
                <>
                    <div className="card-back-header">
                        <div className="card-back-subtitle">
                            {symbol} • {show1Year ? '1 Year' : '30 Days'}
                        </div>
                    </div>

                    <div className="sparkline-container sparkline-container-back">
                        {historicalData && historicalData.length > 0 ?
                            <Sparkline
                                data={historicalData}
                                color={show1Year ? 'var(--text-muted)' : 'var(--accent-primary)'}
                                showAxes={true}
                                width={CHART_WIDTH}
                                height={CHART_HEIGHT_BACK}
                                targetPrice={targetPrice}
                                timezone={timezone}
                            /> :
                            <span className="card-back-empty">No historical data</span>
                        }
                    </div>

                    <div className="card-back-toggle" onClick={onToggleHistory}>
                        {show1Year ? 'Show 30 Days' : 'Show 1 Year'}
                    </div>

                    {historicalData && historicalData.length >= MIN_DATA_POINTS &&
                        <div
                            className={`stock-change ${isHistoricalPositive ? 'positive' : 'negative'} card-back-perf`}
                        >
                            {isHistoricalPositive ?
                                <ArrowUpIcon style={{ width: ICON_SIZE_BACK, height: ICON_SIZE_BACK, }} /> :
                                <ArrowDownIcon style={{ width: ICON_SIZE_BACK, height: ICON_SIZE_BACK, }} />
                            }
                            <span>
                                {Math.abs(absoluteChange).toFixed(2)} ({Math.abs(historicalChange).toFixed(2)}%)
                            </span>
                        </div>
                    }
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
    const [isLoadingHistory, setIsLoadingHistory,] = useState(false);
    const [show1Year, setShow1Year,] = useState(false);
    const [isEditingTarget, setIsEditingTarget,] = useState(false);
    const [targetPrice, setTargetPrice,] = useState<number | null>(() => {
        const saved = localStorage.getItem(`dashboard_target_${symbol}`);

        return saved ? Number(saved) : null;
    });

    const handleTargetChange = (val: string) => {
        if (val === '') {
            setTargetPrice(null);
            localStorage.removeItem(`dashboard_target_${symbol}`);
        } else {
            const num = Number(val);
            const isNew = targetPrice === null;

            setTargetPrice(num);
            localStorage.setItem(`dashboard_target_${symbol}`, num.toString());
            if (props.onTargetUpdate) { props.onTargetUpdate(isNew); }
        }
    };


    const handleFlip = async () => {
        setIsFlipped(!isFlipped);

        if (!isFlipped && history30d === null && !isLoadingHistory) {
            setIsLoadingHistory(true);
            try {
                type IpcInvoke = (channel: string, ...args: unknown[]) => Promise<HistoricalCharts>;
                const winWithIpc = window as unknown as { ipcRenderer: { invoke: IpcInvoke } };
                const ipcRenderer = winWithIpc.ipcRenderer;

                if (ipcRenderer && ipcRenderer.invoke) {
                    const data = await ipcRenderer.invoke('get-historical-charts', symbol);

                    setHistory30d(data.chart30d);
                    setHistory1y(data.chart1y);
                }
            } catch (error) {
                console.error('Failed to fetch historical charts', error);
            } finally {
                setIsLoadingHistory(false);
            }
        }
    };

    const onToggleHistory = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShow1Year(!show1Year);
    };

    return (
        <div
            className={`stock-card ${isFlipped ? 'is-flipped' : ''}`}
            onClick={() => {
                handleFlip().catch((err) => {
                    console.error('Flip failed', err);
                });
            }}
        >
            <div className="card-inner">
                <CardFront
                    {...props}
                    targetPrice={targetPrice}
                    isEditingTarget={isEditingTarget}
                    setIsEditingTarget={setIsEditingTarget}
                    onTargetChange={handleTargetChange}
                />
                <CardBack
                    symbol={symbol}
                    isLoading={isLoadingHistory}
                    show1Year={show1Year}
                    history30d={history30d}
                    history1y={history1y}
                    onToggleHistory={onToggleHistory}
                    targetPrice={targetPrice}
                    timezone={props.timezone}
                />
            </div>
        </div>
    );
}
