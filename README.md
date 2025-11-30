# 🎙️ Script-to-Speech: Character-Based Audiobook Generator

🔗 [Try it live](https://julius-gun.github.io/Script-to-Speech-Character-based-Audiobook-Generator/)

A browser-based tool that converts formatted text scripts into multi-voice audiobooks. By utilizing **Microsoft Edge's TTS API**, this tool generates high-quality, natural-sounding audio without requiring a backend server or API keys.

It is designed to work with **LLM-preprocessed text**, allowing you to automatically assign distinct voices to the Narrator and individual characters (e.g., Max, Hans, Peter).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)
![Status](https://img.shields.io/badge/status-Active-green.svg)

## ✨ Features

*   **100% Client-Side:** Runs directly in your browser. No Python or Node.js backend required.
*   **Character Detection:** Automatically identifies characters based on specific markers (e.g., `[Character]:`).
*   **Auto-Voice Assignment:** Automatically assigns different voices to different characters based on the selected language.
*   **Custom Voice Mapping:** Review and manually change the specific voice assigned to any character before generation.
*   **Multi-Threaded Generation:** Processes multiple sentences in parallel for fast generation.
*   **Smart Merging:** Download individual audio parts, or automatically merge them into a single MP3 or chapter-based chunks.
*   **Cost Free:** Uses the free Edge TTS interface.

## 🚀 Usage Guide

### 1. Pre-process your Text
This tool requires the text to be formatted so it knows who is speaking. Use an LLM (ChatGPT, Claude, Gemini, etc.) to format your raw book text.

**Copy and paste this prompt into your LLM:**

```text
You are a script pre-processor for an audiobook generator. I will provide you with a text. Your task is to prepare it for a multi-voice reading.

Rules:
1. The "Narrator" is the default speaker. Do NOT mark sentences spoken by the Narrator.
2. For any sentence spoken by a specific character (dialogue), insert a concise marker at the very beginning of that sentence.
3. The marker MUST be in this format: `[Character Name, gender]:` (e.g. `[Max, m]:` for male or `[Sarah, f]:` for female).
4. If a sentence contains both narration and dialogue (e.g., 'Max said, "Hello."'), split it into two separate lines so the narration remains unmarked and the dialogue gets the marker.
5. Do not change the text content other than splitting lines and adding markers.

Example Input:
Max looked at the horizon. "It's going to rain," he said. Hans shook his head and replied, "No, it's just mist."

Example Output:
Max looked at the horizon.
[Max, m]: "It's going to rain,"
he said.
Hans shook his head and replied,
[Hans, m]: "No, it's just mist."

[INSERT YOUR TEXT HERE]
  
Make sure that it is fail proof, as [ ] might be used in normal books also.
```

### 2. Configure the Tool
🔗 [Try it live](https://julius-gun.github.io/Script-to-Speech-Character-based-Audiobook-Generator/)

2.  Paste the **LLM-formatted text** into the Script Input area.
3.  **Select the Language** of the text (e.g., English, German, Spanish).
    *   *Note: You do not need to select a default voice; one will be assigned automatically.*

### 3. Analyze & Generate
1.  Click **Analyze Characters**.
2.  The tool will scan the text and present a list of detected characters.
3.  **Review the Voice Mapping:** The tool assigns available voices automatically. You can use the dropdowns to change the voice for specific characters (e.g., give a deep voice to a villain, a high pitch to a child).
4.  Once satisfied, click **Generate Audiobook**.

### 4. Advanced Settings
*   **Instance Count (Threads):** Controls how many audio requests are sent simultaneously. Higher numbers are faster but may cause rate-limiting. Default is usually safe.
*   **Merge Files:**
    *   `ALL`: Creates one single MP3 file.
    *   `1`: Downloads every sentence as a separate file (zipped).
    *   `10`, `50`, etc.: Merges audio into chunks of X sentences.


## ⚠️ Known Limitations

*   **Browser Compatibility:** Chrome, Edge, and Brave work best. Firefox may experience issues with the specific audio decoding methods used for merging files.
*   **API Limits:** While Edge TTS is free, sending too many requests too quickly (hundreds of threads) might result in temporary IP blocks from Microsoft.
*   **File Size:** Generating massive books (500+ pages) in one go may crash the browser memory. It is recommended to process chapter by chapter.

## 🤝 Contributing

Contributions are welcome!
1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*This tool is for educational and personal use. It utilizes the Microsoft Edge TTS API; please respect their terms of service.*
```
