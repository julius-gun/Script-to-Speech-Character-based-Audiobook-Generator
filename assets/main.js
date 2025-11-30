// main.js - Entry point and orchestration

// --- Global Variables ---
let currentLanguage = 'en'; // Default language
// const uiTranslationsCache = {}; // Cache for UI translations (Note: fetchTranslation now uses cookies, this might be redundant)
// languageData is now in language_data.js
// prioritizedLanguages is now in config.js
// translations is now in ui_translations.js
// voicesData is now in voices-data.js

// Calculate language codes and max length after languageData is loaded
let languageCodes = [];
let maxCodeLength = 0;

