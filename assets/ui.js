// Contains functions for UI manipulation, event handling, and UI helpers

// Depends on: updateUI, currentLanguage (global from main.js), ensureTranslationsAvailable (translation_api.js),
//             fetchTranslation (sync from translation_api.js), createLanguageDropdown, createLanguageSelector (language_dropdown.js - sync),
//             updateVoiceDropdown (voice-dropdown-menu.js - sync), attachEventListeners (event_listeners.js)

// Make setLanguage async to wait for translations
async function setLanguage(lang) {
  currentLanguage = lang;
  // Store preference
  try {
    localStorage.setItem('uiLanguage', lang);
  } catch (e) {
    console.warn("Could not save UI language preference to localStorage:", e);
  }
  // Ensure translations are loaded BEFORE updating the UI
  // ensureTranslationsAvailable is defined in translation_api.js
  await ensureTranslationsAvailable(lang);
  updateUI(); // Trigger the synchronous update process
}

// Function to translate static UI elements (now synchronous)
function translateUIElements() {
  const uiElements = {
    // Header & General
    pageTitle: document.getElementById('page-title'), // For browser tab title
    pageTitleH1: document.getElementById('page-title-h1'), // Visible H1
    settingsButtonTitle: document.getElementById('settings-button'), // Attribute: title
    infoButtonTitle: document.getElementById('info-button'), // Attribute: title
    uiLanguageText: document.getElementById('ui-language-text'), // Span inside label
    
    // Prompt Section (NEW)
    promptSectionTitle: document.getElementById('prompt-section-title'),
    promptIntro: document.getElementById('prompt-intro'),
    promptRole: document.getElementById('prompt-role'),
    promptRulesTitle: document.getElementById('prompt-rules-title'),
    promptRule1: document.getElementById('prompt-rule-1'),
    promptRule2: document.getElementById('prompt-rule-2'),
    promptRule3: document.getElementById('prompt-rule-3'),
    promptRule4: document.getElementById('prompt-rule-4'),
    promptRule5: document.getElementById('prompt-rule-5'),
    promptExampleInputTitle: document.getElementById('prompt-ex-in-title'),
    promptExampleInput: document.getElementById('prompt-ex-in'),
    promptExampleOutputTitle: document.getElementById('prompt-ex-out-title'),
    promptExampleOutput: document.getElementById('prompt-ex-out'),
    promptInsertText: document.getElementById('prompt-insert-text'),
    promptFailProofNote: document.getElementById('prompt-fail-proof'),

    // Source Language (Renamed labels slightly in translations)
    slLabel: document.getElementById('sl-label'),
    slVoiceLabel: document.getElementById('sl-voice-label'),
    slRateLabel: document.getElementById('sl-rate-label'),
    slPitchLabel: document.getElementById('sl-pitch-label'),
    
    // Advanced Settings
    advancedAudioSettingsTitle: document.getElementById('advanced-audio-settings-title'),
    threadsLabel: document.getElementById('threads-label'),
    mergeByLabel: document.getElementById('merge-by-label'),
    insertFileButton: document.getElementById('insert-file-button'),
    
    // Text Area & Buttons
    enterSourceTextLabel: document.getElementById('enter-source-text-label'),
    enterText: document.getElementById('source-text'), // Attribute: placeholder
    analyzeButton: document.getElementById('analyze-characters-button'), // NEW
    generateButton: document.getElementById('generate-button'),
    reloadPageButton: document.getElementById('reload-page-button'),
    
    // Progress & Status
    progressTranslatedLabel: document.getElementById('progress-translated-label'),
    progressEtaLabel: document.getElementById('progress-eta-label'),
    progressEtaValue: document.getElementById('progress-eta-value'),
    translationFinishedMessage: document.getElementById('translation-finished-message'),
    statAreaPlaceholder: document.getElementById('stat-area'), // Attribute: placeholder
    
    // Firefox Warning
    firefoxWarningTitle: document.getElementById('firefox-warning-title'),
    firefoxWarningBody: document.getElementById('firefox-warning-body'),
    
    // Info Modal
    infoModalTitle: document.getElementById('info-modal-title'),
    infoModalText1: document.getElementById('info-modal-text1'),
    infoModalText2: document.getElementById('info-modal-text2'),
    infoModalLink: document.getElementById('info-modal-link'),
  };

  // Helper to get translation (now synchronous)
  const getTranslation = (key) => {
    return fetchTranslation(key, currentLanguage);
  };

  for (const key in uiElements) {
    if (uiElements.hasOwnProperty(key)) {
      const element = uiElements[key];
      if (element) {
        let translatedText;
        // Handle specific keys/attributes
        if (key === 'pageTitle' || key === 'pageTitleH1') {
          translatedText = getTranslation('pageTitle');
          element.textContent = translatedText;
        } else if (key === 'settingsButtonTitle') {
          translatedText = getTranslation('titleSettingsButton');
          element.title = translatedText;
        } else if (key === 'infoButtonTitle') {
          translatedText = getTranslation('titleInfoButton');
          element.title = translatedText;
        } else if (key === 'enterText' || key === 'statAreaPlaceholder') {
          translatedText = getTranslation(key === 'enterText' ? 'enterText' : 'placeholderStatArea');
          element.placeholder = translatedText;
        } else if (key === 'progressTranslatedLabel') {
          translatedText = getTranslation('translated');
          element.textContent = translatedText;
        } else if (key === 'progressEtaLabel') {
          translatedText = getTranslation('eta');
          element.textContent = translatedText;
        } else if (key === 'progressEtaValue') {
          const calculatingText = getTranslation('statusCalculating');
          if (!element.textContent || element.textContent === calculatingText || element.textContent === '[statusCalculating]') {
            element.textContent = calculatingText;
          }
        } else if (key === 'firefoxWarningBody') {
          const bodyText = getTranslation('firefoxWarningBody');
          element.textContent = bodyText;
        } else if (key.endsWith('RateLabel')) {
          translatedText = getTranslation('labelRate');
          element.textContent = translatedText;
        } else if (key.endsWith('PitchLabel')) {
          translatedText = getTranslation('labelPitch');
          element.textContent = translatedText;
        } else if (key.endsWith('VoiceLabel') && key !== 'headerVoiceLabel') {
            translatedText = getTranslation('labelVoice');
            element.textContent = translatedText;
        } else if (key === 'uiLanguageText') {
          translatedText = getTranslation('uiLanguage');
          element.textContent = translatedText + ':';
        } else {
          // Default: Set textContent
          let translationKey = key;
          // Map legacy keys if needed, though we try to match IDs to keys now
          if (key === 'slLabel') translationKey = 'sourceLabel';
          else if (key === 'threadsLabel') translationKey = 'labelThreads';
          else if (key === 'mergeByLabel') translationKey = 'labelMergeBy';

          translatedText = getTranslation(translationKey);
          if (translatedText !== undefined && translatedText !== null) {
            element.textContent = translatedText;
          }
        }
      }
    }
  }
    // Update slider text values
    document.querySelectorAll('.mergefiles').forEach(slider => {
      const valueSpan = slider.closest('.slider-container')?.querySelector('.merge-value');
      if (valueSpan) {
        const value = slider.value;
        const allText = getTranslation('textAll');
        const pcsText = getTranslation('textPieces');
        valueSpan.textContent = value == 100 ? allText : `${value} ${pcsText}`;
      }
    });
}

