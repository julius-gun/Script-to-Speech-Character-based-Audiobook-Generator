
// Helper function to filter voices based on selected language code
// selectedLangCode can be 'auto', a base code like 'en', or a specific code like 'en-US'
function filterVoices(allVoices, selectedLangCode) {
    if (selectedLangCode === 'auto') {
        return allVoices; // Show all for auto-detect (relevant for source language)
    }
    if (!selectedLangCode) {
        return []; // No language selected, show no voices
    }

    const selectedBaseLang = selectedLangCode.split('-')[0]; // e.g., 'es' from 'es-419' or 'es' from 'es'

    // --- Special Handling for Regional Group Codes ---
    if (selectedLangCode === 'es-419') {
        // Match all Spanish voices EXCEPT es-ES and es-US
        return allVoices.filter(voice => {
            const voiceLangCountry = voice.value.split(',')[0].trim(); // e.g., "es-MX"
            const voiceBaseLang = voiceLangCountry.split('-')[0]; // e.g., "es"
            return voiceBaseLang === 'es' && voiceLangCountry !== 'es-ES' && voiceLangCountry !== 'es-US';
        });
    }
    // Add other regional group codes here if needed (e.g., zh-Hant -> zh-HK, zh-TW)

    // --- General Filtering Logic ---
    const filtered = allVoices.filter(voice => {
        const voiceLangCountry = voice.value.split(',')[0].trim(); // e.g., "en-US", "nb-NO"
        const voiceBaseLang = voiceLangCountry.split('-')[0]; // e.g., "en", "nb"

        // Check if the selected code contains a region/script (e.g., "en-US", "nb-NO")
        if (selectedLangCode.includes('-')) {
            // Exact match required (e.g., selected "en-US" matches only "en-US,...")
            return voiceLangCountry === selectedLangCode;
        } else {
            // Base language match (e.g., selected "no" should match "nb-NO")
            // (e.g., selected "es" should match "es-ES", "es-MX", etc.)

            // Special case: Map selected 'no' to voice base 'nb'
            if (selectedLangCode === 'no' && voiceBaseLang === 'nb') {
                return true;
            }

            // General base language match: selected 'en' matches 'en-US', 'en-GB', etc.
            // selected 'es' matches 'es-ES', 'es-MX', etc.
            return voiceBaseLang === selectedLangCode;
        }
    });
    return filtered;
}

// Groups voices by the primary language code (e.g., "en" from "en-US")
function groupVoicesByLanguage(voices) {
    const grouped = {};
    voices.forEach(voice => {
        // Extract lang-COUNTRY code (e.g., "en-US")
        const langCodeCountry = voice.value.split(',')[0].trim();
        // Extract primary lang code (e.g., "en")
        const langCode = langCodeCountry.split('-')[0];
        if (!grouped[langCode]) {
            grouped[langCode] = [];
        }
        // Sort voices within a language group alphabetically by full value
        grouped[langCode].push(voice);
        grouped[langCode].sort((a, b) => a.value.localeCompare(b.value));
    });
    // Sort language groups alphabetically by language code
    const sortedGrouped = Object.keys(grouped).sort().reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
    }, {});
    return sortedGrouped;
}


// Formats the voice option text as: Flag lang-COUNTRY, VoiceName (GenderSymbol, Attributes)
function formatVoiceOption(voice) {
    const value = voice.value; // e.g., "de-DE, FlorianMultilingualNeural"
    const gender = voice.gender; // e.g., "Male"
    const attributes = voice.attributes; // e.g., "General, Friendly, Positive"

    const parts = value.split(',').map(part => part.trim());
    const langCodeCountry = parts[0]; // e.g., "de-DE"
    const voiceName = parts[1]; // e.g., "FlorianMultilingualNeural"

    let countryFlag = '';
    const langCodeParts = langCodeCountry.split('-');
    // const langCode = langCodeParts[0]; // Not directly used in final string format
    const countryCode = langCodeParts.length > 1 ? langCodeParts[1] : null; // Handle cases like 'en' vs 'en-US'

    if (countryCode) {
        countryFlag = getFlagEmoji(countryCode);
    } else {
        // Optional: Provide a default or generic flag/icon for languages without a country code
        // countryFlag = '🏳️'; // Example: White flag
    }

    let genderSymbol = '';
    if (gender === 'Male') {
        genderSymbol = '♂';
    } else if (gender === 'Female') {
        genderSymbol = '♀';
    }
    // else: No symbol if gender is not Male or Female

    // Construct the details string part: (GenderSymbol, Attributes)
    let details = '';
    if (genderSymbol && attributes) {
        details = `(${genderSymbol}, ${attributes})`;
    } else if (genderSymbol) {
        details = `(${genderSymbol})`;
    } else if (attributes) {
        details = `(${attributes})`; // Should likely not happen based on data, but handle defensively
    }

    // Combine all parts: Flag lang-COUNTRY, VoiceName (Details)
    // Add space after flag only if flag exists
    const flagPart = countryFlag ? `${countryFlag} ` : '';
    const detailsPart = details ? ` ${details}` : ''; // Add space before details only if details exist

    return `${flagPart}${langCodeCountry}, ${voiceName}${detailsPart}`;
}


