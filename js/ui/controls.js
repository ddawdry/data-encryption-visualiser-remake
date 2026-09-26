// Step/complete/back controls.
const controlsContainer = document.getElementById('controls');

/**
 * @param {{ onBack: () => void, onNext: () => void, onComplete: () => void }} handlers
 */
export function render({ onBack, onNext, onComplete }) {
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

    controlsContainer.append(backButton, nextButton, completeButton);
}
