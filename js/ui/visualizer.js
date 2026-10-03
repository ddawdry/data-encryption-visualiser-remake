// Renders step-through animation via Canvas (a real animated entrance per block, not an instant
// DOM insertion) and the step explanation panel.
//
// Accessibility note: canvas content has no text for screen readers to read, unlike the previous
// DOM-based char-blocks. That's acceptable here specifically because the SAME information (which
// character changed, and why) is already announced via #stepExplanation's live region (see
// showMessage below and the checkpoint 30 architecture note) — this canvas is a visual supplement
// for sighted users, not the only place the information exists. It's marked aria-hidden in
// index.html for exactly this reason.
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
const stepExplanation = document.getElementById('stepExplanation');

const BLOCK_WIDTH = 70;
const BLOCK_HEIGHT = 40;
const GAP = 8;
const PADDING = 8;
const ANIMATION_DURATION_MS = 300;

let blocks = [];
let animationFrameId = null;

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function computeLayout() {
    const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth || BLOCK_WIDTH;
    const perRow = Math.max(1, Math.floor((cssWidth - PADDING) / (BLOCK_WIDTH + GAP)));
    const rows = Math.max(1, Math.ceil(blocks.length / perRow));
    return { cssWidth, perRow, rows };
}

function resizeCanvas(cssWidth, rows) {
    const dpr = window.devicePixelRatio || 1;
    const cssHeight = rows * (BLOCK_HEIGHT + GAP) + PADDING;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.height = `${cssHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return cssHeight;
}

function render(now) {
    const { cssWidth, perRow, rows } = computeLayout();
    const cssHeight = resizeCanvas(cssWidth, rows);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const mutedColor = cssVar('--color-bg-muted');
    const changedColor = cssVar('--color-changed-bg');
    const textColor = cssVar('--color-text');
    const changedTextColor = cssVar('--color-on-highlight');

    blocks.forEach((block, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = PADDING + col * (BLOCK_WIDTH + GAP);
        const y = PADDING + row * (BLOCK_HEIGHT + GAP);

        const age = now - block.addedAt;
        const progress = Math.min(age / ANIMATION_DURATION_MS, 1);
        const eased = 1 - (1 - progress) ** 3; // ease-out cubic
        const scale = 0.6 + 0.4 * eased;

        ctx.save();
        ctx.globalAlpha = eased;
        ctx.translate(x + BLOCK_WIDTH / 2, y + BLOCK_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.translate(-BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2);

        ctx.fillStyle = block.changed ? changedColor : mutedColor;
        roundRect(ctx, 0, 0, BLOCK_WIDTH, BLOCK_HEIGHT, 4);
        ctx.fill();

        ctx.fillStyle = block.changed ? changedTextColor : textColor;
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${block.oldChar} → ${block.newChar}`, BLOCK_WIDTH / 2, BLOCK_HEIGHT / 2);

        ctx.restore();
    });

    const stillAnimating = blocks.some((b) => now - b.addedAt < ANIMATION_DURATION_MS);
    animationFrameId = stillAnimating ? requestAnimationFrame(render) : null;
}

function startRenderLoop() {
    if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(render);
    }
}

// Re-layout (not re-animate) on resize, so blocks reflow to the new width.
window.addEventListener('resize', startRenderLoop);

/**
 * @param {import('../core/cipherRegistry.js').CipherStep} step
 * @param {number} stepNumber
 * @param {'encrypt'|'decrypt'} mode
 */
export function renderStep(step, stepNumber, mode) {
    blocks.push({
        oldChar: step.oldChar,
        newChar: step.newChar,
        changed: step.oldChar !== step.newChar,
        addedAt: performance.now(),
    });
    startRenderLoop();

    const verb = mode.charAt(0).toUpperCase() + mode.slice(1);
    showMessage(`${verb}ion Step ${stepNumber}`, step.explanation);
}

/**
 * @param {string} heading
 * @param {string} message
 * @param {{ urgent?: boolean }} [options] - urgent uses role="alert" (interrupts) instead of "status" (polite)
 */
export function showMessage(heading, message, { urgent = false } = {}) {
    stepExplanation.hidden = false;
    stepExplanation.setAttribute('role', urgent ? 'alert' : 'status');
    stepExplanation.replaceChildren();

    const h4 = document.createElement('h4');
    h4.textContent = heading;
    const p = document.createElement('p');
    p.textContent = message;
    stepExplanation.append(h4, p);
}

export function clear() {
    blocks = [];
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    const { cssWidth } = computeLayout();
    const cssHeight = resizeCanvas(cssWidth, 1);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    stepExplanation.hidden = true;
    stepExplanation.replaceChildren();
}
