// Contains helper functions for audio generation tasks

/**
 * Creates and runs a single SocketEdgeTTS task.
 * @param {object} taskConfig - Configuration for the task.
 * @param {number} taskConfig.index - The index of this task.
 * @param {string} taskConfig.text - The text to synthesize.
 * @param {string} taskConfig.voice - The formatted voice name for SSML.
 * @param {string} taskConfig.rate - The speech rate (e.g., "+0%").
 * @param {string} taskConfig.pitch - The speech pitch (e.g., "+0Hz").
 * @param {string} taskConfig.volume - The speech volume (e.g., "+0%").
 * @param {string} taskConfig.baseFilename - Base name for potential file saving.
 * @param {string} taskConfig.fileNum - The file number string (e.g., "0001").
 * @param {HTMLElement} taskConfig.statArea - The status display area.
 * @param {boolean} taskConfig.mergeEnabled - Whether merging is intended (passed to SocketEdgeTTS).
 * @param {object} taskConfig.retrySettings - Retry configuration object.
 * @param {function(number, boolean, SocketEdgeTTS)} completionCallback - Called when the task finishes or fails.
 *                                      Provides (index, errorOccurred, instance).
 * @returns {SocketEdgeTTS} The created SocketEdgeTTS instance.
 */
function createAndRunAudioTask(taskConfig, completionCallback) {
    console.log(`Creating task ${taskConfig.index + 1}: Voice=${taskConfig.voice}, FileNum=${taskConfig.fileNum}`);

    const ttsInstance = new SocketEdgeTTS(
        taskConfig.index,
        taskConfig.baseFilename,
        taskConfig.fileNum,
        taskConfig.voice,
        taskConfig.pitch,
        taskConfig.rate,
        taskConfig.volume, // Volume
        taskConfig.text,
        taskConfig.statArea,
        taskConfig.mergeEnabled, // Pass merge flag
        // Completion Callback Wrapper
        (completedIndex, errorOccurred) => {
            // Pass the instance itself along with index and error status
            completionCallback(completedIndex, errorOccurred, ttsInstance);
        },
        taskConfig.retrySettings // --- ADDED: Pass retry settings to constructor ---
    );
    // Note: SocketEdgeTTS constructor now calls start_works() internally

    return ttsInstance;
}


/**
 * Cleans up all task instances by calling their clear() method.
 * @param {Array<SocketEdgeTTS|null>} results - Array of task instances.
 */
function cleanupTaskInstances(results) {
    if (!results) return;
    console.log(`Cleaning up ${results.length} task instance slots.`);
    results.forEach((instance, index) => {
        if (instance && typeof instance.clear === 'function') {
            // console.log(`Clearing instance ${index + 1}`);
            instance.clear();
        }
        // Ensure the slot in the original array is nullified if needed elsewhere,
        // though the pipeline manager is usually discarded after completion.
        // results[index] = null; // Optional: Nullify the slot
    });
}


/**
 * Creates a ZIP archive containing individual MP3 files from successful task results
 * and initiates the download. Cleans up the processed instances afterwards.
 * @param {Array<SocketEdgeTTS>} successfulResults - Array of successful task instances.
 * @param {string} baseFilename - Base name for the ZIP file and internal files.
 * @param {HTMLElement} [statArea=null] - Optional UI element for status updates.
 */
