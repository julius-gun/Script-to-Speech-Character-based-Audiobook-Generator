const translations = {
    en: {
        pageTitle: 'Script-to-Speech Character based Audiobook Generator',
        sourceLabel: 'Language & Default Narrator Voice:',
        targetLabel1: 'Target Language 1:',
        targetLabel2: 'Target Language 2:',
        targetLabel3: 'Target Language 3:',
        targetLabel4: 'Target Language 4:',
        labelVoice: 'Voice:',
        buttonAddLanguage: 'Add target language',
        buttonRemoveLanguage: 'Remove target language',
        enterText: 'Paste your LLM-preprocessed text here...',
        generateButton: 'Generate Audiobook',
        analyzeButton: 'Analyze Characters',
        translated: 'Translated',
        eta: 'Please wait patiently. Estimated Time',
        translationError: 'Translation Error',
        uiLanguage: 'User Interface Language',
        openBookViewButton: 'Open in Book-View',
        saveEpubButton: 'Save as EPUB',
        reloadPageButton: 'Reset / Delete',
        buttonRetryFailed: "Retry Failed",
        buttonSaveIncomplete: "Save Incomplete Audiobook",
        translationFinishedMessage: 'Translation process over.',
        enterSourceTextLabel: 'Script Input:',
        prioritizedLabel: '--- Prioritized ---',
        allLanguagesLabel: '--- All Languages ---',
        multilingualLabel: '--- Multilingual ---',
        headerLanguageLabel: 'Language',
        headerVoiceLabel: 'Voice Selection',
        insertFileButton: 'Insert Text File',
        languages: { // Only keep keys needed for translation lookup
            'auto': 'Autodetect Language'
        },
        statusCompleted: 'Completed',
        statusProcessed: 'Processed',
        statusSentRequest: 'Sent request',
        statusConnecting: 'Connecting...',
        statusErrorSendingRequest: 'Error sending request',
        statusErrorNoAudio: 'Error: No audio data',
        statusErrorEmptyAudio: 'Error: Empty audio',
        statusErrorProcessingAudio: 'Error processing audio',
        statusConnClosed: 'Connection Closed', // Base message, code/reason added dynamically
        statusErrorWebSocketCreate: 'WebSocket Creation Failed',
        statusErrorWebSocketSupport: 'Error: WebSocket Not Supported',
        statusErrorWebSocket: 'WebSocket Error',
        statusRetrying: 'Retrying ({0}/{1})...', // {0} = current retry, {1} = max retries
        statusRetryingAmount: "Retrying {0} failed parts...",
        statusFailedAfterRetries: 'Failed ({0}) after {1} retries.', // {0} = context, {1} = max retries
        statusInitializing: 'Initializing',
        statusQueued: 'Queued',
        statusPending: 'Pending',
        statusIdle: 'Idle',
        statusRunning: 'Running',
        statusStopping: 'Stopping',
        statusError: 'Error', // General error status
        statusSaveError: "Save Error!",
        statusFailed: 'Failed', // Simple failed status
        statusFailedLabel: 'Failed:', // Label in progress info
        statusFailedExclaim: 'Failed!', // Status in progress info
        statusFailedProgress: 'Failed ({0}/{1})', // Progress bar text {0}=failed, {1}=total
        statusFinishedExclaim: 'Finished!', // Status in progress info
        statusCalculating: 'Calculating...', // ETA calculation
        statusAddingToZip: 'Adding to ZIP...',
        statusGeneratingZip: 'Generating ZIP file: {0} (Compressing {1} files)...', // {0} = filename, {1} = count
        statusZipDownloadStarted: 'ZIP file download started: {0}', // {0} = filename
        statusSavedInZip: 'Saved in ZIP',
        statusZipCreationFailed: 'ZIP Creation Failed',
        statusSaving: 'Saving...',
        statusSavingIncomplete: "Saving all successful audio parts...",
        statusDownloadStarted: 'Download Started',
        statusErrorDownloading: 'Error Downloading',
        statusMerging: 'Merging...',
        statusMergingAudio: "Assembling and saving final audio file...",
        statusMergedAndSaved: 'Merged & Saved',
        statusMergeError: "Merge Error!",
        statusCombinedAudioSaved: "Combined audio saved as {0}",
        // Alerts & User Messages
        alertEnterSourceText: 'Please enter the script text first.',
        alertSelectVoice: 'Please select a default narrator voice.',
        alertSelectTargetLang: "Please select at least one target language.",
        alertCouldNotSplit: 'Could not split the text into processable chunks.',
        alertAudioGenerationFailed: 'Audio generation failed: {0} part(s) could not be created after retries.', // {0} = count
        alertTranslationFailed: "The translation process failed. Please check the log and try again.",
        alertJszipNotFound: 'Error: JSZip library not found. Cannot create ZIP.',
        alertJszipLoad: 'Please ensure the library is loaded.',
        alertZipError: 'Error generating or saving ZIP file: {0}', // {0} = error message
        alertNoFilesAddedToZip: 'No valid files were added to the ZIP archive.',
        alertNoAudioTasks: "No audio tasks could be created. This might be due to empty text or translation errors.",
        alertNoAudioPartsToMerge: "Error: No successful audio parts found to merge.",
        alertSaveMergedError: 'Error saving merged file {0}. See console for details.', // {0} = filename
        alertMergeSaveError: "Error during final merge/save: {0}",
        alertPipelineError: 'Audio generation failed: {0}', // {0} = error message
        alertPopupBlocked: 'Could not open book view window. Please check your popup blocker settings.',
        alertFileTypeNotSupported: 'File type "{0}" not supported for text insertion.', // {0} = file extension
        alertFileReadError: 'Error reading file: {0}', // {0} = filename
        alertFb2Error: 'Error processing FB2 file: {0}', // {0} = filename
        alertEpubError: 'Error processing EPUB file: {0}', // {0} = filename
        alertZipProcError: 'Error processing ZIP file. It might be corrupted or contain unsupported file types.',
        alertGenericFileError: 'An error occurred while processing the files. Check the console for details.',
        alertNoCharactersFound: "No character markers found (e.g., [Max]:). Assuming entire text is Narrator.",
        alertNoTextParsed: "No text parsed. Please click 'Analyze Characters' first.",
        // UI Labels, Placeholders, Titles, etc.
        advancedAudioSettingsTitle: 'Advanced Audio Settings',
        labelThreads: 'Instance Count:',
        labelMergeBy: 'Merge MP3 files by:',
        labelRate: 'Speed:',
        labelPitch: 'Pitch:',
        textAll: 'ALL', // For merge slider
        textPieces: 'pcs.', // For merge slider suffix
        placeholderStatArea: 'Status log...',
        titleSettingsButton: 'Settings',
        titleInfoButton: 'About this application',
        infoModalTitle: 'About Script-to-Speech',
        infoModalText1: 'This tool generates character-based audiobooks from pre-processed scripts.',
        infoModalText2: 'Use an LLM to format your text, then paste it here to assign specific voices to each character.',
        infoModalLink: 'Click here to listen to the different voices available via Edge TTS.',
        // Help System (Example)
        helpPeriodReplacementTitle: 'Period Replacement Mode: {0}', // {0} = mode (V1/V2/V3)
        helpPeriodReplacementV1: 'Replaces all periods in the text with the selected character.',
        helpPeriodReplacementV2: 'Preserves periods at line endings, but replaces all other periods with the selected character.',
        helpPeriodReplacementV3: 'Preserves periods at line endings, and replaces only periods followed by spaces with the selected character plus a space.',
        helpPeriodReplacementDefault: 'Click to cycle through modes.',
        // Audio Generation Process Messages
        audioGenFailedMessage: '--- Audio Generation FAILED ---',
        audioGenFailedDetails: '{0} part(s) failed after retries.', // {0} = count
        audioGenFailedNoOutput: 'No output file was generated. Please check the errors above.',
        audioGenSuccessMessage: '--- Audio Generation Finished Successfully ---',
        audioGenSuccessDetails: ' ({0}/{1} parts created)', // {0} = processed, {1} = total
        pipelineErrorMessage: '--- PIPELINE ERROR: {0} ---', // {0} = error message
        pipelineErrorLabel: 'Pipeline Error!', // Label in progress info
        // Voice Dropdown Placeholders
        voiceErrorLoading: 'Error: Voice data not loaded.',
        voiceSelectLanguage: 'Select a language first',
        voiceNoneAvailable: 'No voices available at all',
        voiceFallbackHint: '(Fallback)', // Added to optgroup label when showing all voices
        // Firefox Warning
        firefoxWarningTitle: 'Notice:',
        firefoxWarningBody: 'Firefox may experience issues. Chrome is recommended.',
        // EPUB Metadata
        epubDefaultTitle: 'Audiobook', // For EPUB metadata
        epubDefaultAuthor: 'ScriptToSpeech', // Default author
        epubDefaultFilename: 'Audiobook.epub', // Default EPUB filename
        processingFileDefaultName: 'Script', // Default name in processing_file.js
        bookViewWindowTitle: 'Script View', // Title for the book view popup window
        audioGenerationProgressTitle: "Audio Generation Progress",
        translationProgressTitle: "Translation Progress",
        
        // --- NEW PROMPT TRANSLATIONS ---
        promptSectionTitle: "Instructions for LLM Pre-processing",
        promptIntro: "Copy and paste the following prompt into your LLM (ChatGPT, Claude, etc.) to prepare your book for this generator:",
        promptRole: "You are a script pre-processor for an audiobook generator. I will provide you with a text. Your task is to prepare it for a multi-voice reading.",
        promptRulesTitle: "Rules:",
        promptRule1: "1. The \"Narrator\" is the default speaker. Do NOT mark sentences spoken by the Narrator.",
        promptRule2: "2. For any sentence spoken by a specific character (dialogue), insert a marker at the very beginning of that sentence.",
        promptRule3: "3. The marker MUST be in this format: `[Character Name]:`",
        promptRule4: "4. If a sentence contains both narration and dialogue (e.g., 'Max said, \"Hello.\"'), split it into two separate lines so the narration remains unmarked and the dialogue gets the marker.",
        promptRule5: "5. Do not change the text content other than splitting lines and adding markers.",
        promptExampleInputTitle: "Example Input:",
        promptExampleInput: "Max looked at the horizon. \"It's going to rain,\" he said. Hans shook his head and replied, \"No, it's just mist.\"",
        promptExampleOutputTitle: "Example Output:",
        promptExampleOutput: "Max looked at the horizon.\n[Max]: \"It's going to rain,\"\nhe said.\nHans shook his head and replied,\n[Hans]: \"No, it's just mist.\"",
        promptInsertText: "[INSERT YOUR TEXT HERE]",
        promptFailProofNote: "Make sure that it is fail proof, as [ ] might be used in normal books also.",
        charMappingTitle: "Character Voice Mapping",
        charMappingDesc: "Select a voice for each character detected in the text.",
        closeCharMode: "Close Character Mode"
    },
};
