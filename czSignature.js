/**
 * czSignature.js - v1.1
 * A modern, lightweight, and event-driven JavaScript library for creating beautiful, pressure-sensitive digital signatures.
 *
 * Copyright (c) 2025 Cyberzilla
 * MIT License
 */
(function(global) {
    'use strict';

    class czSignature {
        _options = {
            penColor: '#000000',
            backgroundColor: '#ffffff',
            minWidth: 0.5,
            maxWidth: 2.5,
            velocityFilterWeight: 0.7,
            dotSize: 2.0,
            minDistance: 0.8,
            smoothingRatio: 0.5,
            smoothingFadePoints: 4,
            smoothingMode: 'post',
            pressureSupport: false,
            dpi: 300,
            trimOutput: false,
            trimPadding: 16,
            outputPenColor: null,
            outputBackgroundColor: null,
        };

        #isDrawing = false;
        #currentStroke = [];
        #allStrokes = [];
        #drawing = false;
        #listeners = {};
        #resizeTimeout;

        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.options = { ...this._options, ...options };
            this.#init();
        }

        clear() {
            this.#resetState();
            this.#redrawCanvas();
            this.#emit('clear');
        }

        undo() {
            if (this.#allStrokes.length > 0) {
                this.#allStrokes.pop();
                this.#redrawCanvas();
                this.#emit('undo', { strokesLeft: this.#allStrokes.length });
                return true;
            }
            return false;
        }

        isEmpty() {
            return this.#allStrokes.length === 0;
        }

        updateOptions(newOptions) {
            this.options = { ...this.options, ...newOptions };
            this.#redrawCanvas();
        }

        toData() {
            return [...this.#allStrokes];
        }

        fromData(data) {
            if (!Array.isArray(data)) {
                console.error("Data to load must be an array.");
                return;
            }
            this.clear();
            this.#allStrokes = data;
            this.#redrawCanvas();
            this.#emit('load', { strokeCount: this.#allStrokes.length });
        }

        toSVG() {
            const { trimOutput, trimPadding, outputBackgroundColor, outputPenColor } = this.options;
            if (this.isEmpty()) return '';
            let bbox = { minX: 0, minY: 0, width: this.canvasWidth, height: this.canvasHeight };
            if (trimOutput) {
                bbox = this.#calculateBoundingBox();
                if (!bbox) return '';
            }
            const svgWidth = trimOutput ? bbox.width + trimPadding * 2 : this.canvasWidth;
            const svgHeight = trimOutput ? bbox.height + trimPadding * 2 : this.canvasHeight;
            const viewBoxX = trimOutput ? bbox.minX - trimPadding : 0;
            const viewBoxY = trimOutput ? bbox.minY - trimPadding : 0;
            const viewBox = `${viewBoxX} ${viewBoxY} ${svgWidth} ${svgHeight}`;
            let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="${viewBox}">\n`;
            const finalBgColor = outputBackgroundColor ?? this.options.backgroundColor;
            if (finalBgColor !== 'transparent') {
                svgContent += `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${svgWidth}" height="${svgHeight}" fill="${finalBgColor}"/>\n`;
            }
            svgContent += '  <g fill-rule="nonzero">\n';
            this.#allStrokes.forEach((stroke) => {
                const { points, color, minWidth, maxWidth } = stroke;
                if (points.length === 0) return;
                const finalPenColor = outputPenColor ?? color;
                const widths = this.#calculateWidths(points, minWidth, maxWidth);
                const pathData = this.#generateSmoothSvgPathData(points, widths);
                if (pathData) {
                    svgContent += `    <path d="${pathData}" fill="${finalPenColor}" stroke="none"/>\n`;
                }
            });
            svgContent += '  </g>\n</svg>';
            return svgContent.trim();
        }

        toDataURL(format = 'image/png') {
            const { dpi, trimOutput, trimPadding, outputBackgroundColor, outputPenColor } = this.options;
            if (this.isEmpty()) return "data:,";
            const mimeType = format.toLowerCase();
            const quality = mimeType === 'image/jpeg' ? 0.92 : 1.0;
            const scale = dpi / 96;
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let targetWidth = this.canvasWidth;
            let targetHeight = this.canvasHeight;
            let translateX = 0;
            let translateY = 0;
            if (trimOutput) {
                const bbox = this.#calculateBoundingBox();
                if (!bbox) return "data:,";
                targetWidth = bbox.width + trimPadding * 2;
                targetHeight = bbox.height + trimPadding * 2;
                translateX = -bbox.minX + trimPadding;
                translateY = -bbox.minY + trimPadding;
            }
            tempCanvas.width = targetWidth * scale;
            tempCanvas.height = targetHeight * scale;
            tempCtx.scale(scale, scale);
            const finalBgColor = outputBackgroundColor ?? this.options.backgroundColor;
            if (finalBgColor !== 'transparent') {
                tempCtx.fillStyle = finalBgColor;
                tempCtx.fillRect(0, 0, targetWidth, targetHeight);
            }
            tempCtx.translate(translateX, translateY);
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
            this.#allStrokes.forEach((stroke) => {
                const finalPenColor = outputPenColor ?? stroke.color;
                this.#drawStroke(tempCtx, stroke.points, finalPenColor, stroke.minWidth, stroke.maxWidth);
            });
            return tempCanvas.toDataURL(mimeType, quality);
        }

        destroy() {
            this.#removeEventListeners();
            window.removeEventListener('resize', this.boundResize);
            this.#emit('destroy');
        }

        on(eventName, callback) {
            if (!this.#listeners[eventName]) { this.#listeners[eventName] = []; }
            this.#listeners[eventName].push(callback);
        }

        #emit(eventName, data = {}) {
            if (this.#listeners[eventName]) {
                this.#listeners[eventName].forEach(callback => callback(data));
            }
        }

        #init() {
            this.#setupCanvas();
            this.#addEventListeners();
            this.#setupResizeHandler();
            this.clear();
        }

        #resetState = () => {
            this.#isDrawing = false;
            this.#currentStroke = [];
            this.#allStrokes = [];
            this.#drawing = false;
        }

        #setupCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
            this.#redrawCanvas();
        }

        #addEventListeners = () => {
            this.boundStart = this.#startDrawing;
            this.boundDraw = this.#draw;
            this.boundStop = this.#stopDrawing;
            this.canvas.addEventListener('pointerdown', this.boundStart);
            this.canvas.addEventListener('pointermove', this.boundDraw);
            document.addEventListener('pointerup', this.boundStop);
            document.addEventListener('pointercancel', this.boundStop);
        }

        #removeEventListeners = () => {
            this.canvas.removeEventListener('pointerdown', this.boundStart);
            this.canvas.removeEventListener('pointermove', this.boundDraw);
            document.removeEventListener('pointerup', this.boundStop);
            document.removeEventListener('pointercancel', this.boundStop);
        }

        #setupResizeHandler = () => {
            this.boundResize = () => {
                if (this.#resizeTimeout) clearTimeout(this.#resizeTimeout);
                this.#resizeTimeout = setTimeout(() => {
                    this.#setupCanvas();
                    this.#emit('resize');
                }, 250);
            };
            window.addEventListener('resize', this.boundResize);
        }

        #getCoordinates = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            let x = event.clientX - rect.left;
            let y = event.clientY - rect.top;
            const halfPenWidth = (this.options.maxWidth || this.options.dotSize) / 2;
            x = Math.max(halfPenWidth, Math.min(x, this.canvasWidth - halfPenWidth));
            y = Math.max(halfPenWidth, Math.min(y, this.canvasHeight - halfPenWidth));
            const pressure = event.pressure > 0 ? event.pressure : 0.5;
            return { x, y, time: Date.now(), pressure };
        }

        #startDrawing = (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            this.canvas.setPointerCapture(event.pointerId);
            this.#isDrawing = true;
            this.#currentStroke = [this.#getCoordinates(event)];
            this.#emit('drawStart', { event });
        }

        #draw = (event) => {
            if (!this.#isDrawing) return;
            event.preventDefault();
            if(this.canvas.hasPointerCapture(event.pointerId)) {
                this.#currentStroke.push(this.#getCoordinates(event));
                if (!this.#drawing) {
                    this.#drawing = true;
                    requestAnimationFrame(() => {
                        this.#redrawCanvas();
                        this.#drawing = false;
                    });
                }
            }
        }

        #stopDrawing = (event) => {
            if (!this.#isDrawing) return;
            if(this.canvas.hasPointerCapture(event.pointerId)) {
                this.canvas.releasePointerCapture(event.pointerId);
            }
            this.#isDrawing = false;
            let newStroke = null;
            if (this.#currentStroke.length > 0) {
                const strokePoints = (this.#currentStroke.length > 1)
                    ? this.#simplifyStroke(this.#currentStroke)
                    : this.#currentStroke;
                newStroke = {
                    points: strokePoints,
                    color: this.options.penColor,
                    minWidth: this.options.minWidth,
                    maxWidth: this.options.maxWidth
                };
                this.#allStrokes.push(newStroke);
            }
            if (newStroke) { this.#emit('drawEnd', { stroke: newStroke }); }
            this.#currentStroke = [];
            this.#redrawCanvas();
        }

        #redrawCanvas = () => {
            this.ctx.fillStyle = this.options.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.#allStrokes.forEach((stroke) => {
                this.#drawStroke(this.ctx, stroke.points, stroke.color, stroke.minWidth, stroke.maxWidth);
            });
            if (this.#isDrawing && this.#currentStroke && this.#currentStroke.length > 0) {
                const strokeToDraw = (this.options.smoothingMode === 'live' && this.#currentStroke.length > 1)
                    ? this.#simplifyStroke(this.#currentStroke)
                    : this.#currentStroke;
                this.#drawStroke(this.ctx, strokeToDraw, this.options.penColor, this.options.minWidth, this.options.maxWidth);
            }
        }

        #simplifyStroke = (points) => {
            if (points.length < 3) return points;
            let simplifiedPoints = [points[0]];
            let lastPoint = points[0];
            for (let i = 1; i < points.length; i++) {
                const distance = Math.hypot(points[i].x - lastPoint.x, points[i].y - lastPoint.y);
                if (distance > this.options.minDistance) {
                    simplifiedPoints.push(points[i]);
                    lastPoint = points[i];
                }
            }
            if (simplifiedPoints.length < 3) return simplifiedPoints;
            const smoothedPoints = [simplifiedPoints[0]];
            const fadeLength = this.options.smoothingFadePoints;
            for (let i = 1; i < simplifiedPoints.length - 1; i++) {
                const prev = simplifiedPoints[i - 1];
                const current = simplifiedPoints[i];
                const next = simplifiedPoints[i + 1];
                const fadeInRatio = Math.min(1, i / fadeLength);
                const fadeOutRatio = Math.min(1, (simplifiedPoints.length - 2 - i) / fadeLength);
                const dynamicRatio = this.options.smoothingRatio * Math.min(fadeInRatio, fadeOutRatio);
                const smoothedX = current.x * (1 - dynamicRatio) + (prev.x + next.x) / 2 * dynamicRatio;
                const smoothedY = current.y * (1 - dynamicRatio) + (prev.y + next.y) / 2 * dynamicRatio;
                smoothedPoints.push({ x: smoothedX, y: smoothedY, time: current.time, pressure: current.pressure });
            }
            smoothedPoints.push(simplifiedPoints[simplifiedPoints.length - 1]);
            return smoothedPoints;
        }

        #drawStroke = (ctx, points, color, minWidth, maxWidth) => {
            if (points.length === 0) return;
            if (points.length === 1) {
                ctx.beginPath();
                ctx.fillStyle = color;
                const radius = (this.options.maxWidth || this.options.dotSize) / 2;
                ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2, true);
                ctx.fill();
                return;
            }
            ctx.strokeStyle = color;
            const widths = this.#calculateWidths(points, minWidth, maxWidth);
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const segmentWidth = (widths[i] + widths[i + 1]) / 2;
                ctx.lineWidth = segmentWidth;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(midX, midY);
            }
            ctx.lineWidth = widths[points.length - 1];
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();
        }

        #calculateWidths = (points, minWidth, maxWidth) => {
            const widths = [];
            let lastVelocity = 0;
            const usePressure = this.options.pressureSupport && points.some(p => p.pressure > 0 && p.pressure < 1);
            for (let i = 0; i < points.length; i++) {
                let width;
                if (usePressure) {
                    width = minWidth + (maxWidth - minWidth) * points[i].pressure;
                } else {
                    let velocity = 0;
                    if (i > 0) {
                        const distance = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
                        const time = points[i].time - points[i - 1].time;
                        velocity = time > 0 ? distance / time : lastVelocity;
                    }
                    lastVelocity = (velocity * (1 - this.options.velocityFilterWeight)) + (lastVelocity * this.options.velocityFilterWeight);
                    width = Math.max(minWidth, Math.min(maxWidth, maxWidth - (lastVelocity * 1.5)));
                }
                widths.push(width);
            }
            return widths;
        }

        #calculateBoundingBox = () => {
            if (this.isEmpty()) return null;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            this.#allStrokes.forEach(stroke => {
                const widths = this.#calculateWidths(stroke.points, stroke.minWidth, stroke.maxWidth);
                stroke.points.forEach((point, index) => {
                    const halfWidth = widths[index] / 2;
                    minX = Math.min(minX, point.x - halfWidth);
                    maxX = Math.max(maxX, point.x + halfWidth);
                    minY = Math.min(minY, point.y - halfWidth);
                    maxY = Math.max(maxY, point.y + halfWidth);
                });
            });
            return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
        }

        #generateSmoothSvgPathData = (points, widths) => {
            if (points.length < 2) {
                if (points.length === 1) {
                    const r = (this.options.maxWidth || this.options.dotSize) / 2;
                    return `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`;
                }
                return '';
            }
            const outline1 = [], outline2 = [];
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const nextP = (i < points.length - 1) ? points[i + 1] : p;
                const prevP = (i > 0) ? points[i - 1] : p;
                let tangentX, tangentY;
                if (i === 0) {
                    tangentX = nextP.x - p.x;
                    tangentY = nextP.y - p.y;
                } else if (i === points.length - 1) {
                    tangentX = p.x - prevP.x;
                    tangentY = p.y - prevP.y;
                } else {
                    tangentX = (nextP.x - prevP.x) / 2;
                    tangentY = (nextP.y - prevP.y) / 2;
                }
                const length = Math.hypot(tangentX, tangentY) || 1;
                const normal = { x: -tangentY / length, y: tangentX / length };
                const halfWidth = widths[i] / 2;
                outline1.push({ x: p.x + normal.x * halfWidth, y: p.y + normal.y * halfWidth });
                outline2.push({ x: p.x - normal.x * halfWidth, y: p.y - normal.y * halfWidth });
            }
            let pathData = '';
            const startCapRadius = (widths[0] / 2).toFixed(2);
            pathData += `M${outline1[0].x.toFixed(2)},${outline1[0].y.toFixed(2)}`;
            pathData += ` A${startCapRadius},${startCapRadius} 0 0 1 ${outline2[0].x.toFixed(2)},${outline2[0].y.toFixed(2)}`;

            for (let i = 0; i < outline2.length - 1; i++) {
                const p1 = outline2[i];
                const p2 = outline2[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                pathData += ` Q${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${midX.toFixed(2)},${midY.toFixed(2)}`;
            }
            pathData += ` L${outline2[outline2.length - 1].x.toFixed(2)},${outline2[outline2.length - 1].y.toFixed(2)}`;

            const endCapRadius = (widths[widths.length - 1] / 2).toFixed(2);
            pathData += ` A${endCapRadius},${endCapRadius} 0 0 1 ${outline1[outline1.length - 1].x.toFixed(2)},${outline1[outline1.length - 1].y.toFixed(2)}`;

            for (let i = outline1.length - 2; i >= 0; i--) {
                const p1 = outline1[i + 1];
                const p2 = outline1[i];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                pathData += ` Q${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${midX.toFixed(2)},${midY.toFixed(2)}`;
            }
            pathData += ' Z';
            return pathData;
        }
    }

    global.czSignature = czSignature;

})(typeof window !== 'undefined' ? window : this);