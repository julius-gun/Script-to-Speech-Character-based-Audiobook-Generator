// Contains logic for generating multi-language audiobooks.

// Depends on:
// - Functions:
//   - detectLanguage, translateBatch (translation_api.js)
//   - splitIntoSentences, mergeShortSentences, createTranslationBatches, sleep (translation_utils.js)
//   - updateProgress (progress_bar.js)
//   - displayTranslatedBatch (ui.js) // Reused for showing text
//   - formatString, formatTime (ui_helpers.js) // Added formatTime
//   - fetchTranslation (translation_api.js)
//   - concatenateUint8Arrays (audio_helpers.js) // NEW dependency
//   - cleanupTaskInstances (audio_helpers.js) // Existing dependency
// - Classes: AudioPipelineManager (audio_pipeline.js)
// - UI Elements: source-text, sl, sl-voice, tl[1-4]-container, tl[1-4], tl[1-4]-voice, output, stat-area, progress-container, progress-bar, progress-info, translation-finished-message, open-book-view-button, save-epub-button, reload-page-button
// - Globals: currentLanguage (main.js)

// Store translations globally within this module's scope for access across functions
let multiLangSentences = []; // Array to hold { original: "...", translations: { "lang": "...", ... } }
// Store the pipeline manager instance globally within this module
let multiLangPipelineManager = null;
let multiLangBaseFilename = "MultiLangAudiobook"; // Default filename
let failedMultiLanguageTasks = []; // Store failed tasks for retry
let currentAudioSequenceForAssembly = []; // Store the audio sequence map for retries
let multiLangAudioCache = new Map(); // Cache for successful audio parts across runs
let multiLangJobTotalTasks = 0; // Store the total number of tasks for the entire job


// Constants for translation batching
const GOOGLE_TRANSLATE_CHARACTER_LIMIT = 1500; // REDUCED for safe GET request URL length
const API_CALL_DELAY_MIN_MS = 200;
const API_CALL_DELAY_MAX_MS = 500;