async function saveAsZip_Pipeline(successfulResults, baseFilename, statArea = null) {
    // Helper function to update status area safely
    const updateStatus = (messageKey, ...args) => {
        // Use fetchTranslation to get the template
        const messageTemplate = fetchTranslation(messageKey, currentLanguage);
        const message = formatString(messageTemplate, ...args);
        if (statArea) {
            // Append message on a new line
            statArea.value += `\n${message}`;
            statArea.scrollTop = statArea.scrollHeight; // Scroll to bottom
        }
        console.log(message); // Also log to console
    };

    // Check for JSZip library
    if (typeof JSZip === 'undefined') {
        const errorMsgKey = "alertJszipNotFound";
        updateStatus(errorMsgKey);
        // Use fetchTranslation for the alert
        alert(fetchTranslation(errorMsgKey, currentLanguage)); // User feedback
        // Clean up instances as we cannot proceed
        cleanupTaskInstances(successfulResults);
        return;
    }

    const zip = new JSZip();
    let zipCount = 0;
    const totalFiles = successfulResults.length;

    updateStatus("statusGeneratingZip", `${baseFilename}_${totalFiles}-parts.zip`, totalFiles); // Use key

    // Sort results by indexpart to ensure correct order in the ZIP file (optional but good practice)
    successfulResults.sort((a, b) => a.indexpart - b.indexpart);

    for (const instance of successfulResults) {
        // Double-check instance validity (though input should be pre-filtered)
        if (instance && instance.my_uint8Array && instance.my_uint8Array.length > 0 && instance.my_filenum) {
            const filename = `${baseFilename}_part_${instance.my_filenum}.mp3`;
            // Pass the key to update_stat, it handles translation internally
            instance.update_stat("statusAddingToZip");
            zip.file(filename, instance.my_uint8Array, { binary: true });
            zipCount++;
            await sleep(2); // Tiny sleep to allow UI updates during loop
        } else {
            console.warn(`Skipping invalid instance in saveAsZip_Pipeline: Index ${instance?.indexpart}`);
        }
    }

    if (zipCount > 0) {
        const zipFilename = `${baseFilename}_${zipCount}-parts.zip`;
        updateStatus("statusGeneratingZip", zipFilename, zipCount); // Use key

        try {
            // Generate the ZIP file blob
            const zipBlob = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }, // Balance between speed and compression
                // Progress callback (optional)
                // streamFiles: true // Consider for very large files/memory constraints
            }, (metadata) => {
                // Optional: Update progress during zipping (can be verbose)
                // const percent = metadata.percent.toFixed(0);
                // if (percent % 10 === 0) { // Update every 10%
                //     console.log(`Zipping progress: ${percent}%`);
                // }
            });

            // Initiate download using FileSaver.js
            saveAs(zipBlob, zipFilename);
            updateStatus("statusZipDownloadStarted", zipFilename); // Use key

            // Update status for all included instances AFTER saveAs is called
            for (const instance of successfulResults) {
                if (instance && typeof instance.update_stat === 'function') {
                    instance.update_stat("statusSavedInZip"); // Use key
                }
            }

        } catch (e) {
            const errorMsgKey = "alertZipError";
            // Use fetchTranslation for the template
            const errorMsg = formatString(fetchTranslation(errorMsgKey, currentLanguage), e.message);
            updateStatus(errorMsg); // Pass the formatted message directly
            console.error(errorMsg, e);
            alert(errorMsg); // User feedback

            // Update status for instances to show error
            for (const instance of successfulResults) {
                 if (instance && typeof instance.update_stat === 'function') {
                    // Pass the key to update_stat
                    instance.update_stat("statusZipCreationFailed");
                 }
            }
        } finally {
            // --- IMPORTANT: Clean up instances after attempting to save ---
            // updateStatus("Cleaning up processed audio parts...");
            cleanupTaskInstances(successfulResults); // Clean up the instances passed to this function
            // updateStatus("Cleanup complete.");
        }

    } else {
        updateStatus("alertNoFilesAddedToZip"); // Use key
        // Clean up instances even if none were added (shouldn't happen if successfulResults > 0 initially)
        cleanupTaskInstances(successfulResults);
    }
}


/**
 * Merges results into chunks and saves them.
 * Assumes input array contains only successful instances.
 * Cleans up instances after attempting to save each chunk.
 * @param {Array<SocketEdgeTTS>} successfulResults - Array of successful task instances.
 * @param {string} baseFilename - Base name for files.
 * @param {number} chunkSize - Number of parts per merged file (Infinity for all).
 * @param {HTMLElement} [statArea=null] - Optional UI element for status updates. // Added statArea param
 */
async function doMerge_Pipeline(successfulResults, baseFilename, chunkSize, statArea = null) { // Added statArea param
    const totalParts = successfulResults.length;
    if (totalParts === 0) return;

    // Sort results by indexpart to ensure correct order before merging
    successfulResults.sort((a, b) => a.indexpart - b.indexpart);

    const actualChunkSize = chunkSize === Infinity ? totalParts : chunkSize;
    let mergedFileCount = 0;
    const allProcessedInstances = []; // Keep track of all instances processed across chunks for final cleanup check

    for (let i = 0; i < totalParts; i += actualChunkSize) {
        const chunkStart = i;
        const chunkEnd = Math.min(chunkStart + actualChunkSize, totalParts); // Use exclusive end index for slice
        const chunkInstances = successfulResults.slice(chunkStart, chunkEnd);
        allProcessedInstances.push(...chunkInstances); // Add instances from this chunk to the master list

        if (chunkInstances.length === 0) continue; // Should not happen with successfulResults, but check anyway

        let combinedLength = 0;
        const partsInChunk = [];
        const indicesProcessed = []; // Keep track of original indices if needed, though less critical now

        // Collect audio data from the current chunk
        for (const instance of chunkInstances) {
            if (instance && instance.my_uint8Array && instance.my_uint8Array.length > 0) {
                partsInChunk.push(instance.my_uint8Array);
                combinedLength += instance.my_uint8Array.length;
                // Pass translated status to update_stat
                instance.update_stat(fetchTranslation("statusMerging", currentLanguage));
            } else {
                console.warn(`Skipping invalid instance during merge: Index ${instance?.indexpart}`);
            }
        }

        // If data was collected for this chunk, combine and save
        if (partsInChunk.length > 0 && combinedLength > 0) {
            const firstPartNum = chunkInstances[0]?.my_filenum || "unknown";
            const lastPartNum = chunkInstances[chunkInstances.length - 1]?.my_filenum || "unknown";

            console.log(`Combining audio for merge chunk: Parts ${firstPartNum} to ${lastPartNum}`);
            const combinedUint8Array = new Uint8Array(combinedLength);
            let currentPosition = 0;
            for (const partData of partsInChunk) {
                combinedUint8Array.set(partData, currentPosition);
                currentPosition += partData.length;
            }

            const mergeNum = Math.floor(chunkStart / actualChunkSize) + 1;
            const isSingleFile = actualChunkSize >= totalParts && chunkStart === 0;

            // Save the merged chunk
            await saveMerge_Pipeline(combinedUint8Array, mergeNum, baseFilename, isSingleFile, firstPartNum, lastPartNum, totalParts, statArea); // Pass statArea
            mergedFileCount++;

            // Update status for successfully merged instances in this chunk
            for (const instance of chunkInstances) {
                if (instance && typeof instance.update_stat === 'function') {
                    // Pass translated status to update_stat
                    instance.update_stat(fetchTranslation("statusMergedAndSaved", currentLanguage));
                }
            }
            await sleep(25); // Small delay after saving chunk

        } else {
            console.warn(`Skipping merge for chunk starting at index ${chunkStart}: No valid parts found.`);
        }

        // --- IMPORTANT: Clean up instances belonging to this chunk ---
        console.log(`Cleaning up instances for merge chunk ${chunkStart + 1}-${chunkEnd}...`);
        // cleanupTaskInstances is defined in audio_helpers.js
        cleanupTaskInstances(chunkInstances); // Clean up only the instances processed in this chunk
        console.log("Chunk cleanup complete.");

    } // End loop through chunks

    console.log(`Attempted to save ${mergedFileCount} merged files.`);

}


