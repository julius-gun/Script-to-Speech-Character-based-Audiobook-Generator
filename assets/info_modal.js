// Contains logic for the information modal.

// Depends on:
// - UI Elements: info-button, info-modal, info-modal-close

/**
 * Attaches event listeners for the info modal.
 */
function attachInfoModalListeners() {
    const infoButton = document.getElementById('info-button');
    const modal = document.getElementById('info-modal');
    const closeButton = document.getElementById('info-modal-close');

    if (infoButton) {
        infoButton.removeEventListener('click', showInfoModal);
        infoButton.addEventListener('click', showInfoModal);
    }

    if (closeButton) {
        closeButton.removeEventListener('click', hideInfoModal);
        closeButton.addEventListener('click', hideInfoModal);
    }

    // Close modal if the overlay is clicked
    if (modal) {
        modal.removeEventListener('click', handleOverlayClick);
        modal.addEventListener('click', handleOverlayClick);
    }

    // Close modal on 'Escape' key press
    document.removeEventListener('keydown', handleEscKey); // Prevent duplicates
    document.addEventListener('keydown', handleEscKey);
}

/**
 * Closes the modal only if the dark overlay area is clicked.
 * @param {MouseEvent} event The mouse event.
 */
function handleOverlayClick(event) {
    if (event.target === this) { // 'this' will be the modal overlay element
        hideInfoModal();
    }
}

/**
 * Handles the 'Escape' key press to close the modal.
 * @param {KeyboardEvent} event The keyboard event.
 */
function handleEscKey(event) {
    const modal = document.getElementById('info-modal');
    if (event.key === 'Escape' && modal && !modal.classList.contains('hide')) {
        hideInfoModal();
    }
}

/**
 * Shows the info modal.
 */
function showInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
        modal.classList.remove('hide');
    }
}

/**
 * Hides the info modal.
 */
function hideInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
        modal.classList.add('hide');
    }
}