async function generateMultiLanguageAudio(sourceLang, sourceVoice, targets) {
    console.log("--- generateMultiLanguageAudio START ---");
    // Reset UI elements specifically for this flow
    document.getElementById('reload-page-button')?.classList.add('hide');
    document.getElementById('retry-failed-button')?.remove(); // Remove old retry button
    document.getElementById('save-incomplete-button')?.remove(); // Remove save incomplete button
    const bookContainer = document.getElementById('output'); // Get bookContainer early
    bookContainer.innerHTML = ''; // Clear previous output
    document.getElementById('stat-area')?.classList.add('hide');
    document.getElementById('translation-finished-message')?.classList.add('hide');
    document.getElementById('open-book-view-button')?.classList.add('hide');
    document.getElementById('save-epub-button')?.classList.add('hide');

    // Reset state for a new run
    failedMultiLanguageTasks = [];
    currentAudioSequenceForAssembly = [];
    multiLangAudioCache.clear();
    multiLangJobTotalTasks = 0;


    const sourceText = document.getElementById('source-text').value;
    const targetLangsInSequence = targets.map(t => t.lang);

    if (targetLangsInSequence.length === 0) {
        alert(fetchTranslation('alertSelectTargetLang', currentLanguage));
        return;
    }

    // --- 1. Translation Phase (with concurrent display) ---
    console.log("Phase 1: Translation & Immediate Display");
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressInfo = document.getElementById('progress-info');

    updateProgressTitle('translationProgressTitle');
    if (progressContainer) progressContainer.classList.remove('hide');
    if (progressInfo) progressInfo.classList.remove('hide');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.style.backgroundColor = '';
    }

    // splitIntoSentences is from translation_utils.js
    const originalSentences = splitIntoSentences(sourceText);
    if (!originalSentences || originalSentences.length === 0) {
        alert(fetchTranslation('alertCouldNotSplit', currentLanguage));
        document.getElementById('reload-page-button')?.classList.remove('hide');
        return;
    }

    multiLangSentences = []; // Reset global array
    const totalSentencesToTranslate = originalSentences.length;
    let translatedSentencesCount = 0;
    const translationStartTime = Date.now();
    updateProgress(0, totalSentencesToTranslate, translationStartTime); // Initial call for translation progress

    console.log(`Source text split into ${originalSentences.length} sentences.`);

    // --- Translation Optimization ---
    // Identify unique target languages that actually need translation (not source, no repeats)
    const uniqueTargetLangsToTranslate = [...new Set(targetLangsInSequence)].filter(lang => lang !== sourceLang);
    console.log("Unique languages to translate:", uniqueTargetLangsToTranslate);

    // Create sub-batches from originalSentences for the API calls
    const sentenceSubBatches = createTranslationBatches(originalSentences, GOOGLE_TRANSLATE_CHARACTER_LIMIT);
    console.log(`Created ${sentenceSubBatches.length} sub-batches for translation API calls.`);

    let sentenceCursor = 0; // Keep track of which original sentence we're on

    try {
        if (uniqueTargetLangsToTranslate.length > 0) {
        for (let batchIndex = 0; batchIndex < sentenceSubBatches.length; batchIndex++) {
            const currentSentenceSubBatch = sentenceSubBatches[batchIndex];
            if (currentSentenceSubBatch.length === 0) continue;

                console.log(`Translating sub-batch ${batchIndex + 1}/${sentenceSubBatches.length} from ${sourceLang} to ${uniqueTargetLangsToTranslate.join(', ')}...`);

            const subBatchTranslationResult = await translateBatch(currentSentenceSubBatch, sourceLang, uniqueTargetLangsToTranslate, currentLanguage);

                // --- Process and display this batch immediately ---
                for (let i = 0; i < currentSentenceSubBatch.length; i++) {
                    const originalSentenceText = currentSentenceSubBatch[i];
                    const sentenceData = {
                        original: originalSentenceText,
                        translations: {}
                    };

                    // Populate translations for this sentence
                    for (const lang of uniqueTargetLangsToTranslate) {
                        if (subBatchTranslationResult.translations && subBatchTranslationResult.translations[lang]) {
                            sentenceData.translations[lang] = subBatchTranslationResult.translations[lang][i];
                        } else {
                            sentenceData.translations[lang] = fetchTranslation('translationError', currentLanguage);
                        }
                    }

                    // Handle languages that are the same as source (no translation needed)
                    for (const lang of targetLangsInSequence) {
                        if (lang === sourceLang) {
                            sentenceData.translations[lang] = originalSentenceText;
                        }
                    }
                    multiLangSentences.push(sentenceData);

                    // --- IMMEDIATE DISPLAY ---
                    // Create a display object for just this sentence
                    const displayTargets = {};
                    targets.forEach(target => {
                        const lang = target.lang;
                        if (!displayTargets[lang]) {
                            displayTargets[lang] = [];
                        }
                        displayTargets[lang].push(sentenceData.translations[lang] || fetchTranslation('translationError', currentLanguage));
                    });

                    displayTranslatedBatch([originalSentenceText], displayTargets, sourceLang, Object.keys(displayTargets));
                    await sleep(5); // Small delay for UI update
                    }

                // Update progress based on the number of original sentences processed in the batch
                translatedSentencesCount += currentSentenceSubBatch.length;
                updateProgress(translatedSentencesCount, totalSentencesToTranslate, translationStartTime);

                if (batchIndex < sentenceSubBatches.length - 1) {
                    await sleep(API_CALL_DELAY_MIN_MS, API_CALL_DELAY_MAX_MS);
                }
            }
        } else {
            // Handle case where no translation is needed (e.g., source only, or fr -> fr)
            for (const originalSentenceText of originalSentences) {
                    const sentenceData = {
                        original: originalSentenceText,
                        translations: {}
                    };
                // Just copy the source text for all targets
            for (const lang of targetLangsInSequence) {
                    sentenceData.translations[lang] = originalSentenceText;
            }
            multiLangSentences.push(sentenceData);

            // Display this sentence immediately. Create a temporary display object for target languages
            // to conform to displayTranslatedBatch's expected format.
             const displayTargets = {};
             targets.forEach(target => {
                    displayTargets[target.lang] = [originalSentenceText];
             });

            displayTranslatedBatch([originalSentenceText], displayTargets, sourceLang, Object.keys(displayTargets));
                await sleep(5);
            }
            updateProgress(totalSentencesToTranslate, totalSentencesToTranslate, translationStartTime);
        }

        console.log("All sentences translated and displayed. Total in multiLangSentences:", multiLangSentences.length);

    } catch (error) {
        console.error("Error during batched translation process:", error);
        alert(fetchTranslation('alertTranslationFailed', currentLanguage));
        if (progressContainer) progressContainer.classList.add('hide');
        if (progressInfo) progressInfo.classList.add('hide');
        document.getElementById('reload-page-button')?.classList.remove('hide');
        return;
    }
    
    // --- Translation UI Finalization ---
    document.getElementById('translation-finished-message')?.classList.remove('hide');
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        progressBar.style.backgroundColor = '#28a745';
    }
    if (progressInfo) {
        const finishedText = fetchTranslation('statusFinishedExclaim', currentLanguage);
        const translatedText = fetchTranslation('translated', currentLanguage);
        progressInfo.innerHTML = `<span>${translatedText}: ${totalSentencesToTranslate} / ${totalSentencesToTranslate}</span> | <span>${finishedText}</span>`;
    }
    // Make book view available
    if (multiLangSentences.length > 0) {
        document.getElementById('open-book-view-button')?.classList.remove('hide');
    }


    // --- 3. Audio Generation Phase ---
    console.log("Phase 3: Audio Generation Setup");

    // 3.1 Get Audio Settings
    const sourceSettings = {
        rate: `${document.getElementById('sl-rate')?.value || 0}%`,
        pitch: `${document.getElementById('sl-pitch')?.value || 0}Hz`,
        volume: "+0%",
        voice: sourceVoice
    };

    const targetSettings = {};
    targets.forEach(target => {
        const rateSlider = document.getElementById(`${target.id}-rate`);
        const pitchSlider = document.getElementById(`${target.id}-pitch`);
        targetSettings[target.id] = {
            rate: `${rateSlider?.value || 0}%`,
            pitch: `${pitchSlider?.value || 0}Hz`,
            volume: "+0%",
            voice: target.voice,
            lang: target.lang
                };
    });
    console.log("Audio Settings For All Slots:", { source: sourceSettings, targets: targetSettings });

    // 3.2 Prepare a list of UNIQUE audio generation jobs
    const uniqueAudioJobs = new Map();
    const audioSequenceForAssembly = []; // Will store the keys in playback order for each sentence

    for (const sentenceData of multiLangSentences) {
        const sentenceAudioSequence = []; // Keys for this sentence in order

        // Job for the original (source) sentence
        if (sentenceData.original && sentenceData.original.trim().length > 0) {
            const text = sentenceData.original;
            // Key includes text, voice, and prosody for true uniqueness
            const key = `${sourceLang}|${text}|${sourceSettings.voice}|${sourceSettings.rate}|${sourceSettings.pitch}`;

            if (!uniqueAudioJobs.has(key)) {
                uniqueAudioJobs.set(key, {
                    key: key, // Store key for mapping results
                    text: text,
                    voice: sourceSettings.voice,
                    rate: sourceSettings.rate,
                    pitch: sourceSettings.pitch,
                    volume: sourceSettings.volume,
                lang: sourceLang,
            });
            }
            sentenceAudioSequence.push(key);
        }

        // Jobs for translated sentences, in the specified sequence
        for (const target of targets) {
            // `target` is { lang: 'en', voice: '...', id: 'tl1' }
            const translationText = sentenceData.translations[target.lang];
            const settings = targetSettings[target.id]; // Get settings for this specific slot (tl1, tl2, etc.)

            if (translationText && translationText.trim().length > 0 && translationText !== fetchTranslation('translationError', currentLanguage)) {
                const key = `${target.lang}|${translationText}|${settings.voice}|${settings.rate}|${settings.pitch}`;

                if (!uniqueAudioJobs.has(key)) {
                    uniqueAudioJobs.set(key, {
                        key: key,
                    text: translationText,
                        voice: settings.voice,
                        rate: settings.rate,
                        pitch: settings.pitch,
                        volume: settings.volume,
                        lang: target.lang,
                    });
                }
                sentenceAudioSequence.push(key);
            }
        }
        audioSequenceForAssembly.push(sentenceAudioSequence);
    }
    // Store the sequence map for potential retries
    currentAudioSequenceForAssembly = audioSequenceForAssembly;


    const allAudioTasks = Array.from(uniqueAudioJobs.values());
    multiLangJobTotalTasks = allAudioTasks.length;

    if (allAudioTasks.length === 0) {
        console.error("No valid audio tasks could be created.");
        alert(fetchTranslation('alertNoAudioTasks', currentLanguage)); // Add this key
        document.getElementById('reload-page-button')?.classList.remove('hide');
        return;
    }
    console.log(`Created ${allAudioTasks.length} unique audio tasks for generation.`);
    console.log("Audio sequence for assembly has been mapped for all sentences.");

    // 3.3 Reset UI for Audio Phase & Configure Pipeline
    const statArea = document.getElementById('stat-area');
    // Progress bar elements are already defined (progressContainer, progressBar, progressInfo)
    // We will re-purpose them.

    document.getElementById('translation-finished-message')?.classList.add('hide');
    statArea?.classList.remove('hide');
    statArea.value = fetchTranslation('placeholderStatArea', currentLanguage);

    updateProgressTitle('audioGenerationProgressTitle');

    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.style.backgroundColor = ''; // Reset color
    }
    if (progressInfo) {
        const processedText = fetchTranslation('statusProcessed', currentLanguage);
        const etaText = fetchTranslation('eta', currentLanguage);
        const calculatingText = fetchTranslation('statusCalculating', currentLanguage);
        progressInfo.innerHTML = `<span>${processedText}: 0 / ${multiLangJobTotalTasks}</span> | <span>${etaText}: ${calculatingText}</span>`;
    }

    if (multiLangPipelineManager) {
        multiLangPipelineManager.clear();
    }

    const sourceTextArea = document.getElementById('source-text');
    const firstWords = sourceTextArea?.value.split(' ').slice(0, 3).join(' ') || `MultiLang_${Date.now()}`;
    const sanitizedFirstWords = firstWords.replace(/[^a-z0-9_]/gi, '_').toLowerCase(); // Allow underscore
    multiLangBaseFilename = sanitizedFirstWords.substring(0, 30) || "MultiLangAudiobook";
    console.log("Determined base filename for audio:", multiLangBaseFilename);

    // 3.3 Configure and Start AudioPipelineManager
    const maxThreads = parseInt(document.querySelector('.max-threads')?.value || '10', 10);
    const pipelineConfig = {
        tasks: allAudioTasks,
        audioSettings: { voice: sourceVoice }, // Restored: Provide a default/fallback voice to satisfy the constructor check.
        concurrencyLimit: maxThreads,
        baseFilename: multiLangBaseFilename,
        statArea: statArea,
        onProgress: handleMultiLangAudioProgress,
        onComplete: (completionData) => handleMultiLangAudioComplete(completionData, currentAudioSequenceForAssembly),
        onError: handleMultiLangAudioError
    };

    console.log("Creating and starting AudioPipelineManager for multi-language audio...");
    try {
        multiLangPipelineManager = new AudioPipelineManager(pipelineConfig);
        await sleep(50);
        multiLangPipelineManager.start();
        console.log("--- Multi-language audio pipeline STARTED ---");
    } catch (error) {
        console.error("Failed to create or start multi-language AudioPipelineManager:", error);
        const errorMsgTemplate = fetchTranslation('alertPipelineError', currentLanguage);
        handleMultiLangAudioError(formatString(errorMsgTemplate, error.message));
        document.getElementById('reload-page-button')?.classList.remove('hide');
    }
}


