
// Helper function to insert text into the main source text area
function insertTextIntoSourceArea(text) {
    const sourceTextArea = document.getElementById('source-text');
    if (sourceTextArea) {
        // Append text, adding newlines for separation if the area isn't empty
        if (sourceTextArea.value.trim().length > 0) {
            sourceTextArea.value += '\n\n' + text;
        } else {
            sourceTextArea.value = text;
        }
    } else {
        console.error("Source text area ('source-text') not found.");
    }
}


//FB2 to TXT
function convertFb2ToTxt(fb2String) {
    const parser = new DOMParser();
    // Added newline before <p> for potentially better paragraph separation during parsing
    const fb2Doc = parser.parseFromString(fb2String.replace(/<p>/g, "\n<p>"), 'application/xml');
    let textContent = '';
    const bodyNode = fb2Doc.getElementsByTagName('body')[0];
    if (bodyNode) {
        const sectionNodes = bodyNode.getElementsByTagName('section');
        for (let i = 0; i < sectionNodes.length; i++) {
            const sectionNode = sectionNodes[i];
            // Using textContent which gets text from all descendants
            const sectionText = sectionNode.textContent;
            textContent += sectionText + '\n\n'; // Add double newline after each section
        }
    }
    const txtString = textContent.trim();
    return txtString;
}

//EPUB to TXT
async function convertEpubToTxt(epubBinary) {
    const zip = await JSZip.loadAsync(epubBinary);
    const textFiles = [];
    var toc_path = "";
    var opf_path = ""; // Path to the directory containing content.opf

    // Find OPF file path first to correctly resolve relative paths in OPF
    zip.forEach((relativePath, zipEntry) => {
        if (relativePath.toLowerCase().endsWith('.opf')) {
            opf_path = relativePath.substring(0, relativePath.lastIndexOf('/') + 1);
            // console.log("OPF path found:", opf_path); // Debug log
        }
    });

    // Find NCX path (often relative to OPF or root)
    zip.forEach((relativePath, zipEntry) => {
        if (relativePath.toLowerCase().endsWith('.ncx')) {
            // Assume NCX is relative to OPF if OPF path exists, otherwise relative to root
            toc_path = opf_path ? opf_path : "";
            // console.log("NCX path assumed relative to:", toc_path); // Debug log
        }
    });

    // Fallback: If NCX not found, try finding OPF and parsing its manifest
    let fileOrder = [];
    if (textFiles.length === 0) {
        try {
            const opfFileEntry = zip.filter((relativePath) => relativePath.toLowerCase().endsWith('.opf'))[0];
            if (opfFileEntry) {
                const opfText = await opfFileEntry.async('text');
                const parser = new DOMParser();
                const opfDoc = parser.parseFromString(opfText, 'application/xml');
                const manifestItems = opfDoc.getElementsByTagName('item');
                const spineItems = opfDoc.getElementsByTagName('itemref');
                const itemMap = {};

                for (let item of manifestItems) {
                    const id = item.getAttribute('id');
                    const href = item.getAttribute('href');
                    const mediaType = item.getAttribute('media-type');
                    if (id && href && (mediaType === 'application/xhtml+xml' || mediaType === 'text/html')) {
                        // Resolve href relative to the OPF file's directory
                        itemMap[id] = opf_path + href;
                        // console.log(`Manifest item: id=${id}, resolved href=${itemMap[id]}`); // Debug log
                    }
                }

                for (let itemref of spineItems) {
                    const idref = itemref.getAttribute('idref');
                    if (itemMap[idref]) {
                        fileOrder.push(itemMap[idref]);
                    }
                }
                // console.log("File order from OPF spine:", fileOrder); // Debug log
            }
        } catch (e) {
            console.error("Error parsing OPF file:", e);
        }
    }


    // If OPF parsing failed or didn't yield order, try NCX parsing
    if (fileOrder.length === 0) {
        try {
            const tocFileEntry = zip.filter((relativePath) => relativePath.toLowerCase().endsWith('.ncx'))[0];
            if (tocFileEntry) {
                const tocText = await tocFileEntry.async('text');
                const parser = new DOMParser();
                const tocDoc = parser.parseFromString(tocText, 'application/xml');
                const navPoints = tocDoc.getElementsByTagName('navPoint');
                for (let i = 0; i < navPoints.length; i++) {
                    const content = navPoints[i].getElementsByTagName('content')[0];
                    if (content) {
                        const src = content.getAttribute('src');
                        if (src) {
                            // Resolve src relative to the NCX file's directory (which we assumed relative to OPF or root)
                            const fullPath = toc_path + src.split("#")[0];
                            fileOrder.push(fullPath);
                        }
                    }
                }
                // console.log("File order from NCX navMap:", fileOrder); // Debug log
            }
        } catch (e) {
            console.error("Error parsing NCX file:", e);
        }
    }

    // If still no order, just grab all HTML/XHTML files
    if (fileOrder.length === 0) {
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.toLowerCase().endsWith('.xhtml') || relativePath.toLowerCase().endsWith('.html')) {
                fileOrder.push(relativePath);
            }
        });
         console.log("File order from simple file listing:", fileOrder); // Debug log
    }


    // Process files in determined order
    let textContent = '';
    const processedPaths = new Set(); // Prevent processing the same file multiple times if listed redundantly

    for (const filePath of fileOrder) {
         if (processedPaths.has(filePath)) continue; // Skip if already processed

        const file = zip.file(filePath);
        if (file) {
            try {
                const fileText = await file.async('text');
                const parser = new DOMParser();
                // Try parsing as XHTML first, fallback to HTML
                let htmlDoc = parser.parseFromString(fileText, 'application/xhtml+xml');
                let bodyNode = htmlDoc.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'body')[0];

                // Check for parser errors (common with malformed XHTML)
                const parserError = htmlDoc.getElementsByTagName('parsererror');
                 if (parserError.length > 0 || !bodyNode) {
                    // console.warn(`XHTML parsing failed for ${filePath}, trying HTML.`); // Debug log
                    htmlDoc = parser.parseFromString(fileText, 'text/html');
                    bodyNode = htmlDoc.body;
                 }


                if (bodyNode) {
                    // Extract text more robustly, trying to preserve paragraphs
                    let chapterText = '';
                    const paragraphs = bodyNode.querySelectorAll('p');
                    if (paragraphs.length > 0) {
                        paragraphs.forEach(p => {
                            const trimmedText = p.textContent.trim();
                            if (trimmedText) { // Only add non-empty paragraphs
                                chapterText += trimmedText + '\n'; // Add newline after each paragraph
                            }
                        });
                    } else {
                        // Fallback if no <p> tags found, get all text content
                        chapterText = bodyNode.textContent.trim();
                    }

                    if (chapterText) { // Only add if the chapter had text
                        textContent += chapterText.trim() + '\n\n'; // Add double newline between chapters/files
                        processedPaths.add(filePath); // Mark as processed
                    }
                }
            } catch (e) {
                console.error(`Error processing file ${filePath}:`, e);
            }
        } else {
             console.warn(`File not found in EPUB archive: ${filePath}`); // Debug log
        }
    }
    return textContent.trim(); // Final trim
}


