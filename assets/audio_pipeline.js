// Manages the concurrent execution of audio generation tasks.

// Depends on:
// - createAndRunAudioTask (audio_helpers.js)
// - formatTime (ui_helpers.js) - For ETA calculation
// - formatString (assumed helper)
// - Globals: translations, currentLanguage
// - Functions: fetchTranslation (translation_api.js) // Added dependency

const PipelineStatus = {
    IDLE: 'Idle',
    RUNNING: 'Running',
    STOPPING: 'Stopping',
    COMPLETED: 'Completed',
    ERROR: 'Error'
};

class AudioPipelineManager {
    /**
     * Initializes the audio pipeline manager.
     * @param {object} config - Configuration object.
      * @param {string[] | object[]} config.tasks - Array of text chunks OR task objects.
     *                                            If task objects, each should contain at least 'text'.
     *                                            Other properties (voice, rate, pitch, etc.) can be included
     *                                            to be passed down to createAndRunAudioTask.

     * @param {string[]} config.textChunks - Array of text chunks to process.
     * @param {object} config.audioSettings - Common audio settings.
     * @param {string} config.audioSettings.voice - The voice name (unformatted).
     * @param {string} config.audioSettings.rate - Speech rate (e.g., "+0%").
     * @param {string} config.audioSettings.pitch - Speech pitch (e.g., "+0Hz").
     * @param {string} [config.audioSettings.volume="+0%"] - Speech volume.
     * @param {number} config.concurrencyLimit - Max number of tasks to run simultaneously.
     * @param {string} config.baseFilename - Base filename for output files.
     * @param {object} config.mergeSettings - Merge configuration.
     * @param {boolean} config.mergeSettings.enabled - Whether merging is enabled.
     * @param {number} config.mergeSettings.chunkSize - Number of parts per merged file (Infinity for all).
     * @param {HTMLElement} config.statArea - The UI element for status updates.
 * @param {object} [config.retrySettings={ maxRetries: 10000, delay: 5000 }] - Retry configuration for failed tasks.
     * @param {number} config.retrySettings.maxRetries - Maximum number of retries per task.
     * @param {number} config.retrySettings.delay - Delay in milliseconds between retries.
     * @param {function(object):void} [config.onProgress] - Callback for progress updates. Receives { processed, failed, total, etaSeconds }.
     * @param {function(object):void} [config.onComplete] - Callback when all tasks finish. Receives { processed, failed, total, results: SocketEdgeTTS[] | null[] }.
     * @param {function(string):void} [config.onError] - Callback for critical pipeline errors. Receives error message.
     */
    constructor(config) {
        // --- Configuration ---
        // Accept either simple text chunks or complex task objects
        this.tasks = config.tasks || [];
        this.audioSettings = { volume: "+0%", ...config.audioSettings }; // Default/fallback settings
        this.concurrencyLimit = config.concurrencyLimit || 1;
        this.baseFilename = config.baseFilename || "Audiobook";
        this.mergeSettings = { enabled: false, chunkSize: Infinity, ...config.mergeSettings };
        this.statArea = config.statArea; // Required for task updates
        // --- ADDED: Retry Settings ---
    // CHANGED: Default maxRetries increased to 10000 for extreme robustness
    this.retrySettings = { maxRetries: 10000, delay: 5000, ...config.retrySettings }; 

        // --- Callbacks ---
        this.onProgress = config.onProgress;
        this.onComplete = config.onComplete;
        this.onError = config.onError;

        // --- State ---
        this.status = PipelineStatus.IDLE;
        this.startTime = 0;
        this.nextTaskIndex = 0;
        this.activeTaskCount = 0;
        this.processedCount = 0;
        this.failedCount = 0;
        this.totalTasks = this.tasks.length;
        this.taskInstances = new Array(this.totalTasks).fill(null); // Stores SocketEdgeTTS instances

        // --- Input Validation ---
        if (!this.statArea) {
            console.error("AudioPipelineManager: statArea element is required.");
            // Optionally throw an error or use onError callback
            if (this.onError) this.onError("Configuration Error: Status area element not provided.");
            this.status = PipelineStatus.ERROR; // Prevent starting
        }
        if (this.totalTasks === 0) {
            console.warn("AudioPipelineManager: No tasks provided.");
        }
        // Note: We allow starting even if audioSettings.voice is missing, 
        // provided individual tasks have voices.

        console.log(`AudioPipelineManager initialized: ${this.totalTasks} tasks, concurrency ${this.concurrencyLimit}, retries ${this.retrySettings.maxRetries}`);
    }

