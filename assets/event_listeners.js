// Contains the main event listener attachment function and its direct handlers.

// Depends on:
// - Functions:
//   - handleGenerateButtonClick (app_logic.js)
//   - toggleTheme, openBookView, reloadPage (ui_helpers.js)
//   - saveEpub (epub_generator.js)
//   - showTargetLang, hideTargetLang (ui.js)
//   - updateVoiceDropdown (voice-dropdown-menu.js)
//   - insertTextIntoSourceArea, convertFb2ToTxt, convertEpubToTxt, convertZipToTxt (texts_converter.js)
//   - toggleAdvancedSettingsVisibility, saveSettings (settings.js) // Added dependencies
//   - attachHelpListeners (help_system.js) // Added dependency
//   - attachInfoModalListeners (info_modal.js) // Added dependency
//   - fetchTranslation (translation_api.js) // Added dependency

// Helper function to attach event listeners
function attachEventListeners() {
  // --- Button Listeners ---
  const generateButton = document.getElementById('generate-button');
  // handleGenerateButtonClick is defined in app_logic.js
  if (generateButton) {
      generateButton.removeEventListener('click', handleGenerateButtonClick); // Prevent duplicates
      generateButton.addEventListener('click', handleGenerateButtonClick);
  }

  // Added: Insert File Button Listener
  const insertFileButton = document.getElementById('insert-file-button');
  if (insertFileButton) {
    insertFileButton.removeEventListener('click', handleInsertFileClick); // Prevent duplicates
    insertFileButton.addEventListener('click', handleInsertFileClick);
  }

  // --- Settings Button Listener ---
  const settingsButton = document.getElementById('settings-button'); // Use the new ID from HTML
  if (settingsButton) {
    // toggleAdvancedSettingsVisibility is defined in settings.js
    settingsButton.removeEventListener('click', toggleAdvancedSettingsVisibility); // Prevent duplicates
    settingsButton.addEventListener('click', toggleAdvancedSettingsVisibility);
  }

  // openBookView, reloadPage are defined in ui_helpers.js
  const openBookViewButton = document.getElementById('open-book-view-button');
  if (openBookViewButton) {
      openBookViewButton.removeEventListener('click', openBookView);
      openBookViewButton.addEventListener('click', openBookView);
  }

  const saveEpubButton = document.getElementById('save-epub-button');
  // saveEpub is defined in epub_generator.js
  if (saveEpubButton) {
      saveEpubButton.removeEventListener('click', saveEpub);
      saveEpubButton.addEventListener('click', saveEpub);
  }

  const reloadPageButton = document.getElementById('reload-page-button');
  if (reloadPageButton) {
      reloadPageButton.removeEventListener('click', reloadPage);
      reloadPageButton.addEventListener('click', reloadPage);
  }

  // --- Add/Remove Language Button Listeners ---

  // Listener for the initial '+' button next to source language
  const addFirstTargetButton = document.getElementById('add-first-target-button');
  if (addFirstTargetButton) {
    addFirstTargetButton.removeEventListener('click', handleAddFirstTarget); // Prevent duplicates
    addFirstTargetButton.addEventListener('click', handleAddFirstTarget);
  }

  // Listeners for '+' buttons within target language containers
  document.querySelectorAll('.add-lang-button:not(#add-first-target-button)').forEach(button => {
    const targetContainerId = button.dataset.targetContainerId; // Use data attribute
    if (targetContainerId) {
      button.removeEventListener('click', showTargetLangHandler); // Remove previous listener if any
      button.addEventListener('click', showTargetLangHandler); // Add listener
    }
  });

  // Listeners for '-' buttons within target language containers
  document.querySelectorAll('.remove-lang-button').forEach(button => {
    const targetContainerId = button.dataset.targetContainerId; // Use data attribute
    if (targetContainerId) {
      button.removeEventListener('click', hideTargetLangHandler); // Remove previous listener if any
      button.addEventListener('click', hideTargetLangHandler); // Add listener
    }
  });

  // --- Language Dropdown Change Listeners ---
  const languageSelects = document.querySelectorAll('#sl, #tl1, #tl2, #tl3, #tl4');
  languageSelects.forEach(select => {
    // Remove existing listener to prevent duplicates if attachEventListeners is called multiple times
    select.removeEventListener('change', handleLanguageChange);
    // Add the new listener
    select.addEventListener('change', handleLanguageChange);
  });

  // --- Slider Change Listeners (Rate, Pitch, Threads, Merge) ---
  const sliders = document.querySelectorAll('.rate-slider, .pitch-slider, .max-threads, .mergefiles'); // Added .max-threads, .mergefiles
  sliders.forEach(slider => {
    slider.removeEventListener('input', handleSliderChange); // Prevent duplicates
    slider.addEventListener('input', handleSliderChange);
    // Trigger initial update for threads/merge sliders if they exist
    if (slider.classList.contains('max-threads') || slider.classList.contains('mergefiles')) {
        handleSliderChange({ target: slider });
    }
  });

  // --- Listeners for Editable Rate/Pitch Values ---
  attachValueEditorListeners();

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.removeEventListener('change', handleFileInsert); // Prevent duplicates
    fileInput.addEventListener('change', handleFileInsert);
  }
  // --- End File Input Listener ---

  // --- Before Unload Listener for Saving Settings ---
  // saveSettings is defined in settings.js
  window.removeEventListener('beforeunload', saveSettings); // Prevent duplicates
  window.addEventListener('beforeunload', saveSettings);
  // --- End Before Unload Listener ---

  // --- Help System Listeners ---
  // attachHelpListeners is defined in help_system.js
  if (typeof attachHelpListeners === 'function') {
      attachHelpListeners();
  } else {
      console.warn("attachHelpListeners function not found.");
  }
  // --- End Help System Listeners ---

  // --- Info Modal Listeners ---
  if (typeof attachInfoModalListeners === 'function') {
      attachInfoModalListeners();
  } else {
      console.warn("attachInfoModalListeners function not found.");
  }


  // UI language selector listener is attached within createLanguageSelector in language_dropdown.js
}

