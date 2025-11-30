// Manages application settings, including loading/saving and UI toggles.

// Depends on:
// - DOM Elements: #advanced-audio-settings, .pointsselect, .pointstype, .voices, .rate, .pitch, .max-threads, .mergefiles,
//                 #rate-str, #pitch-str, #max-threads-int, #mergefiles-str, #stat-area,
//                 #text-area
// - Globals: threads_info (needs careful handling - might need refactoring later)
// - Functions: (Potentially) updateUI or similar if settings affect dropdowns directly (currently not the case)

// Global state for settings visibility (consider encapsulating later if needed)
let settingsVisible = false;

// Toggles the visibility of advanced settings sections
function toggleAdvancedSettingsVisibility() {
    settingsVisible = !settingsVisible; // Toggle state

    // Get the main container for advanced audio settings
    const advancedSettingsContainer = document.getElementById('advanced-audio-settings');

    // Toggle visibility class for the container
    if (advancedSettingsContainer) {
        advancedSettingsContainer.classList.toggle('hide', !settingsVisible);
        console.log(`Advanced settings visibility toggled. Visible: ${settingsVisible}`);
    } else {
        console.warn("Advanced audio settings container ('#advanced-audio-settings') not found.");
    }

    // Toggle the class on the body for CSS rules targeting rate/pitch sliders
    document.body.classList.toggle('settings-visible', settingsVisible);
}


// Saves current settings to localStorage
function saveSettings() {
    try {
        // Query elements within the function to ensure they exist
        const pointsSelect = document.querySelector('.pointsselect'); // Keep if still used
        const pointsType = document.querySelector('.pointstype'); // Keep if still used
        // Note: Voice saving might need adjustment based on the new structure (sl-voice, tl1-voice etc.)
        // This '.voices' selector is likely outdated. Consider saving each voice select individually if needed.
        // const voice = document.querySelector('.voices');
        const slRate = document.getElementById('sl-rate');
        const slPitch = document.getElementById('sl-pitch');
        // Add saving for TL rates/pitches if needed
        const max_threads = document.querySelector('.max-threads'); // Correct selector
        const mergefiles = document.querySelector('.mergefiles'); // Correct selector

        // Save slider values
        if (slRate) localStorage.setItem('sl_rate_value', slRate.value);
        if (slPitch) localStorage.setItem('sl_pitch_value', slPitch.value);
        if (max_threads) localStorage.setItem('max_threads_value', max_threads.value);
        if (mergefiles) localStorage.setItem('mergefiles_value', mergefiles.value);

        // Save text values associated with sliders (optional, can be derived)
        // const rate_str = document.querySelector('#rate-str'); // Outdated ID?
        // const pitch_str = document.querySelector('#pitch-str'); // Outdated ID?
        const threads_value_span = document.querySelector('.threads-value'); // Use class
        const merge_value_span = document.querySelector('.merge-value'); // Use class
        // Add null checks before accessing textContent
        // Note: Saving the textContent which includes translated text ("ALL", "pcs.") might cause issues
        // if the UI language changes before the next load. It's better to derive this text on load/change.
        // Removing saving of these textContents.
        // if (threads_value_span && threads_value_span.textContent) localStorage.setItem('threads_value_textContent', threads_value_span.textContent);
        // if (merge_value_span && merge_value_span.textContent) localStorage.setItem('merge_value_textContent', merge_value_span.textContent);


        // Save other settings if they exist
        if (pointsSelect && pointsSelect.value) localStorage.setItem('pointsSelect_value', pointsSelect.value);
        if (pointsType && pointsType.innerHTML) localStorage.setItem('pointsType_innerHTML', pointsType.innerHTML);
        // if (voice) localStorage.setItem('voice_value', voice.value); // Outdated

        // Save visibility state
        localStorage.setItem('settingsVisible', settingsVisible);
        console.log(`Settings saved. Visibility: ${settingsVisible}`);

    } catch (e) {
        console.error("Error saving settings to localStorage:", e);
    }
}

// Loads settings from localStorage and applies them
function loadSettings() {
    try {
        // Query elements within the function
        const pointsSelect = document.querySelector('.pointsselect'); // Keep if used
        const pointsType = document.querySelector('.pointstype'); // Keep if used
        // const voice = document.querySelector('.voices'); // Outdated
        const slRate = document.getElementById('sl-rate');
        const slPitch = document.getElementById('sl-pitch');
        // Add loading for TL rates/pitches if needed
        const max_threads = document.querySelector('.max-threads'); // Correct selector
        const mergefiles = document.querySelector('.mergefiles'); // Correct selector

        // Load slider values (Add null checks)
        const slRateValue = localStorage.getItem('sl_rate_value');
        if (slRate && slRateValue !== null) { slRate.value = slRateValue; }

        const slPitchValue = localStorage.getItem('sl_pitch_value');
        if (slPitch && slPitchValue !== null) { slPitch.value = slPitchValue; }

        const maxThreadsValue = localStorage.getItem('max_threads_value');
        if (max_threads && maxThreadsValue !== null) { max_threads.value = maxThreadsValue; }

        const mergefilesValue = localStorage.getItem('mergefiles_value');
        if (mergefiles && mergefilesValue !== null) { mergefiles.value = mergefilesValue; }


        // Load text values associated with sliders (optional, can be derived by triggering change handler)
        // Removed loading of textContent as it's better derived. The initialization script already
        // calls handleSliderChange which will set the correct initial text based on loaded values and current language.
        // const threads_value_span = document.querySelector('.threads-value'); // Use class
        // const merge_value_span = document.querySelector('.merge-value'); // Use class
        // const threadsTextContent = localStorage.getItem('threads_value_textContent');
        // if (threads_value_span && threadsTextContent !== null) { threads_value_span.textContent = threadsTextContent; }
        // const mergeTextContent = localStorage.getItem('merge_value_textContent');
        // if (merge_value_span && mergeTextContent !== null) { merge_value_span.textContent = mergeTextContent; }


        // Load other settings if they exist (Add null checks)
        const pointsSelectValue = localStorage.getItem('pointsSelect_value');
        if (pointsSelect && pointsSelectValue !== null) { pointsSelect.value = pointsSelectValue; }

        const pointsTypeInnerHTML = localStorage.getItem('pointsType_innerHTML');
        if (pointsType && pointsTypeInnerHTML !== null) { pointsType.innerHTML = pointsTypeInnerHTML; }
        // if (voice && localStorage.getItem('voice_value')) { voice.value = localStorage.getItem('voice_value'); } // Outdated

        // Load visibility state
        const savedVisibility = localStorage.getItem('settingsVisible');
        if (savedVisibility !== null) { // Check for null explicitly
            settingsVisible = savedVisibility === 'true';
        } else {
            settingsVisible = false; // Default to hidden if not saved
        }
        console.log(`Settings loaded. Initial visibility: ${settingsVisible}`);

        // Apply initial visibility based on loaded settings
        const advancedSettingsContainer = document.getElementById('advanced-audio-settings');
        if (advancedSettingsContainer) {
            advancedSettingsContainer.classList.toggle('hide', !settingsVisible);
        } else {
            // This warning might appear if loadSettings runs before the element is fully parsed,
            // but the toggle should still work later if the element exists then.
            console.warn("Advanced audio settings container ('#advanced-audio-settings') not found during load.");
        }

        // Apply the class to the body based on loaded state
        document.body.classList.toggle('settings-visible', settingsVisible);




    } catch (e) {
        console.error("Error loading settings from localStorage:", e);
    }
}

