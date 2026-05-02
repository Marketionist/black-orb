/* eslint-disable @typescript-eslint/no-magic-numbers */
import { useEffect, useRef } from 'react';

const VERTICES = [
    [2.414213562373095, 0, 0,], [-2.414213562373095, 0, 0,],
    [0, 2.414213562373095, 0,], [0, -2.414213562373095, 0,],
    [0, 0, 2.414213562373095,], [0, 0, -2.414213562373095,],
    [1.2071067811865475, 1.2071067811865475, 0,], [1.2071067811865475, -1.2071067811865475, 0,],
    [-1.2071067811865475, 1.2071067811865475, 0,], [-1.2071067811865475, -1.2071067811865475, 0,],
    [1.2071067811865475, 0, 1.2071067811865475,], [1.2071067811865475, 0, -1.2071067811865475,],
    [-1.2071067811865475, 0, 1.2071067811865475,], [-1.2071067811865475, 0, -1.2071067811865475,],
    [0, 1.2071067811865475, 1.2071067811865475,], [0, 1.2071067811865475, -1.2071067811865475,],
    [0, -1.2071067811865475, 1.2071067811865475,], [0, -1.2071067811865475, -1.2071067811865475,],
    [-1.2761423749153968, -1.2761423749153968, -1.2761423749153968,],
    [-1.2761423749153968, -1.2761423749153968, 1.2761423749153968,],
    [-1.2761423749153968, 1.2761423749153968, -1.2761423749153968,],
    [-1.2761423749153968, 1.2761423749153968, 1.2761423749153968,],
    [1.2761423749153968, -1.2761423749153968, -1.2761423749153968,],
    [1.2761423749153968, -1.2761423749153968, 1.2761423749153968,],
    [1.2761423749153968, 1.2761423749153968, -1.2761423749153968,],
    [1.2761423749153968, 1.2761423749153968, 1.2761423749153968,],
];

const EDGES = [
    [0, 6,], [0, 7,], [0, 10,], [0, 11,], [0, 22,], [0, 23,], [0, 24,], [0, 25,],
    [1, 8,], [1, 9,], [1, 12,], [1, 13,], [1, 18,], [1, 19,], [1, 20,], [1, 21,],
    [2, 6,], [2, 8,], [2, 14,], [2, 15,], [2, 20,], [2, 21,], [2, 24,], [2, 25,],
    [3, 7,], [3, 9,], [3, 16,], [3, 17,], [3, 18,], [3, 19,], [3, 22,], [3, 23,],
    [4, 10,], [4, 12,], [4, 14,], [4, 16,], [4, 19,], [4, 21,], [4, 23,], [4, 25,],
    [5, 11,], [5, 13,], [5, 15,], [5, 17,], [5, 18,], [5, 20,], [5, 22,], [5, 24,],
    [6, 7,], [6, 8,], [6, 10,], [6, 11,], [6, 14,], [6, 15,], [6, 24,], [6, 25,],
    [7, 9,], [7, 10,], [7, 11,], [7, 16,], [7, 17,], [7, 22,], [7, 23,],
    [8, 9,], [8, 12,], [8, 13,], [8, 14,], [8, 15,], [8, 20,], [8, 21,],
    [9, 12,], [9, 13,], [9, 16,], [9, 17,], [9, 18,], [9, 19,],
    [10, 11,], [10, 12,], [10, 14,], [10, 16,], [10, 23,], [10, 25,],
    [11, 13,], [11, 15,], [11, 17,], [11, 22,], [11, 24,],
    [12, 13,], [12, 14,], [12, 16,], [12, 19,], [12, 21,],
    [13, 15,], [13, 17,], [13, 18,], [13, 20,],
    [14, 15,], [14, 16,], [14, 21,], [14, 25,],
    [15, 17,], [15, 20,], [15, 24,],
    [16, 17,], [16, 19,], [16, 23,],
    [17, 18,], [17, 22,],
];

interface TeslaState {
    angles: { x: number; y: number; z: number };
    rays: {
        angle: number;
        vertexIndex: number;
        offset: number;
        opacity: number;
        duration: number;
    }[];
}

