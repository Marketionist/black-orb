/* eslint-disable @typescript-eslint/no-magic-numbers */
import React, { useEffect, useState, useMemo } from 'react';

interface TeslaClockFrameProps {
    timezone: string;
}

/**
 * TeslaClockFrame
 * Pure HTML/CSS clock logic.
 * TS runs once (or on timezone change) to sync initial rotation.
 * CSS handles ongoing 24h animation and positioning.
 */
export function TeslaClockFrame ({ timezone, }: TeslaClockFrameProps) {
    const [timeStr, setTimeStr,] = useState('');

    const startAngle = useMemo(() => {
        // Sync initial rotation angle
        const resolvedTz = timezone === 'Local' ? undefined : timezone;
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false, timeZone: resolvedTz,
        }).formatToParts(now);

        const hr = Number(parts.find((p) => p.type === 'hour')?.value || 0);
        const mn = Number(parts.find((p) => p.type === 'minute')?.value || 0);
        const sc = Number(parts.find((p) => p.type === 'second')?.value || 0);

        return ((hr + mn / 60 + sc / 3600) / 24) * 360;
    }, [timezone,]);

    useEffect(() => {
        // Keep title time string updated
        const resolvedTz = timezone === 'Local' ? undefined : timezone;
        const fmt = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric',
            hour12: false, timeZone: resolvedTz,
        });

        const update = () => {
            const now = new Date();

            setTimeStr(fmt.format(now));
        };

        update();
        const timer = setInterval(update, 1000);

        return () => clearInterval(timer);
    }, [timezone,]);

    return (
        <svg
            className="tesla-clock-canvas"
            style={{ '--start-angle': `${startAngle}deg`, } as React.CSSProperties}
        >
            <g className="tesla-clock-group">
                {/* Hours ring */}
                <circle className="tesla-clock-ring" />

                {/* Hour digits (0-23) positioned by CSS via --i */}
                {[...Array(24),].map((_, i) =>
                    <text
                        key={i}
                        className="tesla-clock-digit"
                        style={{ '--i': i, } as React.CSSProperties}
                    >
                        {i}
                    </text>
                )}

                {/* Golden arrowhead pointing inward at current digit */}
                {/* Positioning, rotation, and geometry (d) handled by CSS */}
                <path className="tesla-clock-arrow">
                    <title>{timeStr}</title>
                </path>
            </g>
        </svg>
    );
}
