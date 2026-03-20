import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

export interface ChartDataPoint {
    close: number;
    date: string;
}

interface StockCardProps {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
    chart?: ChartDataPoint[];
}

function Sparkline({
    data,
    color,
    showAxes = false,
    width = 80,
    height = 30,
}: {
    data: ChartDataPoint[];
    color: string;
    showAxes?: boolean;
    width?: number;
    height?: number;
}) {
    if (!data || data.length < 2) return null;
    const closes = data.map((d) => d.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const viewBoxX = showAxes ? -25 : -2;
    const viewBoxY = showAxes ? -5 : -2;
    const viewBoxW = showAxes ? width + 30 : width + 4;
    const viewBoxH = showAxes ? height + 15 : height + 4;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val.close - min) / range) * height;
        return { x, y, val };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    const formatDate = (ds: string) => {
        const d = new Date(ds);
        return d.toLocaleDateString(undefined, {
            month: "numeric",
            day: "numeric",
        });
    };

    return (
        <svg
            width="100%"
            height="auto"
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            style={{ overflow: "visible" }}
        >
            {showAxes && (
                <>
                    <polyline
                        points={`0,0 0,${height} ${width},${height}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                    />
                    <text
                        x="-4"
                        y="4"
                        fill="var(--text-muted)"
                        fontSize="8"
                        textAnchor="end"
                    >
                        ${max.toFixed(1)}
                    </text>
                    <text
                        x="-4"
                        y={height}
                        fill="var(--text-muted)"
                        fontSize="8"
                        textAnchor="end"
                    >
                        ${min.toFixed(1)}
                    </text>
                    <text
                        x="0"
                        y={height + 10}
                        fill="var(--text-muted)"
                        fontSize="8"
                        textAnchor="start"
                    >
                        {formatDate(data[0].date)}
                    </text>
                    <text
                        x={width}
                        y={height + 10}
                        fill="var(--text-muted)"
                        fontSize="8"
                        textAnchor="end"
                    >
                        {formatDate(data[data.length - 1].date)}
                    </text>
                </>
            )}
            <polyline
                points={polylinePoints}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" }}
            />
            {points.map((p, i) => (
                <circle
                    key={`dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="1.5"
                    fill={color}
                />
            ))}
            {points.map((p, i) => (
                <circle
                    key={`hit-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill="transparent"
                    stroke="transparent"
                    style={{ cursor: "crosshair", pointerEvents: "all" }}
                >
                    <title>{`Price: $${p.val.close.toFixed(2)}\nDate: ${new Date(p.val.date).toLocaleString()}`}</title>
                </circle>
            ))}
        </svg>
    );
}

export function StockCard({
    symbol,
    price,
    change,
    changePercent,
    name,
    chart,
}: StockCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [history30d, setHistory30d] = useState<ChartDataPoint[] | null>(null);
    const [history1y, setHistory1y] = useState<ChartDataPoint[] | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [show1Year, setShow1Year] = useState(false);

    const isPositive = change >= 0;

    const handleFlip = async () => {
        setIsFlipped(!isFlipped);

        if (!isFlipped && history30d === null && !isLoadingHistory) {
            setIsLoadingHistory(true);
            try {
                const ipcRenderer = (window as any).ipcRenderer;
                if (ipcRenderer && ipcRenderer.invoke) {
                    const data = await ipcRenderer.invoke(
                        "get-historical-charts",
                        symbol,
                    );
                    setHistory30d(data.chart30d);
                    setHistory1y(data.chart1y);
                }
            } catch (error) {
                console.error("Failed to fetch historical charts", error);
            } finally {
                setIsLoadingHistory(false);
            }
        }
    };

    return (
        <div
            className={`stock-card ${isFlipped ? "is-flipped" : ""}`}
            onClick={handleFlip}
        >
            <div className="card-inner">
                {/* FRONT OF CARD */}
                <div className="card-front">
                    <div className="stock-header">
                        <div>
                            <div className="stock-symbol">{symbol}</div>
                            {name && (
                                <div className="stock-name" title={name}>
                                    {name}
                                </div>
                            )}
                        </div>
                        <div
                            className={`stock-change ${isPositive ? "positive" : "negative"}`}
                        >
                            {isPositive ? (
                                <ArrowUpIcon
                                    className="w-4 h-4 inline"
                                    style={{ width: 16, height: 16 }}
                                />
                            ) : (
                                <ArrowDownIcon
                                    className="w-4 h-4 inline"
                                    style={{ width: 16, height: 16 }}
                                />
                            )}
                            <span>
                                {Math.abs(change).toFixed(2)} (
                                {Math.abs(changePercent).toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                    <div
                        className="stock-price"
                        style={{
                            marginBottom: "1.5rem",
                            paddingBottom: "0.8rem",
                            borderBottom: "1px dashed rgba(255,255,255,0.1)",
                        }}
                    >
                        ${price.toFixed(2)}
                    </div>
                    {chart && chart.length > 0 && (
                        <div
                            style={{
                                width: "100%",
                                opacity: 0.95,
                                paddingTop: "0.5rem",
                            }}
                        >
                            <Sparkline
                                data={chart}
                                color={
                                    isPositive
                                        ? "var(--success)"
                                        : "var(--danger)"
                                }
                                showAxes={true}
                                width={240}
                                height={75}
                            />
                        </div>
                    )}
                </div>

                {/* BACK OF CARD */}
                <div className="card-back">
                    {isLoadingHistory ? (
                        <div
                            className="loader"
                            style={{ width: 20, height: 20 }}
                        ></div>
                    ) : (
                        <>
                            <div
                                style={{
                                    position: "absolute",
                                    top: 15,
                                    left: 15,
                                    fontSize: "0.85rem",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                {symbol} • {show1Year ? "1 Year" : "30 Days"}
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    opacity: 0.95,
                                    paddingTop: "10px",
                                }}
                            >
                                {(show1Year ? history1y : history30d) &&
                                (show1Year ? history1y : history30d)!.length >
                                    0 ? (
                                    <Sparkline
                                        data={
                                            show1Year ? history1y! : history30d!
                                        }
                                        color={
                                            show1Year
                                                ? "var(--text-muted)"
                                                : "var(--accent-primary)"
                                        }
                                        showAxes={true}
                                        width={240}
                                        height={80}
                                    />
                                ) : (
                                    <span
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        No historical data
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 15,
                                    right: 15,
                                    fontSize: "0.75rem",
                                    color: "var(--accent-primary)",
                                    cursor: "pointer",
                                    zIndex: 10,
                                    padding: "5px",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShow1Year(!show1Year);
                                }}
                            >
                                {show1Year ? "Show 30 Days" : "Show 1 Year"}
                            </div>

                            <div
                                style={{
                                    position: "absolute",
                                    top: 15,
                                    right: 15,
                                    fontSize: "0.7rem",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                }}
                            >
                                Click to flip
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
