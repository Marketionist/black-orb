import { useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tickers: string[];
    refreshRate: number;
    onAddTicker: (symbol: string) => void;
    onRemoveTicker: (symbol: string) => void;
    onUpdateRate: (rate: number) => void;
    onReset: () => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    tickers,
    refreshRate,
    onAddTicker,
    onRemoveTicker,
    onUpdateRate,
    onReset,
}: SettingsModalProps) {
    const [newTicker, setNewTicker] = useState("");

    if (!isOpen) return null;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const symbols = newTicker
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
        symbols.forEach((symbol) => {
            if (symbol && !tickers.includes(symbol)) {
                onAddTicker(symbol);
            }
        });
        setNewTicker("");
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">Dashboard Settings</h2>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "inherit",
                        }}
                    >
                        <XMarkIcon style={{ width: 24, height: 24 }} />
                    </button>
                </div>

                <div className="form-group">
                    <label>Refresh Rate (seconds)</label>
                    <select
                        value={refreshRate}
                        onChange={(e) => onUpdateRate(Number(e.target.value))}
                    >
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>
                        Manage Tickers (comma separated to add multiple)
                    </label>
                    <form className="input-flex" onSubmit={handleAdd}>
                        <input
                            type="text"
                            placeholder="e.g. AAPL, NVDA"
                            value={newTicker}
                            onChange={(e) => setNewTicker(e.target.value)}
                        />
                        <button type="submit" className="btn-primary">
                            Add
                        </button>
                    </form>

                    <div className="ticker-list">
                        {tickers.map((ticker) => (
                            <div key={ticker} className="ticker-item">
                                <span className="ticker-item-text">
                                    {ticker}
                                </span>
                                <button
                                    className="btn-remove icon-btn"
                                    onClick={() => onRemoveTicker(ticker)}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                    }}
                                >
                                    <TrashIcon
                                        style={{ width: 18, height: 18 }}
                                    />
                                </button>
                            </div>
                        ))}
                        {tickers.length === 0 && (
                            <div
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.875rem",
                                    marginTop: "0.5rem",
                                }}
                            >
                                No tickers added.
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="settings-footer"
                    style={{
                        borderTop: "none",
                        marginTop: "1rem",
                        paddingTop: 0,
                    }}
                >
                    <button
                        className="btn-danger"
                        onClick={() => {
                            if (
                                window.confirm(
                                    "Are you sure you want to reset all storage?",
                                )
                            ) {
                                onReset();
                            }
                        }}
                    >
                        Reset Storage
                    </button>
                    <button className="btn-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