//ZIP to TXT
function convertZipToTxt(zipFile) {
    // Clear existing text before processing ZIP
    const sourceTextArea = document.getElementById('source-text');
    if (sourceTextArea) {
        sourceTextArea.value = '';
    }

    JSZip.loadAsync(zipFile)
        .then(function (zip) {
            const filePromises = []; // Store promises for file processing

            zip.forEach(function (relativePath, file) {
                // Skip directories and hidden files/folders (like __MACOSX)
                if (file.dir || relativePath.startsWith('__MACOSX/')) {
                    return;
                }

                const file_name_toLowerCase = file.name.toLowerCase();
                let processPromise = null;

                if (file_name_toLowerCase.endsWith('.txt') || file_name_toLowerCase.endsWith('.ini')) { // Treat .ini as .txt
                    processPromise = file.async('text').then(result => {
                        // console.log(`Processing TXT/INI from ZIP: ${file.name}`); // Debug log
                        insertTextIntoSourceArea(result); // Use helper function
                    });
                } else if (file_name_toLowerCase.endsWith('.fb2')) {
                    processPromise = file.async('text').then(result => {
                        // console.log(`Processing FB2 from ZIP: ${file.name}`); // Debug log
                        const text = convertFb2ToTxt(result);
                        insertTextIntoSourceArea(text); // Use helper function
                    });
                } else if (file_name_toLowerCase.endsWith('.epub')) {
                    processPromise = file.async('arraybuffer').then(result => {
                        // console.log(`Processing EPUB from ZIP: ${file.name}`); // Debug log
                        // Pass the ArrayBuffer directly to unzip_epub_from_zip
                        return unzip_epub_from_zip(result);
                    });
                }

                if (processPromise) {
                    filePromises.push(processPromise.catch(e => console.error(`Error processing ${file.name} in ZIP:`, e))); // Add error handling per file
                }
            });

            // Wait for all files in the ZIP to be processed
            return Promise.all(filePromises);
        })
        .then(() => {
            console.log("Finished processing ZIP file.");
            // Optional: Add a message to the user or textarea indicating completion
        })
        .catch(function (e) { // Changed from 'err' to 'e' to match usage
            console.error("Error loading or processing ZIP file:", e);
            const alertMsg = translations[currentLanguage]?.alertZipProcError || translations.en.alertZipProcError;
            alert(alertMsg); // User feedback
        });
}

// Modified version specifically for EPUBs extracted from a ZIP
async function unzip_epub_from_zip(epubArrayBuffer) {
    try {
        // console.log("Unzipping EPUB from ZIP buffer..."); // Debug log
        const blob = new Blob([epubArrayBuffer], { type: 'application/epub+zip' });
        // No need to create a File object here, convertEpubToTxt handles Blob/ArrayBuffer
        const text = await convertEpubToTxt(blob);
        insertTextIntoSourceArea(text); // Use helper function
    } catch (e) {
        console.error("Error converting EPUB from ZIP:", e);
        // Optionally insert an error message into the textarea
        // insertTextIntoSourceArea("--- Error processing embedded EPUB ---");
    }
}


// Removed the old unzip_epub function as it's replaced by unzip_epub_from_zip
// function unzip_epub(file, file_text) { [...] }