// --- Multi-Language Audio Pipeline Callbacks ---

function handleMultiLangAudioProgress(progressData) {
    const { processed, failed, total, etaSeconds } = progressData;
    const progressBar = document.getElementById('progress-bar');
    const progressInfo = document.getElementById('progress-info');

    if (multiLangJobTotalTasks === 0) return;

    const totalSuccess = multiLangAudioCache.size + processed;
    const percent = Math.round((totalSuccess / multiLangJobTotalTasks) * 100);

    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.textContent = percent + '%';
    }

    if (progressInfo) {
        const calculatingText = fetchTranslation('statusCalculating', currentLanguage);
        const etaString = (etaSeconds === null || !isFinite(etaSeconds)) ?
            calculatingText :
            formatTime(etaSeconds * 1000);
        const processedText = fetchTranslation('statusProcessed', currentLanguage);
        const failedText = fetchTranslation('statusFailedLabel', currentLanguage);
        const etaText = fetchTranslation('eta', currentLanguage);

        progressInfo.innerHTML = `
            <span>${processedText}: ${totalSuccess} / ${multiLangJobTotalTasks}</span> |
            ${failed > 0 ? `<span style="color: red;">${failedText} ${failed}</span> |` : ''}
            <span>${etaText}: ${etaString}</span>
        `;
    }
}