// --- Event Handlers ---

// Simple handler to trigger file input click
function handleInsertFileClick() {
  document.getElementById('file-input')?.click();
}



// Handler for the initial '+' button click
// Depends on: showTargetLang (ui.js)
function handleAddFirstTarget() {
  showTargetLang('tl1-container');
  // Hide this button after it's clicked
  document.getElementById('add-first-target-button')?.classList.add('hide');
}

// Handler for language dropdown changes
// Depends on: updateVoiceDropdown (voice-dropdown-menu.js)
function handleLanguageChange(event) {
  const langSelect = event.target;
  const selectedLangCode = langSelect.value;
  const langSelectId = langSelect.id; // e.g., "sl", "tl1"

  // Determine the corresponding voice select ID
  const voiceSelectId = langSelectId + '-voice'; // e.g., "sl-voice", "tl1-voice"
  const voiceSelect = document.getElementById(voiceSelectId);

  if (voiceSelect && typeof updateVoiceDropdown === 'function') {
    console.log(`Language changed for ${langSelectId} to ${selectedLangCode}. Updating ${voiceSelectId}.`);
    updateVoiceDropdown(voiceSelect, selectedLangCode);
  } else {
    console.warn(`Could not find voice select '${voiceSelectId}' or updateVoiceDropdown function.`);
  }
}

// Handler for add language button clicks (for TL2, TL3, TL4)
// Depends on: showTargetLang (ui.js)
function showTargetLangHandler(event) {
  const targetContainerId = event.currentTarget.dataset.targetContainerId;
  if (targetContainerId) {
    showTargetLang(targetContainerId);
  }
}

// Handler for remove language button clicks
// Depends on: hideTargetLang (ui.js)
function hideTargetLangHandler(event) {
  const targetContainerId = event.currentTarget.dataset.targetContainerId;
  if (targetContainerId) {
    hideTargetLang(targetContainerId);
  }
}

