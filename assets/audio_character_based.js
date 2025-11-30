// Contains logic for Character-Based Audiobook generation.

// Depends on:
// - AudioPipelineManager (audio_pipeline.js)
// - voicesData (voices-data.js - assumed global)
// - currentLanguage (main.js)
// - fetchTranslation (translation_api.js)
// - filterVoices (voice-dropdown-menu.js)

let characterVoiceMap = new Map(); // Stores Character Name -> Voice ShortName
let characterGenderMap = new Map(); // Stores Character Name -> Gender (Male/Female)
let parsedSentences = []; // Stores the processed text structure
let uniqueCharactersList = []; // Stores list of unique characters found
let isCharacterModeActive = false;

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-characters-button');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalyzeCharacters);
        // Update button text on load
        analyzeBtn.textContent = fetchTranslation('analyzeButton', currentLanguage);
    }

    // Reset Analysis if text or language changes
    const sourceText = document.getElementById('source-text');
    const slSelect = document.getElementById('sl');
    
    const resetAnalysis = () => {
         const settingsArea = document.getElementById('character-settings-area');
         const generateBtn = document.getElementById('generate-button');
         
         if (settingsArea) settingsArea.classList.add('hide');
         if (generateBtn) generateBtn.classList.add('hide');
         
         isCharacterModeActive = false;
         parsedSentences = [];
         characterVoiceMap.clear();
         characterGenderMap.clear();
         uniqueCharactersList = [];
    };

    if (sourceText) sourceText.addEventListener('input', resetAnalysis);
    if (slSelect) slSelect.addEventListener('change', resetAnalysis);
});

/**
 * Helper: Extracts the short name (e.g., "GuyNeural") from a voice object.
 * Handles cases where .ShortName exists or where it needs to be parsed from .value ("en-US, GuyNeural").
 */
function getVoiceShortName(voice) {
    if (!voice) return null;
    if (voice.ShortName) return voice.ShortName;
    if (voice.value && voice.value.includes(',')) {
        return voice.value.split(',')[1].trim();
    }
    return voice.value; // Fallback
}

/**
 * Parses the source text, identifies characters, assigns default voices, and sets up the UI.
 */
function handleAnalyzeCharacters() {
    // Reset generation button visibility at the start of analysis
    document.getElementById('generate-button')?.classList.add('hide');

    const sourceText = document.getElementById('source-text').value;
    if (!sourceText || sourceText.trim() === "") {
        alert(fetchTranslation('alertEnterSourceText', currentLanguage));
        return;
    }

    parsedSentences = [];
    characterGenderMap.clear(); // Clear previous genders
    const uniqueCharacters = new Set();
    uniqueCharacters.add('Narrator'); // Always present

    // Robust Line-by-Line Parsing
    // Regex: Start of line, [Character Name]:, followed by text
    // Modified to capture potential gender inside brackets: [Name, Gender]
    const markerRegex = /^\[(.*?)\]:\s*(.*)/;
    
    const lines = sourceText.split('\n');

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return; // Skip empty lines

        const match = trimmedLine.match(markerRegex);
        
        if (match) {
            // It's a character line
            const bracketContent = match[1].trim(); // e.g., "Max" or "Max, m"
            const dialogue = match[2].trim();
            
            // Split by comma to find Name and optional Gender
            const parts = bracketContent.split(',').map(p => p.trim());
            const charName = parts[0];
            
            if (charName && dialogue) {
                uniqueCharacters.add(charName);
                
                // Try to detect gender if present
                if (parts.length > 1) {
                    const rawGender = parts[1].toLowerCase();
                    // Handle 'm'/'male' or 'f'/'female'
                    if (rawGender === 'male' || rawGender === 'm') {
                        characterGenderMap.set(charName, 'Male');
                    } else if (rawGender === 'female' || rawGender === 'f') {
                        characterGenderMap.set(charName, 'Female');
                    }
                }

                parsedSentences.push({
                    character: charName,
                    text: dialogue
                });
            }
        } else {
            // It's a narrator line
            parsedSentences.push({
                character: 'Narrator',
                text: trimmedLine
            });
        }
    });

    if (parsedSentences.length === 0) {
        alert(fetchTranslation('alertNoTextParsed', currentLanguage));
        return;
    }

    // Convert Set to Array for consistent ordering/indexing
    uniqueCharactersList = Array.from(uniqueCharacters);

    if (uniqueCharactersList.length <= 1) {
        console.log("No specific characters found, only Narrator.");
    }

    // 1. Assign Voices (Logic)
    const success = assignVoicesToCharacters(uniqueCharactersList);

    if (success) {
        // 2. Render UI (View)
        renderCharacterMappingUI(uniqueCharactersList);
        
        // Show Generate Button ONLY after successful analysis and mapping
        document.getElementById('generate-button')?.classList.remove('hide');
        isCharacterModeActive = true;
    }
}