async function handleMultiLangAudioComplete(completionData, audioSequenceForAssembly) {
    const { processed, failed, total, results } = completionData;
    console.log(`Multi-Language Pipeline run finished. Success: ${processed}, Failed: ${failed}`);

    const statArea = document.getElementById('stat-area');
    const progressInfo = document.getElementById('progress-info');
    const progressBar = document.getElementById('progress-bar');
    const reloadButton = document.getElementById('reload-page-button');
    reloadButton?.classList.remove('hide');

    // Add successful results from this run to the master cache
    for (const instance of results) {
        if (instance && instance.mp3_saved && instance.my_uint8Array?.length > 0 && instance.originalTask?.key) {
            multiLangAudioCache.set(instance.originalTask.key, instance.my_uint8Array);
        }
    }
    console.log(`Audio cache now contains ${multiLangAudioCache.size} entries.`);

    if (failed > 0) {
        const totalSuccess = multiLangAudioCache.size;

        let finalMessage = `\n--- ${fetchTranslation('audioGenFailedMessage', currentLanguage)} ---`;
        const detailsTemplate = fetchTranslation('audioGenFailedDetails', currentLanguage);
        finalMessage += `\n${formatString(detailsTemplate, failed)}`;
        if (statArea) statArea.value += finalMessage;

        if (progressInfo) {
            const processedText = fetchTranslation('statusProcessed', currentLanguage);
            const failedText = fetchTranslation('statusFailedLabel', currentLanguage);
            const failedExclaimText = fetchTranslation('statusFailedExclaim', currentLanguage);
            progressInfo.innerHTML = `
                <span>${processedText}: ${totalSuccess} / ${multiLangJobTotalTasks}</span> |
                <span style="color: red;">${failedText} ${failed}</span> |
                <span style="color: red;">${failedExclaimText}</span>
            `;
        }
        if (progressBar) {
            const failedProgressTemplate = fetchTranslation('statusFailedProgress', currentLanguage);
            progressBar.style.backgroundColor = '#dc3545';
            progressBar.textContent = formatString(failedProgressTemplate, failed, multiLangJobTotalTasks);
        }

        // Store failed tasks for retry and show the button
        failedMultiLanguageTasks = results
            .filter(instance => !instance || !instance.mp3_saved)
            .map(instance => instance.originalTask);

        if (failedMultiLanguageTasks.length > 0) {
            createAndShowPostFailureButtons('multi-language');
        }

        // Clean up only failed instances from this run
        cleanupTaskInstances(results.filter(instance => !instance || !instance.mp3_saved));
        multiLangPipelineManager = null;
        return;
    }

    // --- Handle Complete Success ---
    const totalSuccess = multiLangAudioCache.size;
    let finalMessage = `\n--- ${fetchTranslation('audioGenSuccessMessage', currentLanguage)} ---`;
    const successDetailsTemplate = fetchTranslation('audioGenSuccessDetails', currentLanguage);
    finalMessage += `\n${formatString(successDetailsTemplate, totalSuccess, multiLangJobTotalTasks)}`;
    finalMessage += `\n--- ${fetchTranslation('statusMergingAudio', currentLanguage)} ---`;
    if (statArea) statArea.value += finalMessage;

    if (progressInfo) {
        const processedText = fetchTranslation('statusProcessed', currentLanguage);
        const finishedExclaimText = fetchTranslation('statusFinishedExclaim', currentLanguage);
        progressInfo.innerHTML = `
            <span>${processedText}: ${totalSuccess} / ${multiLangJobTotalTasks}</span> |
            <span>${finishedExclaimText}</span>
        `;
    }
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        progressBar.style.backgroundColor = '#28a745';
    }

    try {
        if (multiLangAudioCache.size > 0) {
            console.log("Assembling final audio file from cache...");
            const finalAudioParts = [];
            for (const sentenceSequence of audioSequenceForAssembly) {
                for (const key of sentenceSequence) {
                    if (multiLangAudioCache.has(key)) {
                        finalAudioParts.push(multiLangAudioCache.get(key));
                    } else {
                        console.warn(`Audio part not found in cache for key: ${key}`);
                    }
                }
            }

            console.log(`Concatenating ${finalAudioParts.length} audio parts...`);
            const combinedAudioData = concatenateUint8Arrays(finalAudioParts);
            const finalFilename = `${multiLangBaseFilename}.mp3`;
            console.log(`Saving combined audio as ${finalFilename}`);
            const audioBlob = new Blob([combinedAudioData.buffer], { type: 'audio/mpeg' });
            saveAs(audioBlob, finalFilename);

            if (statArea) {
                const message = formatString(fetchTranslation('statusCombinedAudioSaved', currentLanguage), finalFilename);
                statArea.value += `\n--- ${message} ---`;
                statArea.scrollTop = statArea.scrollHeight;
            }
        } else {
            console.error("No successful audio parts found to merge.");
            if (statArea) statArea.value += `\n--- ${fetchTranslation('alertNoAudioPartsToMerge', currentLanguage)} ---`;
        }
    } catch (error) {
        console.error("Error during final audio merging or saving:", error);
        if (statArea) {
            const message = formatString(fetchTranslation('alertMergeSaveError', currentLanguage), error.message);
            statArea.value += `\n--- ${message} ---`;
        }
    } finally {
        console.log("Cleaning up all task instances after successful completion...");
        cleanupTaskInstances(results); // Clean up instances from the final successful run
        multiLangAudioCache.clear(); // Clear the cache
        multiLangPipelineManager = null;
    }
}