// Handler for slider changes
function handleSliderChange(event) {
  const slider = event.target;
  const value = slider.value;
  let valueSpan;
  let textContent;

  // Find the corresponding value span relative to the slider
  const parent = slider.closest('.slider-container') || slider.parentElement;
  if (!parent) return; // Exit if parent not found

  if (slider.classList.contains('rate-slider')) {
    valueSpan = parent.querySelector('.rate-value');
    const prefix = value > 0 ? '+' : '';
    textContent = `${prefix}${value}%`;
  } else if (slider.classList.contains('pitch-slider')) {
    valueSpan = parent.querySelector('.pitch-value');
    const prefix = value > 0 ? '+' : '';
    textContent = `${prefix}${value}Hz`;
  } else if (slider.classList.contains('max-threads')) {
    valueSpan = parent.querySelector('.threads-value');
    textContent = `${value}`; // Display integer value
  } else if (slider.classList.contains('mergefiles')) {
    valueSpan = parent.querySelector('.merge-value');
    // Translate "ALL" and "pcs." using fetchTranslation
    const allText = fetchTranslation('textAll', currentLanguage);
    const pcsText = fetchTranslation('textPieces', currentLanguage);
    textContent = value == 100 ? allText : `${value} ${pcsText}`;
  }

  if (valueSpan) {
    valueSpan.textContent = textContent;
  } else {
      // console.warn("Could not find value span for slider:", slider.id); // Optional warning
  }
}

// --- Event Handlers for Editable Rate/Pitch Values ---

function attachValueEditorListeners() {
    document.querySelectorAll('.value-display').forEach(display => {
        display.removeEventListener('click', handleValueDisplayClick); // Prevent duplicates
        display.addEventListener('click', handleValueDisplayClick);
    });

    document.querySelectorAll('.value-input').forEach(input => {
        input.removeEventListener('blur', handleValueInputBlur);
        input.addEventListener('blur', handleValueInputBlur);
        input.removeEventListener('keydown', handleValueInputKeydown);
        input.addEventListener('keydown', handleValueInputKeydown);
    });
}

function handleValueDisplayClick(event) {
    const displaySpan = event.currentTarget;
    const container = displaySpan.closest('.value-container');
    if (!container) return;

    const input = container.querySelector('.value-input');
    const slider = container.closest('.slider-container')?.querySelector('input[type="range"]');

    if (!input || !slider) return;

    // Show input, hide display
    displaySpan.classList.add('hide');
    input.classList.remove('hide');

    // Set input value from the slider's current value and focus
    input.value = slider.value;
    input.focus();
    input.select();
}

function handleValueInputBlur(event) {
    updateValueFromInput(event.currentTarget);
}

function handleValueInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission if any
        updateValueFromInput(event.currentTarget);
    } else if (event.key === 'Escape') {
        cancelValueEdit(event.currentTarget);
    }
}

function updateValueFromInput(input) {
    const container = input.closest('.value-container');
    if (!container) return;
    
    const displaySpan = container.querySelector('.value-display');
    const slider = container.closest('.slider-container')?.querySelector('input[type="range"]');
    
    if (!displaySpan || !slider) return;

    // Get value, validate, and clamp it
    let newValue = parseInt(input.value, 10);
    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);

    if (isNaN(newValue)) {
        newValue = slider.value; // Revert if not a number
    } else {
        newValue = Math.max(min, Math.min(max, newValue)); // Clamp between min and max
    }

    slider.value = newValue;
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    input.classList.add('hide');
    displaySpan.classList.remove('hide');
}

function cancelValueEdit(input) {
    const container = input.closest('.value-container');
    if (!container) return;

    const displaySpan = container.querySelector('.value-display');
    if (!displaySpan) return;

    input.classList.add('hide');
    displaySpan.classList.remove('hide');
}

// --- End Event Handlers for Editable Values ---

