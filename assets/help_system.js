// Contains functions and listeners for the contextual help system.

// Depends on:
// - DOM Elements: #help-title, #help-text, .help-section, #pointstype
// - Globals: translations, currentLanguage
// - Functions: formatString (assumed helper), fetchTranslation (translation_api.js) // Added dependency

function showHelp(title, text) {
    const helpTitle = document.getElementById('help-title');
    const helpText = document.getElementById('help-text');
    const helpSection = document.querySelector('.help-section');

    if (helpTitle) helpTitle.textContent = title;
    if (helpText) helpText.textContent = text;
    if (helpSection) helpSection.classList.add('show');
}

function hideHelp() {
    const helpSection = document.querySelector('.help-section');
    if (helpSection) helpSection.classList.remove('show');
}

// Attaches event listeners specific to the help system
function attachHelpListeners() {
    // Listener for period replacement type click to show help
    const pointsTypeElement = document.getElementById('pointstype');
    if (pointsTypeElement) {
        pointsTypeElement.removeEventListener('click', handlePointsTypeClickForHelp); // Prevent duplicates
        pointsTypeElement.addEventListener('click', handlePointsTypeClickForHelp);
    }

    // Listener to hide help when clicking outside
    document.removeEventListener('click', handleOutsideHelpClick); // Prevent duplicates
    document.addEventListener('click', handleOutsideHelpClick);
}

// Handler for clicking the points type element
function handlePointsTypeClickForHelp() {
    const pointsTypeElement = document.getElementById('pointstype');
    if (!pointsTypeElement) return;

    const mode = pointsTypeElement.textContent;
    // Use translation keys
    const helpTextKeys = {
        'V1': 'helpPeriodReplacementV1',
        'V2': 'helpPeriodReplacementV2',
        'V3': 'helpPeriodReplacementV3'
    };
    // Use fetchTranslation for title template
    const titleTemplate = fetchTranslation('helpPeriodReplacementTitle', currentLanguage);
    const title = formatString(titleTemplate, mode);

    const helpKey = helpTextKeys[mode] || 'helpPeriodReplacementDefault';
    // Use fetchTranslation for help text
    const helpText = fetchTranslation(helpKey, currentLanguage);

    showHelp(title, helpText);
}

// Handler for clicking outside the help section
function handleOutsideHelpClick(e) {
    // Check if the click is outside the help section itself AND outside the element that triggers it (#pointstype)
    if (!e.target.closest('.help-section') && !e.target.closest('#pointstype')) {
        hideHelp();
    }
}

// Note: attachHelpListeners() should be called during initialization (e.g., in initialization.js)