function handleMultiLangAudioError(errorMessage) {
    console.error("Multi-Language Audio Pipeline Error:", errorMessage);
    const statArea = document.getElementById('stat-area');
    const progressInfo = document.getElementById('progress-info');
    const progressBar = document.getElementById('progress-bar');
    const reloadButton = document.getElementById('reload-page-button');
    reloadButton?.classList.remove('hide');


    const errorText = `\n--- ${formatString(fetchTranslation('pipelineErrorMessage', currentLanguage), errorMessage)} ---`;

    if (statArea) {
        statArea.classList.remove('hide');
        statArea.value += errorText;
        statArea.scrollTop = statArea.scrollHeight;
    }
    if (progressInfo) {
        const pipelineErrorLabel = fetchTranslation('pipelineErrorLabel', currentLanguage);
        progressInfo.innerHTML += ` | <span style="color: red;">${pipelineErrorLabel}</span>`;
    }
    if (progressBar) {
        progressBar.style.backgroundColor = '#dc3545';
        progressBar.textContent = fetchTranslation('statusError', currentLanguage);
    }
    alert(errorMessage);

    if (multiLangPipelineManager) {
        multiLangPipelineManager.clear();
        multiLangPipelineManager = null;
    }
}

// --- Retry Logic ---

/**
 * Creates and displays the 'Retry Failed' and 'Save Incomplete' buttons.
 * @param {string} mode - 'single-language' or 'multi-language' to link to the correct functions.
 */