// Handler for file input changes (MOVED FROM texts_converter.js)
// Depends on: insertTextIntoSourceArea, convertFb2ToTxt, convertEpubToTxt, convertZipToTxt (from texts_converter.js)
// Depends on: formatString (assumed helper), translations, currentLanguage, fetchTranslation
async function handleFileInsert(event) { // Made async to handle await for EPUB/ZIP
  const files = event.target.files;
  if (!files || files.length === 0) {
    return; // No file selected
  }

    // Clear the text area before inserting content from new file(s)
    // Exception: ZIP files handle clearing internally to allow appending multiple files within the zip.
  const sourceTextArea = document.getElementById('source-text');
    if (sourceTextArea && !files[0].name.toLowerCase().endsWith('.zip')) {
         sourceTextArea.value = '';
    }


    // Process potentially multiple files (though current input is single)
    // Using Promise.all to handle asynchronous operations like EPUB conversion
    const processingPromises = [];

    for (const file of files) {
        const fileNameLower = file.name.toLowerCase();
        console.log(`Processing file: ${file.name}`); // Log file being processed

        if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.ini')) {
            processingPromises.push(
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            // insertTextIntoSourceArea is defined in texts_converter.js
                            insertTextIntoSourceArea(e.target.result); // Insert text content
                            resolve();
                        } catch (error) {
                            console.error(`Error inserting text from ${file.name}:`, error);
                            reject(error);
                        }
                    };
                    reader.onerror = (e) => {
                        console.error(`Error reading file ${file.name}:`, e);
                        // Use fetchTranslation for template
                        const alertMsgTemplate = fetchTranslation('alertFileReadError', currentLanguage);
                        alert(formatString(alertMsgTemplate, file.name)); // Basic error feedback
                        reject(e);
                    };
                    reader.readAsText(file);
                })
            );
        } else if (fileNameLower.endsWith('.fb2')) {
            processingPromises.push(
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            // convertFb2ToTxt and insertTextIntoSourceArea are defined in texts_converter.js
                            const text = convertFb2ToTxt(e.target.result);
                            insertTextIntoSourceArea(text);
                            resolve();
                        } catch (error) {
                            console.error(`Error converting FB2 ${file.name}:`, error);
                            // Use fetchTranslation for template
                            const alertMsgTemplate = fetchTranslation('alertFb2Error', currentLanguage);
                            alert(formatString(alertMsgTemplate, file.name));
                            reject(error);
                        }
                    };
                    reader.onerror = (e) => {
                        console.error(`Error reading file ${file.name}:`, e);
                        // Use fetchTranslation for template
                        const alertMsgTemplate = fetchTranslation('alertFileReadError', currentLanguage);
                        alert(formatString(alertMsgTemplate, file.name));
                        reject(e);
                    };
                    reader.readAsText(file);
                })
            );
        } else if (fileNameLower.endsWith('.epub')) {
            // convertEpubToTxt and insertTextIntoSourceArea are defined in texts_converter.js
             processingPromises.push(
                convertEpubToTxt(file) // Pass the File object directly
                    .then(text => {
                         insertTextIntoSourceArea(text); // Insert the extracted text
                    })
                    .catch(error => {
                        console.error(`Error converting EPUB ${file.name}:`, error);
                        // Use fetchTranslation for template
                        const alertMsgTemplate = fetchTranslation('alertEpubError', currentLanguage);
                        alert(formatString(alertMsgTemplate, file.name));
                        // Don't reject the main promise, just log the error
                    })
            );
        } else if (fileNameLower.endsWith('.zip')) {
            // convertZipToTxt is defined in texts_converter.js
            processingPromises.push(
                 Promise.resolve(convertZipToTxt(file)) // Wrap in Promise.resolve in case it's not async
                    .catch(error => {
                        console.error(`Error processing ZIP ${file.name}:`, error);
                        // convertZipToTxt should ideally handle its own alerts, but add a generic one here if needed
                        // const alertMsg = fetchTranslation('alertZipProcError', currentLanguage);
                        // alert(alertMsg);
                        // Don't reject the main promise, just log the error
                    })
            );
        } else {
            console.log(`File type not supported for insertion: ${file.name}`);
            // Use fetchTranslation for template
            const alertMsgTemplate = fetchTranslation('alertFileTypeNotSupported', currentLanguage);
            alert(formatString(alertMsgTemplate, file.name.split('.').pop()));
            // Add a resolved promise for unsupported types to not break Promise.all
             processingPromises.push(Promise.resolve());
        }
    } // End loop through files

    try {
        await Promise.all(processingPromises);
        console.log("All selected files processed.");
    } catch (error) {
        console.error("An error occurred during file processing:", error);
        // General error message if any promise rejected unexpectedly
        // Use fetchTranslation for alert
        const alertMsg = fetchTranslation('alertGenericFileError', currentLanguage);
        alert(alertMsg);
    }

  // Reset the input value to allow selecting the same file again
  event.target.value = null;
}