// Converts a country code (like "US") to a flag emoji
function getFlagEmoji(countryCode) {
    // Country code should be exactly 2 uppercase letters
    if (!countryCode || countryCode.length !== 2) return '';
    try {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0)); // Offset for regional indicator symbols
        return String.fromCodePoint(...codePoints);
    } catch (error) {
        console.warn(`Could not create flag for country code: ${countryCode}`, error);
        return ''; // Return empty string on error
    }
}

// Function to update a specific voice dropdown based on the selected language
function updateVoiceDropdown(dropdownElement, selectedLanguageCode) { // Make async
    if (!dropdownElement) {
        console.error("Target dropdown element not provided for voice update.");
        return;
    }
    if (typeof voicesData === 'undefined' || !Array.isArray(voicesData)) { // Added check for array
        console.error("voicesData is not defined or not an array. Make sure voices-data.js is loaded correctly.");
        dropdownElement.innerHTML = `<option disabled>${fetchTranslation('voiceErrorLoading', currentLanguage)}</option>`; // REMOVED await
        return;
    }

    // 1. Filter voices based on the selected language
    let filteredVoices = filterVoices(voicesData, selectedLanguageCode);
    let showingFallbackVoices = false; // Flag to track if we are showing all voices

    // 2. Check if filtering resulted in no voices for a specific language selection
    //    If so, use all voices as a fallback.
    if (filteredVoices.length === 0 && selectedLanguageCode && selectedLanguageCode !== 'auto') {
        console.warn(`No specific voices found for ${selectedLanguageCode}. Showing all available voices as fallback.`);
        filteredVoices = [...voicesData]; // Use a copy of all voices as fallback
        showingFallbackVoices = true;
    }

    // 3. Group the voices (either filtered or all fallback voices)
    const multilingualVoices = filteredVoices
        .filter(voice => voice.value.includes('Multilingual'))
        .sort((a, b) => a.value.localeCompare(b.value)); // Sort multilingual voices alphabetically

    // Group ALL voices in the current list (filtered or fallback)
    const groupedVoices = groupVoicesByLanguage(filteredVoices);

    // 4. Populate the dropdown
    dropdownElement.innerHTML = ''; // Clear existing options

    // Handle the case where even the fallback (all voices) is empty (i.e., voicesData is empty)
    if (filteredVoices.length === 0) {
        const option = document.createElement('option');
        // Provide a more informative message based on the selection
        if (!selectedLanguageCode) {
            // Use synchronous fetchTranslation
            option.textContent = fetchTranslation('voiceSelectLanguage', currentLanguage); // REMOVED await
        } else {
            // Use synchronous fetchTranslation
            option.textContent = fetchTranslation('voiceNoneAvailable', currentLanguage); // REMOVED await
        }
        option.disabled = true;
        dropdownElement.appendChild(option);
        return; // Stop here
    }

    // 5. Add Multilingual Optgroup (if any)
    if (multilingualVoices.length > 0) {
        const multiOptgroup = document.createElement('optgroup');
        // Use synchronous fetchTranslation
        const multiLabelText = fetchTranslation('multilingualLabel', currentLanguage); // REMOVED await
        const fallbackHintText = showingFallbackVoices ? ` ${fetchTranslation('voiceFallbackHint', currentLanguage)}` : ""; // REMOVED await
        multiOptgroup.label = `${multiLabelText}${fallbackHintText}`;
        multilingualVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.value;
            const displayText = formatVoiceOption(voice);
            option.textContent = displayText;
            multiOptgroup.appendChild(option);
        });
        dropdownElement.appendChild(multiOptgroup);
    }

    // 6. Add Regular Language Optgroups
    const sortedLanguageCodes = Object.keys(groupedVoices).sort();

    sortedLanguageCodes.forEach(languageCode => {
        // Skip multilingual voices here as they are already added
        const languageVoices = groupedVoices[languageCode].filter(v => !v.value.includes('Multilingual'));

        // Only add the optgroup if there are non-multilingual voices for this language
        if (languageVoices.length > 0) {
        const optgroup = document.createElement('optgroup');
            // Use synchronous fetchTranslation
            const fallbackHintText = showingFallbackVoices ? ` ${fetchTranslation('voiceFallbackHint', currentLanguage)}` : ""; // REMOVED await
            const langName = languageNames[languageCode] || languageCode.toUpperCase();
            const separator = (multilingualVoices.length > 0 || showingFallbackVoices) ? "--- " : "";
            optgroup.label = `${separator}${langName}${fallbackHintText}`;
        dropdownElement.appendChild(optgroup);

        // Voices within the group are already sorted by groupVoicesByLanguage
        languageVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.value; // Store the original value
            const displayText = formatVoiceOption(voice);
            option.textContent = displayText;
            optgroup.appendChild(option);
        });
        }
    });

    // 7. Select first option
    if (dropdownElement.options.length > 0) {
        // Select the first non-disabled option
        for (let i = 0; i < dropdownElement.options.length; i++) {
            if (!dropdownElement.options[i].disabled) {
                dropdownElement.selectedIndex = i;
                break;
            }
        }
    }
}

// Note: The old populateVoiceDropdowns function is removed.
// The call to populate dropdowns will now happen in main.js during initialization and on language change.