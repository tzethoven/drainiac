# Voice-First Capture — Feature Specification

## Overview

Voice-first capture is the primary input mechanism for Drainiac. Users speak their thoughts, and the app automatically routes them to the appropriate category using either explicit code words or AI-powered intent detection. The goal is to make capturing thoughts frictionless—taking no more than a few seconds.

## Requirements

### Functional Requirements

1. **Web Speech API Integration**
   - Implement speech-to-text using the Web Speech API
   - Handle browser compatibility and permissions
   - Provide visual feedback during recording
   - Support continuous listening mode
   - Handle speech recognition errors gracefully

2. **Code Word System**
   - Detect trigger words at the start of voice input: "Todo", "Read", "Watch", "Note", "Habit", "Idea"
   - Bypass AI inference when code word is detected for speed
   - Make the code word system extensible for future categories
   - Case-insensitive code word matching
   - Support for custom code words configuration

3. **AI Intent Detection**
   - When no code word is used, send transcribed text to AI API (Mistral AI initially)
   - Infer intent from context
   - Present confidence score if applicable
   - Request user confirmation before filing the thought
   - Learn from user corrections over time (future consideration)

4. **Quick Capture Flow**
   - Press and hold to record, or tap to toggle
   - Real-time transcription preview
   - One-tap confirmation to save
   - Visual/haptic feedback on successful capture
   - Handle interruptions gracefully

5. **Offline Capability**
   - Queue captured thoughts when offline
   - Sync to database when connection restored
   - Store audio backup if transcription fails (optional)

### Non-Functional Requirements

1. **Performance**
   - Transcription latency < 500ms
   - Total capture time < 5 seconds for typical thought
   - Minimal battery drain

2. **Accessibility**
   - Alternative text input method available
   - Clear visual feedback for non-audio users
   - Screen reader compatible

3. **Privacy**
   - No audio stored after transcription (unless explicitly enabled)
   - All processing respects work/private bucket separation
   - Clear indication when microphone is active

## References

- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Mistral AI API documentation
- Related specs: `data-storage-spec.md`, `work-private-separation-spec.md`