// Function to rebuild language and voice dropdowns
function rebuildLanguageDropdowns() {
  // Only Source Language needed for this mode
  const containers = [
    { id: 'sl-container', langId: 'sl' }
  ];
  const uiLangContainer = document.getElementById('language-selector-container');

  // Store current values
  const currentValues = {};
  containers.forEach(c => {
    const select = document.getElementById(c.langId);
    if (select) {
      currentValues[c.langId] = select.value;
    }
  });

  const processRow = (containerId, langId) => {
      const rowContainer = document.getElementById(containerId);
      if (!rowContainer) return;

      const wrapper = rowContainer.querySelector('.language-and-voice-container');
      if (!wrapper) return;

      const newLangSelect = createLanguageDropdown(langId);
      const oldLangSelect = wrapper.querySelector(`select#${langId}`);
      const voiceLabel = wrapper.querySelector(`#${langId}-voice-label`);

      if (oldLangSelect) {
          oldLangSelect.replaceWith(newLangSelect);
      } else if (voiceLabel) {
          wrapper.insertBefore(newLangSelect, voiceLabel);
      }

      if (currentValues[langId]) {
          newLangSelect.value = currentValues[langId];
      }

      const voiceSelect = document.getElementById(`${langId}-voice`);
      if (voiceSelect && typeof updateVoiceDropdown === 'function') {
          updateVoiceDropdown(voiceSelect, newLangSelect.value);
      }
  };

  containers.forEach(c => processRow(c.id, c.langId));

  if (uiLangContainer) {
    const newUiLangSelect = createLanguageSelector();
    const oldUiLangSelect = uiLangContainer.querySelector('select#ui-language-selector');
    if (oldUiLangSelect) oldUiLangSelect.replaceWith(newUiLangSelect); else uiLangContainer.appendChild(newUiLangSelect);
    newUiLangSelect.value = currentLanguage;
  }
}

function updateUI() {
  translateUIElements();
  rebuildLanguageDropdowns();
  attachEventListeners();
}

// Stub functions for target language handling (not used in this mode but kept for compatibility)
function showTargetLang(containerId) {}
function hideTargetLang(containerId) {}

function updateProgressTitle(titleKey) {
  const progressTitleElement = document.getElementById('progress-title');
  if (progressTitleElement) {
      progressTitleElement.textContent = fetchTranslation(titleKey, currentLanguage);
      progressTitleElement.classList.remove('hide');
  }
}

function displayTranslatedBatch(batch, translationsData, sourceLang, targetLangs) {
    // Not used in Character Mode
}