    /** Formats the voice name for SSML */
    _formatVoiceName(voiceValue) {
        if (!voiceValue) return null; // Return null for invalid input
        
        if (voiceValue.includes(',')) {
            return `Microsoft Server Speech Text to Speech Voice (${voiceValue})`;
        } else {
            // If it's just the short name (e.g. "en-US-GuyNeural"), try to use it.
            // EdgeTTS often accepts just the short name in the SSML if formatted correctly,
            // OR we might need to wrap it. 
            // Warning: If voiceValue is undefined, this returns string "undefined" inside parens.
            console.warn(`Voice format does not contain a comma, using as-is: ${voiceValue}.`);
            return `Microsoft Server Speech Text to Speech Voice (${voiceValue})`;
        }
    }

    /** Calculates Estimated Time Remaining in seconds */
    _calculateETASeconds() {
        if (this.processedCount + this.failedCount === 0 || this.startTime === 0) {
            return null; // Not enough data or not started
        }
        const completedCount = this.processedCount + this.failedCount;
        const elapsedTimeMs = Date.now() - this.startTime;
        if (elapsedTimeMs <= 0) return null;

        const timePerTaskMs = elapsedTimeMs / completedCount;
        const estimatedTotalTimeMs = timePerTaskMs * this.totalTasks;
        const estimatedRemainingTimeMs = Math.max(0, estimatedTotalTimeMs - elapsedTimeMs);

        return isFinite(estimatedRemainingTimeMs) ? Math.round(estimatedRemainingTimeMs / 1000) : null;
    }

    /** Updates the status line for a specific task */
    _updateTaskStatus(index, messageKeyOrText) { // Accept key or direct text
        if (this.statArea && this.statArea.style.display !== 'none') {
            requestAnimationFrame(() => {
                try {
                    let statlines = this.statArea.value.split('\n');
                    const lineIndex = index; // Assuming index corresponds to line number
                    // Translate if it's a key, otherwise use the text directly
                    // Use fetchTranslation here
                    const message = fetchTranslation(messageKeyOrText, currentLanguage);
                    const lineContent = `Part ${(index + 1).toString().padStart(4, '0')}: ${message}`;

                    if (lineIndex >= 0 && lineIndex < statlines.length) {
                        statlines[lineIndex] = lineContent;
                        this.statArea.value = statlines.join('\n');
                    } else if (lineIndex === statlines.length) {
                        // Append if it's the next line (handles initial population)
                        this.statArea.value += (this.statArea.value ? '\n' : '') + lineContent;
                    } else {
                        console.warn(`_updateTaskStatus: Index ${index} out of bounds for stat area lines (${statlines.length})`);
                        // Optionally pad with empty lines if needed, but pre-population is better
                    }
                    // Optional: Auto-scroll logic could be added here or in the caller's onProgress
                } catch (e) {
                    console.warn("Error updating stat area:", e);
                }
            });
        }
    }