function createAndShowPostFailureButtons(mode) {
    // Remove any existing buttons to prevent duplicates
    document.getElementById('retry-failed-button')?.remove();
    document.getElementById('save-incomplete-button')?.remove();

    const reloadButton = document.getElementById('reload-page-button');
    if (!reloadButton || !reloadButton.parentElement) return;

    const retryButton = document.createElement('button');
    retryButton.id = 'retry-failed-button';
    retryButton.textContent = fetchTranslation('buttonRetryFailed', currentLanguage);
    retryButton.className = 'button';

    const saveIncompleteButton = document.createElement('button');
    saveIncompleteButton.id = 'save-incomplete-button';
    saveIncompleteButton.textContent = fetchTranslation('buttonSaveIncomplete', currentLanguage);
    saveIncompleteButton.className = 'button-secondary';

    if (mode === 'single-language') {
        // These are defined in audio_single_language.js
        retryButton.addEventListener('click', retryFailedSingleLanguageTasks);
        saveIncompleteButton.addEventListener('click', handleSaveIncompleteSingleLanguage);
    } else if (mode === 'multi-language') {
        retryButton.addEventListener('click', retryFailedMultiLanguageAudio);
        saveIncompleteButton.addEventListener('click', handleSaveIncompleteMultiLanguage);
    }

    // Insert the new buttons before the reload button
    reloadButton.parentElement.insertBefore(retryButton, reloadButton);
    reloadButton.parentElement.insertBefore(saveIncompleteButton, reloadButton);
}

