# Voice Capture

## Overview

The core interaction of Phase 1. A single screen with a prominent hold-to-record button that captures the user's voice and transcribes it in real time using the Web Speech API. Completed transcriptions are persisted to localStorage.

## Requirements

### Record Button

- A large, central button that is the primary UI element on the screen
- Press and hold to record — recording starts on press down, stops on release
- Visual feedback while recording (e.g. colour change, animation, or pulse effect)
- Clear visual distinction between idle and recording states

### Real-Time Transcription

- Use the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for speech-to-text
- Display transcribed text live on screen as the user speaks
- Handle interim and final results — show interim text as it comes in, replace with final when confirmed
- Graceful handling of browser support — show a clear message if Web Speech API is not available

### Persistence

- Save completed transcriptions to localStorage
- Each entry should store:
  - Transcribed text
  - Timestamp
- Display a list of previous transcriptions on the same screen (below the record button)
- Ability to delete individual transcriptions

## References

- Web Speech API: browser-native, no external dependencies required
- Project overview: `@context/project-overview.md` (Phase 1 scope)