/**
 * Saves a single merged audio chunk to a file.
 * @param {Uint8Array} combinedData - The combined audio data.
 * @param {number} mergeNum - The sequential number of this merge chunk.
 * @param {string} baseFilename - Base name for the file.
 * @param {boolean} isSingleFile - True if this merge represents the entire output.
 * @param {string} firstPartNum - The file number string (e.g., "0001") of the first part in this chunk.
 * @param {string} lastPartNum - The file number string (e.g., "0050") of the last part in this chunk.
 * @param {number} totalSuccessfulParts - The total number of parts being merged overall.
 * @param {HTMLElement} [statArea=null] - Optional UI element for status updates. // Added statArea param
 */
async function saveMerge_Pipeline(combinedData, mergeNum, baseFilename, isSingleFile, firstPartNum, lastPartNum, totalSuccessfulParts, statArea = null) { // Added statArea param
    const audioBlob = new Blob([combinedData.buffer], { type: 'audio/mpeg' });
    let filename;

    if (isSingleFile) {
        // Filename for a single merged file containing all parts
        filename = `${baseFilename}_${totalSuccessfulParts}-parts.mp3`;
    } else {
        // Filename for a chunk, indicating the range of parts included
        filename = `${baseFilename}_parts_${firstPartNum}-${lastPartNum}.mp3`;
    }

    console.log(`Saving merged file: ${filename}`);

    try {
        saveAs(audioBlob, filename); // FileSaver.js
        // Status updates for individual parts were done in doMerge_Pipeline
        if (statArea) { // Optional status update
            const msg = formatString(fetchTranslation("statusMergedAndSaved", currentLanguage) + ` (${filename})`);
            statArea.value += `\n${msg}`;
            statArea.scrollTop = statArea.scrollHeight;
        }
    } catch (e) {
        console.error(`Error initiating download for merged file ${filename}:`, e);
        // Use fetchTranslation for template
        const alertMsgTemplate = fetchTranslation('alertSaveMergedError', currentLanguage);
        alert(formatString(alertMsgTemplate, filename));
        if (statArea) { // Optional status update
            statArea.value += `\nError saving ${filename}: ${e.message}`;
            statArea.scrollTop = statArea.scrollHeight;
        }
        // Re-throw the error so the caller (doMerge_Pipeline) can potentially handle it? Or just log here.
        // throw e; // Optional: re-throw
    }
    // No instances to clear here, handled in the caller (doMerge_Pipeline)
}

/**
 * Concatenates an array of Uint8Array objects into a single Uint8Array.
 * @param {Array<Uint8Array>} arrays - An array of Uint8Array objects to concatenate.
 * @returns {Uint8Array} A new Uint8Array containing all the data from the input arrays.
 */
function concatenateUint8Arrays(arrays) {
    if (!arrays || arrays.length === 0) {
        return new Uint8Array(0);
    }

    let totalLength = 0;
    for (const arr of arrays) {
        if (arr) { // Ensure array part is not null/undefined
            totalLength += arr.length;
        }
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        if (arr) { // Ensure array part is not null/undefined
            result.set(arr, offset);
            offset += arr.length;
        }
    }
    return result;
}