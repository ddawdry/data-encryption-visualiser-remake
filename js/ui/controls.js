// Step/complete/back/play controls, plus a speed slider for auto-play.
const controlsContainer = document.getElementById('controls');
let playButton = null;

/**
 * @param {{ onBack: () => void, onNext: () => void, onComplete: () => void, onTogglePlay: () => void, onSpeedChange: (level: number) => void }} handlers
 */
export function render({ onBack, onNext, onComplete, onTogglePlay, onSpeedChange }) {
    controlsContainer.replaceChildren();
    controlsContainer.setAttribute('role', 'group');
    controlsContainer.setAttribute('aria-label', 'Step controls');

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = '◀ Back';
    backButton.setAttribute('aria-label', 'Back');
    backButton.addEventListener('click', onBack);

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.textContent = 'Next Step';
    nextButton.addEventListener('click', onNext);

    const completeButton = document.createElement('button');
    completeButton.type = 'button';
    completeButton.textContent = 'Complete All';
    completeButton.addEventListener('click', onComplete);

    playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.textContent = '▶ Play';
    playButton.setAttribute('aria-pressed', 'false');
    playButton.addEventListener('click', onTogglePlay);

    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed';
    speedLabel.htmlFor = 'stepSpeed';

    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.id = 'stepSpeed';
    speedInput.min = '1';
    speedInput.max = '5';
    speedInput.value = '3';
    speedInput.addEventListener('input', () => onSpeedChange(Number(speedInput.value)));

    controlsContainer.append(backButton, nextButton, completeButton, playButton, speedLabel, speedInput);
}

export function setPlaying(isPlaying) {
    if (!playButton) return;
    playButton.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    playButton.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
}
