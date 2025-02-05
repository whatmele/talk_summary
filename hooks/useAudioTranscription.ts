import React, { useState } from 'react';
import { Alert } from 'react-native';
import { TranscribeNewSegmentsResult, TranscribeResult, WhisperContext } from 'whisper.rn'



export const useAudioTranscription = (whisperContext: WhisperContext | null) => {
  const [transcription, setTranscription] = useState<string>('');
  const [stopTranscribe, setStopTranscribe] = useState<(()=> Promise<void>) | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

 
  const transcribeAudio = async (wavFilePath: string|null) => {
    if (!wavFilePath) {
      Alert.alert('No Recording', 'Please record an audio first.');
      return;
    }
    if (!whisperContext) {
      Alert.alert('No Whisper Context', 'Please load a Whisper model first.');
      return;
    }
    setStopTranscribe(null);
    setIsTranscribing(true);
    setTranscription('');
    const { stop, promise } = whisperContext.transcribe(wavFilePath, {
        onProgress: (progress: number) => {
        console.log('Transcibe Progress:', progress);
        },
        onNewSegments: (result: TranscribeNewSegmentsResult) => {
        console.log('New segments:', result);
        setIsTranscribing(false);
        setTranscription((prevTranscription) => {
            if (!prevTranscription) {
            return prevTranscription + result.segments[result.totalNNew-1].text;
            } else {
            return prevTranscription + ' ' + result.segments[result.totalNNew-1].text;
            }
        });
        },
        language: 'zh',
    });
    setStopTranscribe(stop);
    const result: TranscribeResult = await promise;
    const transcriptionText = result.segments.map(segment => segment.text).join(' ');
    setTranscription(transcriptionText);
    console.log('Transcribe result:', transcriptionText);
    setIsTranscribing(false);
  };



  return {
    transcribeAudio,
    stopTranscribe,
    transcription,
    isTranscribing,
  }
};
