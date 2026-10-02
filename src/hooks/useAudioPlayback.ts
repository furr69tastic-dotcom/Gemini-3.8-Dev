import { useState, useEffect } from 'react';
import { 
  subscribePlayback, 
  getActivePlayback, 
  pauseSpeech, 
  resumeSpeech, 
  stopSpeech, 
  playSpeech,
  togglePlayPauseSpeech,
  ActivePlaybackInfo 
} from '../utils/audioUtils';
import { VoiceName } from '../types/gemini';

export function useAudioPlayback() {
  const [playback, setPlayback] = useState<ActivePlaybackInfo>(getActivePlayback());

  useEffect(() => {
    return subscribePlayback(setPlayback);
  }, []);

  return {
    ...playback,
    isPlaying: playback.status === 'playing',
    isPaused: playback.status === 'paused',
    isLoading: playback.status === 'loading',
    isIdle: playback.status === 'idle',
    pause: pauseSpeech,
    resume: resumeSpeech,
    stop: stopSpeech,
    play: (text: string, messageId?: string, voiceName?: VoiceName) => 
      playSpeech({ text, messageId, voiceName }),
    toggle: (text?: string, messageId?: string, voiceName?: VoiceName) =>
      togglePlayPauseSpeech({ text, messageId, voiceName }),
  };
}
