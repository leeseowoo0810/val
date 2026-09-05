/**
 * Valorant-style Crosshair System
 * Features: Valorant Official Profile Code Import/Export, Pro Presets, Live Preview
 */
class CrosshairManager {
    constructor() {
        this.defaults = {
            color: '#00ffff',
            outline: true,
            outlineThickness: 1,
            outlineOpacity: 0.5,
            centerDot: false,
            centerDotSize: 2,
            centerDotOpacity: 1,
            innerLines: true,
            innerOpacity: 1,
            innerLength: 6,
            innerThickness: 2,
            innerOffset: 3,
            outerLines: false,
            outerOpacity: 0.5,
            outerLength: 2,
            outerThickness: 2,
            outerOffset: 10,
            firingError: true
        };

        // Valorant Color Index mapping
        this.colorPalette = [
            '#ffffff', // 0: White
            '#00ff00', // 1: Green
            '#7fff00', // 2: Yellow-Green
            '#adff2f', // 3: Green-Yellow
            '#ffff00', // 4: Yellow
            '#00ffff', // 5: Cyan
            '#ff00ff', // 6: Pink/Magenta
            '#ff4655'  // 7: Red
        ];

        // Famous Pro Presets
        this.proPresets = {
            tenz: '0;s;1;P;c;5;h;0;m;1;0l;4;0v;4;0g;1;0a;1;0f;0;1b;0',
            aspas: '0;P;c;5;o;1;d;1;z;4;f;0;0b;0;1b;0',
            dot: '0;P;c;1;o;1;d;1;z;3;f;0;0b;0;1b;0',
            classic: '0;P;c;1;o;1;0t;1;0l;5;0o;2;0a;1;0f;0;1b;0'
        };

        this.config = this.loadConfig();
        this.currentRecoilOffset = 0;
        this.hudCanvas = null;
        this.previewCanvas = null;
        this.hudCtx = null;
        this.previewCtx = null;
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('valorant_aim_crosshair');
            if (saved) {
                return { ...this.defaults, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Could not load crosshair config from localStorage', e);
        }
        return { ...this.defaults };
    }

    saveConfig() {
        try {
            localStorage.setItem('valorant_aim_crosshair', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Could not save crosshair config', e);
        }
    }

    init(hudCanvasId = 'crosshairCanvas', previewCanvasId = 'previewCrosshairCanvas') {
        this.hudCanvas = document.getElementById(hudCanvasId);
        this.previewCanvas = document.getElementById(previewCanvasId);

        if (this.hudCanvas) {
            this.hudCtx = this.hudCanvas.getContext('2d');
            this.hudCanvas.width = 120;
            this.hudCanvas.height = 120;
        }

        if (this.previewCanvas) {
            this.previewCtx = this.previewCanvas.getContext('2d');
            this.previewCanvas.width = 160;
            this.previewCanvas.height = 160;
        }

        this.renderAll();
    }

    triggerFiringError(recoilAmount = 4) {
        if (!this.config.firingError) return;
        this.currentRecoilOffset = recoilAmount;
    }

    update(deltaTime) {
        if (this.currentRecoilOffset > 0) {
            this.currentRecoilOffset = Math.max(0, this.currentRecoilOffset - deltaTime * 24);
            this.renderHUD();
        }
    }

    renderToCanvas(ctx, width, height, extraOffset = 0) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        const c = this.config;

        const parseColor = (hex, alpha) => {
            if (!hex || hex.length < 7) return `rgba(0, 255, 255, ${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const drawRect = (x, y, w, h, fillStyle, outline) => {
            if (outline && c.outline) {
                const ot = c.outlineThickness;
                ctx.fillStyle = `rgba(0, 0, 0, ${c.outlineOpacity})`;
                ctx.fillRect(x - ot, y - ot, w + ot * 2, h + ot * 2);
            }
            ctx.fillStyle = fillStyle;
            ctx.fillRect(x, y, w, h);
        };

        // 1. Center Dot
        if (c.centerDot) {
            const size = Math.max(1, c.centerDotSize);
            const half = size / 2;
            const x = Math.round(cx - half);
            const y = Math.round(cy - half);
            const fill = parseColor(c.color, c.centerDotOpacity);
            drawRect(x, y, size, size, fill, true);
        }

        // 2. Inner Lines
        if (c.innerLines) {
            const fill = parseColor(c.color, c.innerOpacity);
            const len = Math.max(1, c.innerLength);
            const th = Math.max(1, c.innerThickness);
            const off = Math.max(0, c.innerOffset) + extraOffset;
            const halfTh = Math.floor(th / 2);

            drawRect(cx - off - len, cy - halfTh, len, th, fill, true);
            drawRect(cx + off, cy - halfTh, len, th, fill, true);
            drawRect(cx - halfTh, cy - off - len, th, len, fill, true);
            drawRect(cx - halfTh, cy + off, th, len, fill, true);
        }

        // 3. Outer Lines
        if (c.outerLines) {
            const fill = parseColor(c.color, c.outerOpacity);
            const len = Math.max(1, c.outerLength);
            const th = Math.max(1, c.outerThickness);
            const off = Math.max(0, c.outerOffset) + extraOffset * 1.5;
            const halfTh = Math.floor(th / 2);

            drawRect(cx - off - len, cy - halfTh, len, th, fill, true);
            drawRect(cx + off, cy - halfTh, len, th, fill, true);
            drawRect(cx - halfTh, cy - off - len, th, len, fill, true);
            drawRect(cx - halfTh, cy + off, th, len, fill, true);
        }
    }

    renderHUD() {
        if (this.hudCtx && this.hudCanvas) {
            this.renderToCanvas(this.hudCtx, this.hudCanvas.width, this.hudCanvas.height, this.currentRecoilOffset);
        }
    }

    renderPreview() {
        if (this.previewCtx && this.previewCanvas) {
            const w = this.previewCanvas.width;
            const h = this.previewCanvas.height;
            this.previewCtx.fillStyle = '#141d27';
            this.previewCtx.fillRect(0, 0, w, h);

            // Silhouette head in background
            this.previewCtx.fillStyle = '#ff465533';
            this.previewCtx.beginPath();
            this.previewCtx.arc(w / 2, h / 2, 28, 0, Math.PI * 2);
            this.previewCtx.fill();

            this.renderToCanvas(this.previewCtx, w, h, 0);
        }
    }

    renderAll() {
        this.renderHUD();
        this.renderPreview();
    }

    updateSetting(key, value) {
        this.config[key] = value;
        this.saveConfig();
        this.renderAll();
    }

    // =========================================================================
    // VALORANT OFFICIAL PROFILE CODE PARSER & SERIALIZER
    // =========================================================================

    /**
     * Import a Valorant Crosshair Code string (e.g. 0;P;c;5;o;1;d;1;z;4;0b;0;1b;0)
     */
    importValorantCode(codeStr) {
        if (!codeStr || typeof codeStr !== 'string') return false;
        codeStr = codeStr.trim();
        if (!codeStr.startsWith('0;')) return false;

        const tokens = codeStr.split(';');
        const newConf = { ...this.defaults };

        for (let i = 0; i < tokens.length - 1; i += 2) {
            const key = tokens[i];
            const val = tokens[i + 1];

            switch (key) {
                case 'c': // Color
                    const cIdx = parseInt(val, 10);
                    if (cIdx >= 0 && cIdx < this.colorPalette.length) {
                        newConf.color = this.colorPalette[cIdx];
                    }
                    break;
                case 'h': // Outline toggle (0: off, 1: on)
                    newConf.outline = (val === '1');
                    break;
                case 'o': // Outline opacity
                    newConf.outline = true;
                    newConf.outlineOpacity = parseFloat(val);
                    break;
                case 't': // Outline thickness
                    newConf.outlineThickness = parseInt(val, 10);
                    break;
                case 'd': // Center dot toggle
                    newConf.centerDot = (val === '1');
                    break;
                case 'z': // Center dot size
                    newConf.centerDotSize = parseInt(val, 10);
                    break;
                case 'a': // Center dot opacity
                    newConf.centerDotOpacity = parseFloat(val);
                    break;
                case '0b': // Inner lines toggle
                    newConf.innerLines = (val === '1');
                    break;
                case '0l': // Inner lines length
                    newConf.innerLength = parseInt(val, 10);
                    break;
                case '0v': // Inner lines vertical length (override if present)
                    newConf.innerLength = parseInt(val, 10);
                    break;
                case '0t': // Inner lines thickness
                    newConf.innerThickness = parseInt(val, 10);
                    break;
                case '0o': // Inner lines offset
                    newConf.innerOffset = parseInt(val, 10);
                    break;
                case '0a': // Inner lines opacity
                    newConf.innerOpacity = parseFloat(val);
                    break;
                case '0f': // Firing error
                    newConf.firingError = (val === '1');
                    break;
            }
        }

        this.config = newConf;
        this.saveConfig();
        this.renderAll();
        return true;
    }

    /**
     * Export the current crosshair settings to a Valorant Profile Code string
     */
    exportValorantCode() {
        const c = this.config;
        let colorIdx = 5; // Default Cyan
        const found = this.colorPalette.indexOf(c.color.toLowerCase());
        if (found !== -1) colorIdx = found;

        let code = `0;P;c;${colorIdx}`;
        if (c.outline) {
            code += `;o;${c.outlineOpacity};t;${c.outlineThickness}`;
        } else {
            code += `;h;0`;
        }

        if (c.centerDot) {
            code += `;d;1;z;${c.centerDotSize};a;${c.centerDotOpacity}`;
        }

        if (c.innerLines) {
            code += `;0b;1;0t;${c.innerThickness};0l;${c.innerLength};0o;${c.innerOffset};0a;${c.innerOpacity}`;
        } else {
            code += `;0b;0`;
        }

        if (c.firingError) {
            code += `;0f;1`;
        } else {
            code += `;0f;0`;
        }

        code += `;1b;0`;
        return code;
    }

    applyProPreset(presetKey) {
        if (this.proPresets[presetKey]) {
            return this.importValorantCode(this.proPresets[presetKey]);
        }
        return false;
    }
}

window.crosshairManager = new CrosshairManager();
