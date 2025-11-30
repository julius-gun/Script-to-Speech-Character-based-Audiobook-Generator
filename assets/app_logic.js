// Contains the core application logic for generating character-based audiobooks.

// Depends on:
// - Globals: currentLanguage (main.js)
// - Functions:
// - generateCharacterAudiobook (audio_character_based.js)
// - fetchTranslation (translation_api.js)

// Handler function to decide which generation process to start
async function handleGenerateButtonClick() {
    console.log("Generate button clicked - Character Mode");
    const sourceText = document.getElementById('source-text').value;

    if (!sourceText || sourceText.trim() === "") {
        alert(fetchTranslation('alertEnterSourceText', currentLanguage));
        return;
    }

    // Check if analysis has been done
    if (typeof isCharacterModeActive !== 'undefined' && isCharacterModeActive) {
        await generateCharacterAudiobook();
    } else {
        // If user clicks Generate without analyzing, try to analyze first or warn
        // Better to warn or auto-analyze. Let's auto-analyze then generate.
        console.log("Auto-analyzing before generation...");
        handleAnalyzeCharacters(); // This sets isCharacterModeActive = true if successful
        
        // If analysis was successful (we can check parsedSentences length), proceed
        if (typeof parsedSentences !== 'undefined' && parsedSentences.length > 0) {
             // Give the user a moment to see the mapping? 
             // Actually, usually user wants to see mapping first.
             // Let's just run it if they insist, using defaults.
             await generateCharacterAudiobook();
        }
    }
}