/**
 * Saves the multi-language audiobook with all currently successful parts.
 */
async function handleSaveIncompleteMultiLanguage() {
    console.log("User chose to save incomplete multi-language audiobook.");

    // Hide all action buttons to prevent further actions
    document.getElementById('retry-failed-button')?.remove();
    document.getElementById('save-incomplete-button')?.remove();
    document.getElementById('reload-page-button')?.classList.add('hide');

    const statArea = document.getElementById('stat-area');

    try {
        if (multiLangAudioCache.size > 0 && currentAudioSequenceForAssembly.length > 0) {
            if (statArea) statArea.value += `\n\n--- ${fetchTranslation('statusSavingIncomplete', currentLanguage)} ---`;
            console.log("Assembling incomplete audio file from cache...");

            const finalAudioParts = [];
            for (const sentenceSequence of currentAudioSequenceForAssembly) {
                for (const key of sentenceSequence) {
                    if (multiLangAudioCache.has(key)) {
                        finalAudioParts.push(multiLangAudioCache.get(key));
                    }
                    // We intentionally skip parts not in the cache
                }
            }

            console.log(`Concatenating ${finalAudioParts.length} successful audio parts...`);
            const combinedAudioData = concatenateUint8Arrays(finalAudioParts);
            const finalFilename = `${multiLangBaseFilename}_incomplete.mp3`;
            console.log(`Saving combined audio as ${finalFilename}`);
            const audioBlob = new Blob([combinedAudioData.buffer], { type: 'audio/mpeg' });
            saveAs(audioBlob, finalFilename);

            if (statArea) {
                const message = formatString(fetchTranslation('statusCombinedAudioSaved', currentLanguage), finalFilename);
                statArea.value += `\n--- ${message} ---`;
                statArea.scrollTop = statArea.scrollHeight;
            }
        } else {
            console.error("No successful audio parts found to merge.");
            if (statArea) statArea.value += `\n--- ${fetchTranslation('alertNoAudioPartsToMerge', currentLanguage)} ---`;
            alert(fetchTranslation('alertNoAudioPartsToMerge', currentLanguage));
        }
    } catch (error) {
        console.error("Error during incomplete audio merging or saving:", error);
        if (statArea) {
            const message = formatString(fetchTranslation('alertMergeSaveError', currentLanguage), error.message);
            statArea.value += `\n--- ${message} ---`;
        }
    } finally {
        // Show reload button again after saving is done
        document.getElementById('reload-page-button')?.classList.remove('hide');

        // Final state cleanup
        multiLangAudioCache.clear();
        failedMultiLanguageTasks = [];
        currentPipelineManager = null;
        // cleanupTaskInstances is not needed here as we didn't run a pipeline, just used the cache.
    }
}