    /** Attempts to queue the next available task if conditions allow. */
    _tryQueueNextTask() {
        if (this.status !== PipelineStatus.RUNNING) {
            // console.log("_tryQueueNextTask: Not running.");
            return; // Stop queuing if not in running state
        }
        if (this.nextTaskIndex >= this.totalTasks) {
            // console.log("_tryQueueNextTask: No tasks left to queue.");
            this._checkCompletion(); // Check if finished now that no more tasks are starting
            return; // All tasks have been queued
        }
        if (this.activeTaskCount >= this.concurrencyLimit) {
            // console.log("_tryQueueNextTask: Concurrency limit reached.");
            return; // Max threads running
        }

        const index = this.nextTaskIndex;
        const taskData = this.tasks[index]; // Get the task data (string or object)
        const text = typeof taskData === 'string' ? taskData : taskData.text; // Extract text
        const fileNum = (index + 1).toString().padStart(4, '0'); // Sequential file number for status

        // --- Determine Task-Specific Settings ---
        // Start with manager defaults, override with task-specific settings if available
        const taskVoice = taskData.voice || this.audioSettings.voice;
        const taskRate = taskData.rate || this.audioSettings.rate;
        const taskPitch = taskData.pitch || this.audioSettings.pitch;
        const taskVolume = taskData.volume || this.audioSettings.volume;

        // --- CRITICAL CHECK: Ensure voice is valid ---
        if (!taskVoice || taskVoice === 'undefined') {
             console.error(`Pipeline: Task ${index + 1} has INVALID voice: ${taskVoice}. Skipping.`);
             this._updateTaskStatus(index, "Error: Invalid Voice");
             
             // --- CRITICAL FIX: Create a dummy failure instance ---
             // This prevents 'handlePipelineComplete' from crashing when accessing originalTask of a null instance
             const dummyInstance = {
                originalTask: taskData,
                mp3_saved: false,
                isPlaceholder: true,
                clear: () => {} // Dummy cleanup
             };
             this.taskInstances[index] = dummyInstance;

             // Mark as failed immediately
             this.nextTaskIndex++; // Move past this task
             // Don't increment activeTaskCount since we aren't starting an async task
             this.failedCount++;
             
             // Report progress
             if (this.onProgress) {
                this.onProgress({
                    processed: this.processedCount,
                    failed: this.failedCount,
                    total: this.totalTasks,
                    etaSeconds: this._calculateETASeconds()
                });
             }
             
             // Try next
             setTimeout(() => this._tryQueueNextTask(), 0);
             return;
        }
        // --- End Task-Specific Settings ---


        console.log(`Pipeline: Queueing task ${index + 1}/${this.totalTasks}`);
        this._updateTaskStatus(index, "statusQueued"); // Update status immediately using key

        // Increment *before* async operation
        this.nextTaskIndex++;
        this.activeTaskCount++;

        const formattedVoice = this._formatVoiceName(taskVoice); // Format the specific voice for this task

        const taskConfig = {
            index: index, // The sequential index in the manager's task array
            text: text,
            voice: formattedVoice,
            rate: taskRate,
            pitch: taskPitch,
            volume: taskVolume,
            baseFilename: this.baseFilename, // Base filename might still be useful context
            fileNum: fileNum, // Sequential number for status line
            statArea: this.statArea,
            mergeEnabled: false, // Merging handled separately for multi-language
            retrySettings: this.retrySettings
        };

        try {
            // createAndRunAudioTask is defined in audio_helpers.js
            const ttsInstance = createAndRunAudioTask(
                taskConfig,
                // Completion Callback Wrapper (bound to this instance)
                this._handleTaskCompletion.bind(this)
            );

            // Attach the original task object to the instance for later identification
            ttsInstance.originalTask = taskData;

            // Store the instance
            this.taskInstances[index] = ttsInstance;

        } catch (error) {
            console.error(`Pipeline: Error creating/running task ${index + 1}:`, error);
            
            // CRITICAL FIX: Create dummy failure instance for immediate crashes
            const dummyInstance = {
                originalTask: taskData,
                mp3_saved: false,
                isPlaceholder: true,
                clear: () => {}
            };
            this.taskInstances[index] = dummyInstance;
            
            // Simulate immediate failure for this task
            this._handleTaskCompletion(index, true, dummyInstance);
        }

        // Try to queue another task immediately if slots are available
        // Use setTimeout to yield execution briefly, preventing potential stack overflow on high concurrency/fast tasks
        setTimeout(() => this._tryQueueNextTask(), 0);
    }

    /**
     * Handles the completion callback from createAndRunAudioTask.
     * @param {number} completedIndex - The sequential index of the completed task in the manager's array.
     * @param {boolean} errorOccurred - True if the task failed (after retries).
     * @param {SocketEdgeTTS | null} instance - The completed SocketEdgeTTS instance (or null if creation failed).
     */
    _handleTaskCompletion(completedIndex, errorOccurred, instance) {
        // console.log(`Pipeline: Task ${completedIndex + 1} completed. Error: ${errorOccurred}`);

        // Basic validation
        if (completedIndex < 0 || completedIndex >= this.totalTasks) {
            console.error(`Pipeline: Invalid index ${completedIndex} received from task completion.`);
            // Decrement active count anyway, as *something* finished
            if (this.activeTaskCount > 0) this.activeTaskCount--;
            // Try to queue next and check completion defensively
            this._tryQueueNextTask();
            this._checkCompletion();
            return;
        }

        // Decrement active count *before* potentially calling callbacks or queuing next
        if (this.activeTaskCount > 0) this.activeTaskCount--;

        // Update counters
        if (errorOccurred) {
            this.failedCount++;
            // Status update is now handled internally by SocketEdgeTTS including retries and final failure
            // We can ensure a final "Failed" status here if needed, but let's rely on the instance for now.
            // this._updateTaskStatus(completedIndex, "Failed (After Retries)");
        } else {
            this.processedCount++;
            // Instance should have updated its status to "Completed" or similar via onSocketClose
            // We can rely on that or force an update here. Let's rely on instance for now.
            // this._updateTaskStatus(completedIndex, "Success");
        }
        // The originalTask was attached to the instance when it was created,
        // so it will be available in the results array for the onComplete handler.

        // --- Reporting ---
        if (this.onProgress) {
            const etaSeconds = this._calculateETASeconds();
            this.onProgress({
                processed: this.processedCount,
                failed: this.failedCount,
                total: this.totalTasks,
                etaSeconds: etaSeconds,
                // Optionally pass back the completed index and status
                // completedIndex: completedIndex,
                // errorOccurred: errorOccurred
            });
        }

        // --- Continue Pipeline ---
        // Try to queue the next task now that a slot is free
        this._tryQueueNextTask();

        // --- Check for Overall Completion ---
        // This check needs to happen *after* trying to queue the next task,
        // especially if this was the last active task.
        this._checkCompletion();
    }

