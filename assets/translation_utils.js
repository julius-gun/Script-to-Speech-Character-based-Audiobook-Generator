// Contains text processing utility functions

function splitIntoSentences(text) {
  // 1. Normalize newlines to spaces
  let cleanText = text.replace(/\n/g, " ");

  // 2. Fix missing spaces (Sanitization)
  // Case A: "drawing.Men" -> "drawing. Men" (Lowercase, Punctuation, Uppercase)
  cleanText = cleanText.replace(/(\p{Ll})([.?!])(\p{Lu})/gu, "$1$2 $3");
  // Case B: "baobabs!”My" -> "baobabs!” My" (Punctuation, Quote, Uppercase)
  cleanText = cleanText.replace(/([.?!]['"”])(\p{Lu})/gu, "$1 $2");
  // Case C: "knowing it;and" -> "knowing it; and" (Semicolon followed by any letter)
  cleanText = cleanText.replace(/([;])(\p{L})/gu, "$1 $2");

  // // 3. Use Intl.Segmenter if available (The "Better Structured Solution")
  // if (typeof Intl !== 'undefined' && Intl.Segmenter) {
  //   const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  //   return Array.from(segmenter.segment(cleanText))
  //     .map(segment => segment.segment.trim())
  //     .filter(s => s.length > 0);
  // }

  // 4. Fallback Regex
  // Updated (?:\s+) to \s* to allow splitting even if space is missing (though step 2 covers most cases)
  const standardSplit = "(?<!\\p{Lu}\\.\\p{Ll}\\.)(?<![A-Z][a-z]\\.)(?<![A-Z]\\.)(?<!etc\\.)(?<!e\\.g\\.)(?<!i\\.e\\.)(?<!\\p{Lu}\\.)(?<=[.?!]['\"”]?)\\s+(?=(?:['\"“]\\s*)?[\\p{Lu}\\p{N}])";
  
  // Rule 2: Semicolon (;)
  // - Can be followed by ANY letter (\p{L}) or Number (allows lowercase start), optionally preceded by an opening quote
  const semicolonSplit = "(?<=;['\"”]?)\\s+(?=(?:['\"“]\\s*)?[\\p{L}\\p{N}])";

  const sentenceRegex = new RegExp(`${standardSplit}|${semicolonSplit}`, "gu");

  let sentences = cleanText.split(sentenceRegex);
  return sentences.filter(sentence => sentence.trim() !== ""); // Remove empty sentences
}


// NEW FUNCTION: Merge short sentences
function mergeShortSentences(sentences) {
  const mergedSentences = [];
  const minLength = 3; // Minimum length for a sentence
  let previousSentence = "";

  for (const sentence of sentences) {
    if (sentence.trim().length < minLength && previousSentence.length > 0) {
      // Merge with the previous sentence
      previousSentence = previousSentence.trimEnd() + " " + sentence;
    } else {
      // Add the previous sentence (if any) to the result
      if (previousSentence.length > 0) {
        mergedSentences.push(previousSentence);
      }
      previousSentence = sentence;
    }
  }

  // Add the last sentence
  if (previousSentence.length > 0) {
    mergedSente  // 1. Normalize newlines to spaces
    let cleanText = text.replace(/\n/g, " ");

    // 2. Fix missing spaces between sentences (e.g., "drawing.Men" -> "drawing. Men")
    // Look for: Lowercase letter (\p{Ll}) + Punctuation + Uppercase letter (\p{Lu})
    cleanText = cleanText.replace(/(\p{Ll})([.?!])(\p{Lu})/gu, "$1$2 $3");

    // 3. Use Intl.Segmenter if available (The "Better Structured Solution")
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
      return Array.from(segmenter.segment(cleanText))
        .map(segment => segment.segment.trim())
        .filter(s => s.length > 0);
    }

    // 4. Fallback Regex
    // Updated (?:\s+) to \s* to allow splitting even if space is missing (though step 2 covers most cases)
    const sentenceRegex = /(?<!\p{Lu}\.\p{Ll}\.)(?<![A-Z][a-z]\.)(?<![A-Z]\.)(?<!etc\.)(?<!e\.g\.)(?<!i\.e\.)(?<!\p{Lu}\.)(?<=\.|\?|!|。|？|！)\s*(?=(?:\p{Lu}|\p{N}|\s))/gu;

    return cleanText.split(sentenceRegex).filter(sentence => sentence.trim() !== "");
    nces.push(previousSentence);
  }

  return mergedSentences;
}

function createTranslationBatches(sentences, maxLength) {
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const sentenceLength = sentence.length + 1; // +1 for the newline

    if (currentLength + sentenceLength > maxLength && currentBatch.length > 0) {
      // If adding the sentence exceeds the max length, start a new batch
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }

    currentBatch.push(sentence);
    currentLength += sentenceLength;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch); // Add the last batch
  }

  return batches;
}

function sleep(min_ms = 1, max_ms = 5) {
  const random_ms = Math.random() * (max_ms - min_ms) + min_ms;
  return new Promise(resolve => setTimeout(resolve, random_ms));
}