/**
 * Logic: Assigns a voice to each character automatically based on available voices and detected gender.
 * Populates the characterVoiceMap.
 * @param {string[]} characters List of character names
 * @returns {boolean} True if assignment was successful
 */
function assignVoicesToCharacters(characters) {
    characterVoiceMap.clear();

    // Get available voices for current language selected in SL dropdown
    const slSelect = document.getElementById('sl');
    const langCode = slSelect ? slSelect.value : 'en';
    
    // Filter voices using the helper
    let availableVoices = [];
    if (typeof filterVoices === 'function' && typeof voicesData !== 'undefined') {
        availableVoices = filterVoices(voicesData, langCode);
    } else {
        console.warn("voicesData or filterVoices not available. Using empty list.");
    }

    // Fallback: If no voices found for specific language (e.g. en-AU), use ALL voices
    if (availableVoices.length === 0 && typeof voicesData !== 'undefined') {
        console.warn(`No specific voices found for ${langCode}. Using all available voices as fallback.`);
        availableVoices = voicesData;
    }

    if (availableVoices.length === 0) {
        console.error("Critical: No voices available at all.");
        alert("Error: No voices loaded. Please check your internet connection or reload the page.");
        return false;
    }

    // Automatically select a Narrator Voice (Default to the first one available)
    let narratorVoiceShortName = '';
    if (availableVoices.length > 0) {
         narratorVoiceShortName = getVoiceShortName(availableVoices[0]);
    }

    if (!narratorVoiceShortName) {
         console.error("Critical: Could not determine a default Narrator voice.");
         alert("Error: Could not assign a default voice. Please check available voices.");
         return false;
    }

    // Assign Narrator first
    characterVoiceMap.set('Narrator', narratorVoiceShortName);

    // --- Create a character pool EXCLUDING the Narrator voice ---
    // This prevents the first character from immediately reusing the Narrator's voice
    let characterPool = availableVoices;
    if (availableVoices.length > 1) {
        characterPool = availableVoices.filter(v => getVoiceShortName(v) !== narratorVoiceShortName);
    }

    // Separate voices by gender from the (potentially reduced) pool
    const maleVoices = characterPool.filter(v => v.gender === 'Male');
    const femaleVoices = characterPool.filter(v => v.gender === 'Female');
    
    // Create a pool of ShortNames for rotation
    const allVoiceShortNames = characterPool.map(v => getVoiceShortName(v)).filter(n => n);
    const maleVoiceShortNames = maleVoices.map(v => getVoiceShortName(v)).filter(n => n);
    const femaleVoiceShortNames = femaleVoices.map(v => getVoiceShortName(v)).filter(n => n);

    if (allVoiceShortNames.length === 0) {
         // Fallback to full list if filtering emptied it (unlikely with length > 1 check)
         console.warn("Filtered pool empty, falling back to full voice list.");
         characterPool = availableVoices;
         // Re-map (reuse logic simplified by just proceeding with possibly narrator included if critical)
    }

    // Indices for rotation
    let generalIndex = 0;
    let maleIndex = 0;
    let femaleIndex = 0;

    characters.forEach(charName => {
        if (charName === 'Narrator') return; // Already done

        const gender = characterGenderMap.get(charName); // 'Male' or 'Female' or undefined
        let assignedVoice = null;

        // Attempt to assign based on gender
        if (gender === 'Male' && maleVoiceShortNames.length > 0) {
            assignedVoice = maleVoiceShortNames[maleIndex % maleVoiceShortNames.length];
            maleIndex++;
        } else if (gender === 'Female' && femaleVoiceShortNames.length > 0) {
            assignedVoice = femaleVoiceShortNames[femaleIndex % femaleVoiceShortNames.length];
            femaleIndex++;
        } else {
            // Fallback to general rotation if gender unknown or specific gender list empty
            if (allVoiceShortNames.length > 0) {
                assignedVoice = allVoiceShortNames[generalIndex % allVoiceShortNames.length];
                generalIndex++;
            }
        }
        
        // Safety check and final fallback to Narrator if absolutely nothing else
        if (assignedVoice) {
            characterVoiceMap.set(charName, assignedVoice);
        } else {
            characterVoiceMap.set(charName, narratorVoiceShortName);
        }
    });

    console.log("Voices assigned:", Object.fromEntries(characterVoiceMap));
    return true;
}

/**
 * View: Renders the table/list of characters and voice dropdowns based on the map.
 * @param {string[]} characters List of character names
 */
