// Contains general UI helper functions like formatting time, opening new windows, etc.

// Depends on:
// - Globals: currentLanguage (main.js), translations (ui_translations.js)

/**
 * Simple string formatting function. Replaces placeholders like {0}, {1} with arguments.
 * Example: formatString("Hello {0}, you have {1} messages.", "User", 5)
 *          // Output: "Hello User, you have 5 messages."
 * @param {string} str The string template.
 * @param {...*} args Values to substitute into the template.
 * @returns {string} The formatted string.
 */
function formatString(str, ...args) {
  if (!str) return ''; // Handle null or empty string input
  return str.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined'
      ? args[number]
      : match // Keep original placeholder if argument is missing
      ;
  });
}


function formatTime(milliseconds) {
  if (!isFinite(milliseconds) || milliseconds < 0) {
    return 'N/A'; // Or 'Calculating...' or similar
  }
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  let timeString = '';
  if (hours > 0) {
    timeString += `${hours}h `;
  }
  if (minutes > 0 || hours > 0) {
    // Pad minutes with leading zero if hours are shown or if minutes > 0
    timeString += `${(hours > 0 && minutes < 10) ? '0' : ''}${minutes}m `;
  }
  // Pad seconds with leading zero if minutes or hours are shown
  timeString += `${(minutes > 0 || hours > 0) && seconds < 10 ? '0' : ''}${seconds}s`;


  return timeString.trim();
}

function openBookView() {
  const outputContent = document.getElementById('output').innerHTML;
  const themeClass = document.body.className;

  // Get translated title (Synchronous call)
  const windowTitle = fetchTranslation('bookViewWindowTitle', currentLanguage);

  // Define specific CSS for the book view window
  const bookViewStyles = `
        /* Basic body styling */
        body {
          padding: 20px;
          font-family: Arial, sans-serif;
          line-height: 1.6; /* Improve readability */
        }
  
        /* Theme styles (copied and adapted from styles.css) */
        body.bw {
          color: rgb(0, 0, 0);
          background-color: rgb(255, 255, 255);
        }
        body:not(.bw) { /* Default theme */
          color: rgb(53, 39, 0);
          background-color: rgb(255, 234, 203);
        }
        body.bw .paragraph {
            border-bottom-color: #ccc; /* Lighter border for BW theme */
        }
        body:not(.bw) .paragraph {
            border-bottom-color: #e0cba8; /* Theme-appropriate border */
        }
  
  
        /* Paragraph container */
        .paragraph {
          display: flex;
          /* Use gap for spacing between columns */
          gap: 15px; /* Adjust gap as needed */
          margin-bottom: 1em;
          border-bottom: 1px solid #eee; /* Add a light separator line */
          padding-bottom: 1em;
        }
  
        /* Base style for all columns */
        .source, .lang-column {
          /* Distribute space, allow shrinking, but base width is key */
          flex-grow: 1;
          flex-shrink: 1;
          /* Assign a basis percentage. e.g., for 1 source + 2 targets (3 cols) ~33% */
          /* This might need dynamic adjustment if the number of columns varies widely, */
          /* but a fixed percentage often works well enough for up to 4-5 columns. */
          flex-basis: 18%; /* Example: Good starting point for up to 5 columns */
          padding: 5px;
          /* Crucial for preventing overflow and ensuring wrapping */
          overflow-wrap: break-word;
          word-wrap: break-word; /* Legacy fallback */
          word-break: break-word; /* Force break */
          /* Optional: Add border for debugging column boundaries */
          /* border: 1px dotted gray; */
        }
  
        /* Right-to-left text alignment */
        .rtl {
          text-align: right;
          direction: rtl; /* Ensure proper RTL rendering */
        }
  
        /* Style for the horizontal rule if needed */
        hr {
          margin-top: 10px;
          margin-bottom: 20px;
          border: 0;
          border-top: 1px solid #ccc;
        }
        body.bw hr {
            border-top-color: #aaa;
        }
        body:not(.bw) hr {
            border-top-color: #b5722a;
        }
      `;

  const bookViewWindow = window.open('', '_blank');
  if (bookViewWindow) {
    bookViewWindow.document.open();
    bookViewWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${windowTitle}</title> <!-- Use translated title -->
            <style>
              ${bookViewStyles}
            </style>
          </head>
          <body class="${themeClass}">
            ${outputContent}
          </body>
          </html>
        `);
    bookViewWindow.document.close();
  } else {
    // Use synchronous fetchTranslation for the alert
    const alertMsg = fetchTranslation('alertPopupBlocked', currentLanguage);
    alert(alertMsg);
  }
}

function reloadPage() {
  window.location.reload();
}

function toggleInfo() {
  const infoElement = document.querySelector("#info");
  if (infoElement) { // Check if element exists
    infoElement.classList.toggle("hide");
  }
}

function copy() {
  // Get the text field
  var text = "Hello World"; // Example text, likely needs modification
  // TODO: Determine what text should actually be copied. This seems like placeholder code.
  // If it's meant to copy the source text:
  // const sourceTextArea = document.getElementById('source-text');
  // if (sourceTextArea) {
  //   text = sourceTextArea.value;
  // } else {
  //   console.warn("Source text area not found for copying.");
  //   return; // Exit if source text area doesn't exist
  // }

  // Copy the text inside the text field
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      // Optional: Provide feedback to the user that text was copied
      // console.log("Text copied to clipboard.");
      // alert("Text copied!"); // Or use a more subtle notification
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Fallback or error message
    });
  } else {
    console.warn("Clipboard API not available.");
    // Implement fallback using document.execCommand('copy') if needed for older browsers,
    // but it's generally less secure and might require temporary elements.
  }
}

/**
 * Gets the currently selected target languages and their corresponding voices.
 * Only includes languages where the container is visible and both language and voice are selected.
 * @returns {object} An object mapping target language codes to voice names, e.g., {'fr-FR': 'voice-id-1', 'es-ES': 'voice-id-2'}
 */
function getSelectedTargetLanguagesAndVoices() {
  const targetVoicesMap = {};
  const maxLanguages = 4; // Assuming max 4 target languages

  for (let i = 1; i <= maxLanguages; i++) {
    const container = document.getElementById(`tl${i}-container`);
    const langSelect = document.getElementById(`tl${i}`);
    const voiceSelect = document.getElementById(`tl${i}-voice`);

    // Check container visibility, language selection, and voice selection
    if (container && !container.classList.contains('hide') &&
      langSelect && langSelect.value &&
      voiceSelect && voiceSelect.value) {
      targetVoicesMap[langSelect.value] = voiceSelect.value;
    }
  }
  console.log("Selected Target Languages & Voices:", targetVoicesMap); // Log the result
  return targetVoicesMap;
}




function toggleTheme() {
  const body = document.body;
  body.classList.toggle('bw');
  // Optional: Save theme preference to localStorage
  // try {
  //   const theme = body.classList.contains('bw') ? 'bw' : 'default';
  //   localStorage.setItem('themePreference', theme);
  // } catch (e) {
  //   console.warn("Could not save theme preference to localStorage:", e);
  // }
}

// Note: Consider adding a function to load the theme preference on startup in initialization.js
// e.g.,
// function loadThemePreference() {
//   try {
//     const savedTheme = localStorage.getItem('themePreference');
//     if (savedTheme === 'bw') {
//       document.body.classList.add('bw');
//     } else {
//       document.body.classList.remove('bw'); // Ensure default if not 'bw' or not set
//     }
//   } catch (e) {
//     console.warn("Could not load theme preference from localStorage:", e);
//   }
// }
// Call loadThemePreference() inside the DOMContentLoaded listener in initialization.js.