    /** Checks if all tasks are completed and triggers the onComplete callback. */
    _checkCompletion() {
        // Only check if the pipeline is running or stopping
        if (this.status !== PipelineStatus.RUNNING && this.status !== PipelineStatus.STOPPING) {
            return;
        }

        const completedCount = this.processedCount + this.failedCount;

        // Check if all tasks are accounted for AND no tasks are currently active
        if (completedCount === this.totalTasks && this.activeTaskCount === 0) {
            const finalStatus = this.failedCount > 0 ? PipelineStatus.ERROR : PipelineStatus.COMPLETED;
            // Translate the status for logging using fetchTranslation
            const finalStatusKey = finalStatus === PipelineStatus.ERROR ? 'statusError' : 'statusCompleted';
            const translatedFinalStatus = fetchTranslation(finalStatusKey, currentLanguage);
            console.log(`Pipeline: All tasks finished. Status: ${translatedFinalStatus}. Success: ${this.processedCount}, Failed: ${this.failedCount}`);
            this.status = finalStatus; // Keep internal status as English key

            if (this.onComplete) {
                this.onComplete({
                    processed: this.processedCount,
                    failed: this.failedCount,
                    total: this.totalTasks,
                    results: this.taskInstances // Pass back the array of instances/nulls
                });
            }
            // No automatic cleanup here - let the caller decide based on results
        } else {
            // console.log(`_checkCompletion: Not finished. Completed: ${completedCount}/${this.totalTasks}, Active: ${this.activeTaskCount}`);
        }
    }

    // --- Public Methods ---

    /** Starts the audio generation pipeline. */
    start() {
        if (this.status !== PipelineStatus.IDLE && this.status !== PipelineStatus.COMPLETED && this.status !== PipelineStatus.ERROR) {
            console.warn(`Pipeline: Cannot start, already in state: ${this.status}`);
            return;
        }
        if (this.totalTasks === 0) {
            console.warn("Pipeline: Cannot start, no tasks to process.");
            this.status = PipelineStatus.COMPLETED; // Consider it completed immediately
            if (this.onComplete) {
                this.onComplete({ processed: 0, failed: 0, total: 0, results: [] });
            }
            return;
        }
        if (this.status === PipelineStatus.ERROR && this.onError) {
            // Don't start if initialized with an error
            console.error("Pipeline: Cannot start due to initialization error.");
            return;
        }


        console.log("Pipeline: Starting...");
        this.status = PipelineStatus.RUNNING;
        this.startTime = Date.now();
        this.nextTaskIndex = 0;
        this.activeTaskCount = 0;
        this.processedCount = 0;
        this.failedCount = 0;
        this.taskInstances.fill(null); // Reset results array

        // Pre-populate stat area (optional, but helpful)
        if (this.statArea) {
            this.statArea.value = ""; // Clear previous run
            for (let i = 0; i < this.totalTasks; i++) {
                this._updateTaskStatus(i, "statusPending"); // Use key
            }
            this.statArea.scrollTop = 0; // Scroll to top
        }


        // Initial progress update
        if (this.onProgress) {
            this.onProgress({ processed: 0, failed: 0, total: this.totalTasks, etaSeconds: null });
        }

        // Start filling the pipeline
        for (let i = 0; i < this.concurrencyLimit; i++) {
            this._tryQueueNextTask();
        }
    }

    /** Requests the pipeline to stop gracefully. Prevents new tasks from starting. */
    stop() {
        if (this.status !== PipelineStatus.RUNNING) {
            console.warn(`Pipeline: Cannot stop, not in RUNNING state (current: ${this.status})`);
            return;
        }
        console.log("Pipeline: Stopping...");
        this.status = PipelineStatus.STOPPING;
        // Existing tasks will continue to run until completion.
        // _tryQueueNextTask will prevent new tasks from starting.
        // _checkCompletion will eventually trigger onComplete when active tasks reach zero.

        // Note: We don't actively cancel running SocketEdgeTTS tasks here,
        // as they lack an external cancel method. They will complete or error out.
    }

    /** Forcefully stops and cleans up all tasks (use with caution). */
    clear() {
        console.log("Pipeline: Force clearing...");
        this.status = PipelineStatus.IDLE; // Or a specific 'Cleared' state if needed
        this.taskInstances.forEach(instance => {
            if (instance && typeof instance.clear === 'function') {
                instance.clear();
            }
        });
        this.taskInstances.fill(null);
        this.activeTaskCount = 0;
        this.nextTaskIndex = 0;
        this.processedCount = 0;
        this.failedCount = 0;
        this.startTime = 0;
        // Optionally clear stat area? Or leave it to the caller? Leave for caller.
    }
}