function renderCharacterMappingUI(characters) {
    const container = document.getElementById('character-settings-area');
    if (!container) return;

    const title = fetchTranslation('charMappingTitle', currentLanguage);
    const desc = fetchTranslation('charMappingDesc', currentLanguage);
    
    container.innerHTML = `<h3>${title}</h3><p>${desc}</p>`;
    container.classList.remove('hide');

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '150px 1fr';
    grid.style.gap = '10px';
    grid.style.alignItems = 'center';

    // Re-fetch available voices for the dropdown options
    const slSelect = document.getElementById('sl');
    const langCode = slSelect ? slSelect.value : 'en';
    let availableVoices = [];
    if (typeof filterVoices === 'function' && typeof voicesData !== 'undefined') {
        availableVoices = filterVoices(voicesData, langCode);
    }
    
    // Fallback in UI as well
    if (availableVoices.length === 0 && typeof voicesData !== 'undefined') {
        availableVoices = voicesData;
    }

    characters.forEach((charName, index) => {
        // Label with Gender indicator if known
        const gender = characterGenderMap.get(charName);
        const genderLabel = gender ? ` (${gender === 'Male' ? 'M' : 'F'})` : '';
        
        const label = document.createElement('label');
        label.textContent = charName + genderLabel;
        label.style.fontWeight = 'bold';
        if (gender === 'Male') label.style.color = '#2196F3'; // Blue hint
        if (gender === 'Female') label.style.color = '#E91E63'; // Pink hint

        // Select
        const select = document.createElement('select');
        select.id = `char-voice-${index}`;
        select.dataset.character = charName;
        select.style.width = '100%';
        select.className = 'voice-select';

        // --- Filter voices for this specific character based on gender ---
        let voicesForDropdown = availableVoices;
        if (gender === 'Male') {
            const filtered = availableVoices.filter(v => v.gender === 'Male');
            if (filtered.length > 0) voicesForDropdown = filtered;
        } else if (gender === 'Female') {
            const filtered = availableVoices.filter(v => v.gender === 'Female');
            if (filtered.length > 0) voicesForDropdown = filtered;
        }

        // Populate Select
        if (voicesForDropdown.length === 0) {
            const opt = document.createElement('option');
            opt.text = fetchTranslation('voiceNoneAvailable', currentLanguage);
            select.add(opt);
            select.disabled = true;
        } else {
            voicesForDropdown.forEach(voice => {
                const opt = document.createElement('option');
                opt.value = getVoiceShortName(voice); // Use Extracted ShortName as value
                
                if (typeof formatVoiceOption === 'function') {
                    opt.text = formatVoiceOption(voice);
                } else {
                    opt.text = voice.value; // Fallback
                }
                select.add(opt);
            });

            // Set selected value from map
            const preAssignedVoice = characterVoiceMap.get(charName);
            if (preAssignedVoice) {
                // Check if the pre-assigned voice exists in the filtered list
                // If not (e.g. gender mismatch in logic vs view), we might need to add it or select index 0
                const exists = Array.from(select.options).some(opt => opt.value === preAssignedVoice);
                if (exists) {
                    select.value = preAssignedVoice;
                } else {
                    // Pre-assigned voice not in filtered list? Select first available.
                    if (select.options.length > 0) {
                         select.selectedIndex = 0;
                         // Update map to match reality
                         characterVoiceMap.set(charName, select.value);
                    }
                }
            } else {
                // If map missing value, pick first
                 if (select.options.length > 0) {
                     select.selectedIndex = 0;
                     characterVoiceMap.set(charName, select.value);
                 }
            }
        }

        // Save selection to map on change
        select.addEventListener('change', () => {
            characterVoiceMap.set(charName, select.value);
            console.log(`Voice changed for ${charName}: ${select.value}`);
        });

        grid.appendChild(label);
        grid.appendChild(select);
    });

    container.appendChild(grid);

    // Add a "Close/Cancel" button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = fetchTranslation('closeCharMode', currentLanguage);
    closeBtn.className = "button button-subtle";
    closeBtn.style.marginTop = "15px";
    closeBtn.addEventListener('click', () => {
        container.classList.add('hide');
        document.getElementById('generate-button')?.classList.add('hide'); // Hide generate if closed
        isCharacterModeActive = false;
    });
    container.appendChild(closeBtn);
}

/**
 * Main generation function for Character Mode.
 */
