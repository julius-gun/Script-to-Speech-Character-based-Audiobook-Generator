// Contains functions for interacting with the translation API and cookies

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, expiryDays = 30) {
  const date = new Date();
  date.setDate(date.getDate() + expiryDays);
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

async function detectLanguage(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[2]) {
      return data[2]; // Language code is usually in data[2]
    } else {
      console.warn('Language detection failed or no language code returned.');
      return null;
    }
  } catch (error) {
    console.error('Language detection error:', error);
    return null;
  }
}

// NEW: Function to ensure translations for a given language are loaded
async function ensureTranslationsAvailable(targetLang) {
  if (targetLang === 'en' || (translations[targetLang] && Object.keys(translations[targetLang]).length >= Object.keys(translations.en).length)) {
      // English needs no translation, or language is already fully loaded (basic check)
      // A more robust check could compare keys if partial loading was possible.
      console.log(`Translations for ${targetLang} are already available or not needed.`);
      return;
  }

  console.log(`Ensuring translations are available for: ${targetLang}`);
  const englishKeys = Object.keys(translations.en);
  const missingKeys = englishKeys.filter(key => !translations[targetLang]?.[key]);

  if (missingKeys.length === 0) {
      console.log(`No missing translations found for ${targetLang}.`);
      return; // All keys already exist for this language
  }

  console.log(`Fetching ${missingKeys.length} missing translations for ${targetLang}...`);

  // Prepare batch for API call
  const textsToTranslate = missingKeys.map(key => translations.en[key]);
  const batchSize = 100; // Google Translate API has limits, batch if necessary
  let allTranslatedTexts = [];

  for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize);
      const batchText = batch.join('\n'); // Use newline as a separator
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(batchText)}`;

      try {
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          // Extract translated sentences. Structure might vary slightly, be robust.
          let translatedBatch = [];
          if (data && data[0]) {
              translatedBatch = data[0].map(item => item[0]).join("").split('\n');
          }

          // Basic validation: Check if the number of translated lines matches the batch size
          if (translatedBatch.length !== batch.length) {
               console.warn(`Mismatch in translation count for ${targetLang}. Expected ${batch.length}, got ${translatedBatch.length}. API Response:`, data);
               // Attempt to pad with original text or placeholders for missing ones
               const correctedBatch = [];
               let transIdx = 0;
               for(let k=0; k < batch.length; k++) {
                   // This simple split/join might merge intended newlines in source strings.
                   // A more robust approach might use unique separators or multiple requests.
                   // For UI strings, newlines are less common, so this might be acceptable.
                   correctedBatch.push(translatedBatch[transIdx] || batch[k]); // Fallback to original English text
                   transIdx++;
               }
               translatedBatch = correctedBatch;
               // Fallback: Use original English text for the whole batch on severe mismatch
               // translatedBatch = batch;
          }

          allTranslatedTexts = allTranslatedTexts.concat(translatedBatch);
          await sleep(50, 150); // Small delay between batches if needed

      } catch (error) {
          console.error(`Error fetching UI translations batch for ${targetLang}:`, error);
          // On error for a batch, use original English text for those keys
          allTranslatedTexts = allTranslatedTexts.concat(batch);
          // Potentially add a retry mechanism here
      }
  }


  // Populate the global translations object
  if (!translations[targetLang]) {
      translations[targetLang] = {};
  }

  missingKeys.forEach((key, index) => {
      // Ensure index is within bounds of potentially incomplete translations
      if (index < allTranslatedTexts.length) {
          translations[targetLang][key] = allTranslatedTexts[index];
      } else {
          // Fallback if translation is missing for some reason
          translations[targetLang][key] = translations.en[key];
          console.warn(`Translation missing for key "${key}" in language "${targetLang}" after fetch. Falling back to English.`);
      }
  });

  console.log(`Translations for ${targetLang} populated.`);
}


// SIMPLIFIED: Synchronous function to get translation from the global object
function fetchTranslation(key, targetLang) {
    // Ensure `translations` and `translations.en` are available
    if (typeof translations === 'undefined' || typeof translations.en === 'undefined') {
        console.error("Global 'translations' object or 'translations.en' is not initialized.");
        return `[ERR: ${key}]`; // Return error placeholder
    }

    // 1. Try the target language
    if (translations[targetLang] && translations[targetLang][key] !== undefined) {
        return translations[targetLang][key];
    }

    // 2. Fallback to English
    if (translations.en[key] !== undefined) {
        // Optionally log fallback? Only if targetLang wasn't 'en' initially.
        // if (targetLang !== 'en') {
        //     console.warn(`Translation key "${key}" not found for "${targetLang}". Using English fallback.`);
        // }
        return translations.en[key];
    }

    // 3. Key not found anywhere (error case)
    console.warn(`Translation key "${key}" not found in English definitions.`);
    return `[${key}]`; // Return the key itself as a fallback indicator
  }


async function translateBatch(batch, sourceLang, targetLangs, currentUiLang) {
  const batchText = batch.join('\n'); // Join sentences with newlines
  const translationsResult = {}; // Renamed to avoid conflict with global translations object

  for (const targetLang of targetLangs) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(batchText)}`;
      let response = await fetch(url);
      if (!response.ok) { // Check if the request was successful
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      let data = await response.json();
      
      // The main translation is in the first element of the outer array.
      // It's an array of segments, and each segment is an array where the first element is the translated text.
      let translatedText = data[0].map(item => item[0]).join("");

      // Basic length check (you might want more sophisticated checks)
      if (translatedText.length < 0.4 * batchText.length) {
        console.log(`Re-translating batch to ${targetLang} due to length`);
        response = await fetch(url); // Re-fetch
        if (!response.ok) {
             throw new Error(`HTTP error on retry! status: ${response.status}`);
        }
        data = await response.json();
        // data.splice(data.length - 7, 7);
        translatedText = data[0].map(item => item[0]).join("");
      }
      translationsResult[targetLang] = translatedText.split('\n'); //split back
    } catch (error) {
      console.error('Translation error:', error);
      // Use the passed currentUiLang parameter to get the correct error message
      // Accesses the global 'translations' object defined in ui_translations.js
      const errorMsg = fetchTranslation('translationError', currentLanguage);
      translationsResult[targetLang] = batch.map(() => errorMsg);
    }
  }

  return { batch, translations: translationsResult }; // Return the results under the 'translations' key as expected
}