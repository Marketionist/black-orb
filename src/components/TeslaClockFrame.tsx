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

    const { startAngle, initialIsPM } = useMemo(() => {
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

        // Calculate angle on a 12-hour scale
        const angle = ((hr % 12 + mn / 60 + sc / 3600) / 12) * 360;
        return { startAngle: angle, initialIsPM: hr >= 12 };
    }, [timezone,]);

    const [isPM, setIsPM] = useState(initialIsPM);

    useEffect(() => {
        setIsPM(initialIsPM);
    }, [initialIsPM]);

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

            const parts = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric', hour12: false, timeZone: resolvedTz,
            }).formatToParts(now);
            const hr = Number(parts.find((p) => p.type === 'hour')?.value || 0);
            setIsPM(hr >= 12);
        };

        update();
        const timer = setInterval(update, 1000);

        return () => clearInterval(timer);
    }, [timezone,]);

    const digits = useMemo(() => {
        // PM shows hours 12 to 24 (using 24 at the top, 13-23 for others)
        // AM shows hours 0 to 12 (using 12 at the top, 1-11 for others)
        return isPM
            ? [24, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
            : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }, [isPM]);

    return (
        <svg
            className="tesla-clock-canvas"
            style={{ '--start-angle': `${startAngle}deg`, } as React.CSSProperties}
        >
            <g className="tesla-clock-group">
                {/* Hours ring */}
                <circle className={`tesla-clock-ring ${isPM ? 'is-pm' : 'is-am'}`} />

                {/* Hour digits (0-11) positioned by CSS via --i */}
                {digits.map((digit, i) =>
                    <text
                        key={i}
                        className="tesla-clock-digit"
                        style={{ '--i': i, } as React.CSSProperties}
                    >
                        {digit}
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