async function generateCharacterAudiobook() {
    console.log("--- generateCharacterAudiobook START ---");

    // 1. Validate
    if (parsedSentences.length === 0) {
        alert(fetchTranslation('alertNoTextParsed', currentLanguage));
        return;
    }

    // Safety check: If map is empty (e.g. analysis didn't run properly), try to re-assign
    if (characterVoiceMap.size === 0 && uniqueCharactersList.length > 0) {
        console.log("Map empty during generation. Attempting auto-assignment...");
        assignVoicesToCharacters(uniqueCharactersList);
    }

    // 2. Prepare Tasks
    const tasks = [];
    const baseRate = document.getElementById('sl-rate')?.value || 0;
    const basePitch = document.getElementById('sl-pitch')?.value || 0;
    const formattedRate = `${baseRate >= 0 ? '+' : ''}${baseRate}%`;
    const formattedPitch = `${basePitch >= 0 ? '+' : ''}${basePitch}Hz`;

    // Validation Flag
    let missingVoices = false;

    // Helper to resolve full voice object from ShortName
    const getFullVoiceValue = (shortName) => {
        if (typeof voicesData !== 'undefined') {
            // Find match by extracting short name from data items
            const voiceObj = voicesData.find(v => getVoiceShortName(v) === shortName);
            return voiceObj ? voiceObj.value : shortName; // Return full "Lang, Name" or fallback
        }
        return shortName;
    };
    
    // Get Narrator fallback
    let defaultNarratorVoice = characterVoiceMap.get('Narrator');
    if (!defaultNarratorVoice && typeof voicesData !== 'undefined' && voicesData.length > 0) {
        defaultNarratorVoice = getVoiceShortName(voicesData[0]); // Absolute fallback
    }

    for (const item of parsedSentences) {
        let voiceShortName = characterVoiceMap.get(item.character);
        
        // If still no voice, this is a critical error
        if (!voiceShortName || voiceShortName === 'undefined') {
            console.warn(`No voice found in map for character: ${item.character}. Using Narrator fallback.`);
            // Attempt fallback to Narrator's voice specifically
            voiceShortName = defaultNarratorVoice;
        }

        if (!voiceShortName || voiceShortName === 'undefined') {
            console.error(`Critically failed to find any voice for ${item.character}`);
            missingVoices = true;
            break; 
        }

        const finalVoice = getFullVoiceValue(voiceShortName);

        tasks.push({
            text: item.text,
            voice: finalVoice,
            rate: formattedRate,
            pitch: formattedPitch,
            volume: "+0%"
        });
    }

    if (missingVoices) {
        alert("Error: One or more characters do not have a valid voice selected. Please check settings.");
        return;
    }

    // 3. Setup Pipeline
    const statArea = document.getElementById('stat-area');
    const maxThreads = parseInt(document.querySelector('.max-threads')?.value || '10', 10);
    const mergeValue = parseInt(document.querySelector('.mergefiles')?.value || '100', 10);
    const mergeSettings = {
        enabled: mergeValue > 1,
        chunkSize: mergeValue === 100 ? Infinity : mergeValue
    };

    // Reset UI
    if (statArea) {
        statArea.classList.remove('hide');
        statArea.value = "Starting Character-Based Generation...\n";
    }
    document.getElementById('progress-container')?.classList.remove('hide');

    // Set globals expected by callbacks
    if (typeof currentJobTotalTasks !== 'undefined') currentJobTotalTasks = tasks.length;
    if (typeof successfulSingleLanguageResults !== 'undefined') successfulSingleLanguageResults = [];
    if (typeof currentBaseFilename !== 'undefined') currentBaseFilename = "CharacterAudiobook";
    if (typeof currentMergeSettings !== 'undefined') currentMergeSettings = mergeSettings;

    // Use Narrator voice for general settings context if needed
    let fullDefaultNarratorVoice = getFullVoiceValue(defaultNarratorVoice);

    const pipelineConfig = {
        tasks: tasks,
        audioSettings: { voice: fullDefaultNarratorVoice }, 
        concurrencyLimit: maxThreads,
        baseFilename: "CharacterAudiobook",
        mergeSettings: mergeSettings,
        statArea: statArea,
        onProgress: (typeof handlePipelineProgress === 'function') ? handlePipelineProgress : null,
        onComplete: (typeof handlePipelineComplete === 'function') ? handlePipelineComplete : null,
        onError: (typeof handlePipelineError === 'function') ? handlePipelineError : null
    };

    console.log(`Starting pipeline with ${tasks.length} character tasks.`);

    try {
        if (typeof currentPipelineManager !== 'undefined') {
            if (currentPipelineManager) currentPipelineManager.clear();
            currentPipelineManager = new AudioPipelineManager(pipelineConfig);
            await sleep(50);
            currentPipelineManager.start();
        } else {
            const manager = new AudioPipelineManager(pipelineConfig);
            manager.start();
        }
    } catch (error) {
        console.error("Pipeline Error:", error);
        alert("Error starting character generation: " + error.message);
    }
}
