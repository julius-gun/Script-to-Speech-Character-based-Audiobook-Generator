// Contains the main initialization logic executed when the DOM is ready.

// --- Initialization ---

// Modify DOMContentLoaded to set initial UI language, load translations, and populate dropdowns
// Make the listener async to await ensureTranslationsAvailable
document.addEventListener('DOMContentLoaded', async () => {
  // Calculate globals dependent on languageData
  // Note: languageCodes and maxCodeLength are declared globally in main.js for now.
  // Consider passing them or recalculating if they are only needed here.
  languageCodes = languageData.map(lang => lang.Code); // Get language codes from languageData
  const allCodes = languageData.map(lang => lang.Code);
  allCodes.push('auto'); // Include 'auto' for calculation
  maxCodeLength = Math.max(...allCodes.map(code => code.length));


  if (navigator.userAgent.toLowerCase().includes('firefox')) {
    const warningDiv = document.getElementById('firefox-warning');
    if (warningDiv) {
      warningDiv.classList.remove('hide');
    }
  }

  // Load UI language preference
  let preferredLanguage = null;
  try {
    preferredLanguage = localStorage.getItem('uiLanguage');
  } catch (e) {
    console.warn("Could not read UI language preference from localStorage:", e);
  }

  if (preferredLanguage && languageCodes.includes(preferredLanguage)) {
    currentLanguage = preferredLanguage;
  } else {
    // Fallback to browser language if no preference stored or invalid
    const userPreferredLanguage = navigator.language || navigator.userLanguage;
    let browserLangCode = userPreferredLanguage; // e.g., en-US
    if (!languageCodes.includes(browserLangCode)) {
      browserLangCode = userPreferredLanguage.split('-')[0]; // e.g., en
    }
    if (browserLangCode && languageCodes.includes(browserLangCode)) {
      currentLanguage = browserLangCode;
    } else {
      currentLanguage = 'en'; // Ultimate fallback
    }
  }
  console.log(`Initial UI Language set to: ${currentLanguage}`); // Log the determined language

  // --- Pre-load translations for the initial language ---
  // ensureTranslationsAvailable is defined in translation_api.js
  console.log(`Pre-loading translations for ${currentLanguage}...`);
  await ensureTranslationsAvailable(currentLanguage);
  console.log(`Translations for ${currentLanguage} should now be loaded.`);
  // --- End Pre-load ---


  // --- Initial Population (will be refined by updateUI) ---
  // Add language selector to the page (placeholder, will be replaced by updateUI)
  const languageSelectorContainer = document.getElementById('language-selector-container');
  const languageSelectorLabel = document.querySelector('#language-selector-container label');
  languageSelectorLabel.htmlFor = 'ui-language-selector';
  // Create and append a temporary selector, updateUI will replace it correctly styled.
  const tempUiSelector = document.createElement('select');
  tempUiSelector.id = 'ui-language-selector';
  languageSelectorContainer.appendChild(tempUiSelector);
  // --- Load Settings (Before Initial UI Update) ---
  if (typeof loadSettings === 'function') {
    loadSettings(); // Load saved settings (including visibility)
  } else {
    console.warn("loadSettings function not found.");
  }
  // --- End Load Settings ---




  // --- Call updateUI to correctly populate language dropdowns and translate ---
  // updateUI is defined in ui.js 
  updateUI(); // This will now use the pre-loaded translations synchronously

  // --- Populate Voice Dropdowns ---
  // REMOVED: populateVoiceDropdowns(); // Handled within updateUI

  // Attach event listeners after the initial UI is built
  // attachEventListeners is defined in event_listeners.js
  attachEventListeners(); // Attaches all listeners, including settings button

  // --- Initialize Slider Values ---
  // Ensure sliders show their initial values correctly (rate/pitch/threads/merge)
  // handleSliderChange is defined in event_listeners.js
  document.querySelectorAll('.rate-slider, .pitch-slider, .max-threads, .mergefiles').forEach(slider => {
    // Check if the slider exists before trying to trigger the handler
    if (slider && typeof handleSliderChange === 'function') {
      // Find the associated value span and trigger the handler
      const parent = slider.closest('.slider-container') || slider.parentElement; // Find parent container
      const valueSpan = parent?.querySelector('.rate-value, .pitch-value, .threads-value, .merge-value');
      if (valueSpan) {
      handleSliderChange({ target: slider }); // Trigger update using the handler
      } else {
          console.warn("Could not find value span for slider:", slider.id);
      }
    }
  });

  // REMOVED: loadSettings(); // Moved earlier before updateUI
});