/**
 * Initiates a new pipeline run with only the multi-language tasks that previously failed.
 */
async function retryFailedMultiLanguageAudio() {
    if (failedMultiLanguageTasks.length === 0) {
        console.warn("Retry called but no failed multi-language tasks are stored.");
        return;
    }
    console.log(`Retrying ${failedMultiLanguageTasks.length} failed multi-language tasks...`);

    // 1. Hide buttons
    document.getElementById('retry-failed-button')?.remove();
    document.getElementById('save-incomplete-button')?.remove();
    document.getElementById('reload-page-button')?.classList.add('hide');

    // 2. Get UI elements
    const statArea = document.getElementById('stat-area');
    const progressBar = document.getElementById('progress-bar');
    const progressInfo = document.getElementById('progress-info');

    // 3. Reset UI for retry
    const retryMsg = formatString(fetchTranslation('statusRetryingAmount', currentLanguage), failedMultiLanguageTasks.length);
    if (statArea) statArea.value = retryMsg + "\n";
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.style.backgroundColor = '';
    }

    if (progressInfo) {
        const processedText = fetchTranslation('statusProcessed', currentLanguage);
        const etaText = fetchTranslation('eta', currentLanguage);
        const calculatingText = fetchTranslation('statusCalculating', currentLanguage);
        progressInfo.innerHTML = `<span>${processedText}: ${multiLangAudioCache.size} / ${multiLangJobTotalTasks}</span> | <span>${etaText}: ${calculatingText}</span>`;
    }

    // 4. Get tasks and clear array
    const tasksToRetry = [...failedMultiLanguageTasks];
    failedMultiLanguageTasks = [];

    // 5. Configure and Start a new pipeline
    const pipelineConfig = {
        tasks: tasksToRetry, // Multi-language tasks are objects with all settings
        audioSettings: {}, // Not needed as tasks are self-contained
        concurrencyLimit: parseInt(document.querySelector('.max-threads')?.value || '10', 10),
        baseFilename: multiLangBaseFilename,
        statArea: statArea,
        onProgress: handleMultiLangAudioProgress,
        onComplete: (completionData) => handleMultiLangAudioComplete(completionData, currentAudioSequenceForAssembly),
        onError: handleMultiLangAudioError
    };

    console.log("Creating and starting AudioPipelineManager for multi-language retry...");
    try {
        multiLangPipelineManager = new AudioPipelineManager(pipelineConfig);
        await sleep(50);
        multiLangPipelineManager.start();
        console.log("--- Multi-language retry pipeline STARTED ---");
    } catch (error) {
        console.error("Failed to create or start multi-language retry pipeline:", error);
        const errorMsgTemplate = fetchTranslation('alertPipelineError', currentLanguage);
        handleMultiLangAudioError(formatString(errorMsgTemplate, error.message));
        document.getElementById('reload-page-button')?.classList.remove('hide');
    }
}
