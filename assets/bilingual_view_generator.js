// Contains the logic for generating the bilingual text view.

// Depends on:
// - Globals: currentLanguage (main.js)
// - Functions:
//   - detectLanguage, translateBatch (translation_api.js)
//   - splitIntoSentences, mergeShortSentences, createTranslationBatches, sleep (translation_utils.js)
//   - updateProgress (progress_bar.js)
//   - displayTranslatedBatch (ui.js)
//   - getSelectedTargetLanguagesAndVoices (ui_helpers.js) // Added dependency
// - UI Elements: source-text, sl, sl-voice, tl[1-4]-container, tl[1-4], tl[1-4]-voice, output, stat-area, progress-container, progress-info, translation-finished-message, open-book-view-button, save-epub-button, reload-page-button

async function generateBilingualBook() {
    console.log("Starting Bilingual Generation Process");

    document.getElementById('translation-finished-message')?.classList.add('hide');
    document.getElementById('open-book-view-button')?.classList.add('hide');
    document.getElementById('save-epub-button')?.classList.add('hide');
    document.getElementById('reload-page-button')?.classList.add('hide');

    const sourceText = document.getElementById('source-text').value;
    let sourceLang = document.getElementById('sl').value;
    // Get selected source voice (though not directly used in bilingual text view)
    const sourceVoice = document.getElementById('sl-voice').value;
  
    if (sourceLang === 'auto') {
      // detectLanguage is defined in translation_api.js
      sourceLang = await detectLanguage(sourceText) || 'en'; // Default to English if detection fails
      }

    // --- Get Selected Target Languages using Helper ---
    // getSelectedTargetLanguagesAndVoices is defined in ui_helpers.js
    const targetVoicesMap = getSelectedTargetLanguagesAndVoices();
    const targetLangs = Object.keys(targetVoicesMap); // Get language codes from the map keys
    // Note: targetVoices array is not needed for bilingual text view, only the languages.
  
    console.log("Source Language:", sourceLang);
    console.log("Source Voice:", sourceVoice);
    console.log("Target Languages:", targetLangs);

    // Check if any target languages were actually selected
    if (targetLangs.length === 0) {
        alert("Please select at least one target language."); // Or use fetchTranslation
        // Potentially hide progress bar again if shown prematurely
        document.getElementById('progress-container')?.classList.add('hide');
        document.getElementById('progress-info')?.classList.add('hide');
        return; // Stop execution
    }

  
    const bookContainer = document.getElementById('output');
    bookContainer.innerHTML = ''; // Clear previous bilingual output
  
    // Clear status area from previous runs (audio or bilingual)
    const statArea = document.getElementById('stat-area');
    if (statArea) statArea.value = '';
    statArea?.classList.add('hide'); // Hide status area for bilingual mode
  
    // Show progress bar for translation
    document.getElementById('progress-container').classList.remove('hide'); // Use classList
    document.getElementById('progress-info').classList.remove('hide');    // Use classList
  
    // splitIntoSentences is defined in translation_utils.js
    const sentences = splitIntoSentences(sourceText);
    // mergeShortSentences is defined in translation_utils.js
    const mergedSentences = mergeShortSentences(sentences); // Merge short sentences
    // createTranslationBatches is defined in translation_utils.js
    const batches = createTranslationBatches(mergedSentences, 600);  // 600 char limit
    const totalSentences = mergedSentences.length;
    let translatedSentencesCount = 0;
    let startTime = Date.now();
  
    // Initialize progress bar (using the translation progress function)
    // updateProgress is defined in progress_bar.js
    updateProgress(0, totalSentences, startTime);
  
    // Translate batches concurrently
    // translateBatch is defined in translation_api.js
    // currentLanguage is a global variable from main.js
    const translationPromises = batches.map(batch =>
      translateBatch(batch, sourceLang, targetLangs, currentLanguage) // Pass targetLangs array
    );
  
    // Use Promise.all to wait for all batches, but process each as it completes
    for (const promise of translationPromises) {
      const { batch: translatedBatch, translations: batchTranslations } = await promise; // Renamed local variable
      // displayTranslatedBatch is defined in ui.js
      displayTranslatedBatch(translatedBatch, batchTranslations, sourceLang, targetLangs); // Pass targetLangs array
  
      translatedSentencesCount += translatedBatch.length;
      updateProgress(translatedSentencesCount, totalSentences, startTime);
      // sleep is defined in translation_utils.js
      await sleep(100, 300); // Random delay
    }
  
    // Comment out or remove the lines that delete the '.del' element
    // const elementToDelete = document.querySelector('.del');
    // if (elementToDelete) {
    //   elementToDelete.remove();
    // }
  
    // Optionally keep or remove the info element
    const infoElement = document.querySelector('#info');
    if (infoElement) {
      // infoElement.remove(); // Keep this line if you still want to remove the info box
      // Or hide it instead:
      // infoElement.classList.add('hide');
    }
  
    // Comment out or remove this line as it's likely not needed anymore
    // text = document.body.innerHTML.replaceAll(" ", "");
  
    document.getElementById('translation-finished-message').classList.remove('hide');
    // Remove 'hide' class from each button individually
    document.getElementById('open-book-view-button').classList.remove('hide');
    document.getElementById('save-epub-button').classList.remove('hide');
    document.getElementById('reload-page-button').classList.remove('hide');
  }