export function TeslaCore () {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const state = useRef<TeslaState | null>(null);

    // Pure lazy initialization for the state ref to avoid 'react-hooks/purity' errors
    const getOrInitState = (): TeslaState => {
        if (!state.current) {
            state.current = {
                angles: { x: 0, y: 0, z: 0, },
                rays: Array.from({ length: 8, }, (_, i) => ({
                    angle: (i / 8) * Math.PI * 2,
                    vertexIndex: Math.floor(Math.random() * VERTICES.length),
                    offset: Math.random() * 1000,
                    opacity: 0,
                    duration: 4 + Math.random() * 4,
                })),
            };
        }
        return state.current;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const currentState = getOrInitState();

        if (!canvas) { return; }
        const ctx = canvas.getContext('2d');

        if (!ctx) { return; }

        let frameId: number;

        const render = (time: number) => {
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;
            const sphereRadius = Math.min(w, h) * 0.44;
            const coreScale = sphereRadius * 0.064;

            ctx.clearRect(0, 0, w, h);

            // 1. Pre-calculate core rotation
            currentState.angles.x += 0.007;
            currentState.angles.y += 0.01;
            currentState.angles.z += 0.004;
            const { x: ax, y: ay, z: az, } = currentState.angles;

            const cx_ax = Math.cos(ax); const sx_ax = Math.sin(ax);
            const cy_ay = Math.cos(ay); const sy_ay = Math.sin(ay);
            const cz_az = Math.cos(az); const sz_az = Math.sin(az);

            const rotated = VERTICES.map((v) => {
                let [x, y, z,] = v;
                let ty = y * cx_ax - z * sx_ax;
                let tz = y * sx_ax + z * cx_ax;

                y = ty; z = tz;
                let tx = x * cy_ay + z * sy_ay;

                tz = -x * sy_ay + z * cy_ay;
                x = tx; z = tz;
                tx = x * cz_az - y * sz_az;
                ty = x * sz_az + y * cz_az;
                x = tx; y = ty;
                return [x, y, z,];
            });
            const projected = rotated.map((v) => [v[0] * coreScale + cx, v[1] * coreScale + cy,]);

            // 2. Draw jagged lightning rays
            const mt_base = time * 0.001;

            currentState.rays.forEach((ray, i) => {
                const t = mt_base % ray.duration;
                const progress = t / ray.duration;

                let opacity = 0;

                if (progress < 0.1) {
                    opacity = progress / 0.1;
                } else if (progress < 0.7) {
                    opacity = 1;
                } else if (progress < 0.95) {
                    opacity = 1 - (progress - 0.7) / 0.25;
                } else {
                    opacity = 0;
                    if (Math.random() < 0.05) {
                        ray.vertexIndex = Math.floor(Math.random() * VERTICES.length);
                    }
                }

                if (opacity <= 0) { return; }

                const startPos = projected[ray.vertexIndex];
                const dx = startPos[0] - cx;
                const dy = startPos[1] - cy;
                const baseAngle = Math.atan2(dy, dx);
                const endR = sphereRadius;

                const mt = mt_base + ray.offset;
                const segments = 12;
                const startR = Math.sqrt(dx * dx + dy * dy);

                // Optimization: generate path once, draw twice (inner core + outer glow)
                // This is much faster than shadowBlur and avoids GPU mailbox errors
                const path = new Path2D();

                path.moveTo(startPos[0], startPos[1]);

                let lastX = startPos[0];
                let lastY = startPos[1];

                for (let j = 1; j <= segments; j++) {
                    const r = startR + (endR - startR) * (j / segments);
                    const targetX = cx + Math.cos(baseAngle) * r;
                    const targetY = cy + Math.sin(baseAngle) * r;

                    const jag =
                        Math.sin(mt * 2.1 + j * 0.6) * 7 +
                        Math.sin(mt * 4.3 - j * 0.5) * 4;

                    const wobble = jag * (j / segments);
                    const twist = Math.cos(mt * 0.15 + j * 0.1) * 0.2;
                    const finalAngle = baseAngle + twist;

                    const px = targetX + Math.cos(finalAngle + Math.PI / 2) * wobble;
                    const py = targetY + Math.sin(finalAngle + Math.PI / 2) * wobble;

                    path.quadraticCurveTo(lastX, lastY, (lastX + px) / 2, (lastY + py) / 2);
                    lastX = px; lastY = py;
                }
                path.lineTo(lastX, lastY);

                ctx.save();
                // 1. Draw outer glow (thicker, lower opacity)
                ctx.lineWidth = 4;
                ctx.strokeStyle = `rgba(253, 224, 71, ${opacity * 0.3})`;
                ctx.stroke(path);

                // 2. Draw inner core (thinner, bright)
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
                ctx.stroke(path);

                // 3. Graceful dissipation cloud
                const cloudProgress = Math.min(1, Math.max(0, (progress - 0.1) / 0.85));
                const hitX = lastX;
                const hitY = lastY;

                for (let k = 0; k < 3; k++) {
                    const seed = (i * 13 + k * 7) % 100;
                    const jitter = seed % 5;
                    const angle = (k / 3) * Math.PI * 2 + (seed * 0.2);
                    const px = hitX + Math.cos(angle) * jitter;
                    const py = hitY + Math.sin(angle) * jitter;

                    const s = (14 + (seed % 10)) * (1 + cloudProgress * 1.2);
                    const cloudOpacity = opacity * (0.25 - k * 0.05) * (1 - cloudProgress * 0.7);

                    if (cloudOpacity > 0.01) {
                        const spotGrad = ctx.createRadialGradient(px, py, 0, px, py, s);

                        spotGrad.addColorStop(0, `rgba(255, 255, 255, ${cloudOpacity})`);
                        spotGrad.addColorStop(0.5, `rgba(253, 224, 71, ${cloudOpacity * 0.4})`);
                        spotGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = spotGrad;
                        ctx.beginPath();
                        ctx.arc(px, py, s, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            });

            // 4. Draw core
            ctx.lineWidth = 0.8;
            EDGES.forEach(([i, j,]) => {
                const [x1, y1,] = projected[i];
                const [x2, y2,] = projected[j];
                const avgZ = (rotated[i][2] + rotated[j][2]) / 2;
                const depthOpacity = 0.3 + (avgZ + 2.5) / 5 * 0.7;

                ctx.strokeStyle = `rgba(229, 193, 88, ${depthOpacity * 0.6})`;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            });

            projected.forEach(([x, y,], i) => {
                const z = rotated[i][2];

                if (z < 0) { return; }
                ctx.fillStyle = `rgba(251, 242, 196, ${0.4 + (z + 2.5) / 5 * 0.4})`;
                ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
            });

            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={1000}
            height={1000}
            className="tesla-core-canvas"
        />
    );
}
