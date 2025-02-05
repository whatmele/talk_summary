import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';


export const useAudioPlayer = () => {

  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
        sound?.unloadAsync();
    }
  }, [sound]);


  const playRecording = async (recordingUri: string) => {
    if (recordingUri) {
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(sound);
      await sound.playAsync();
    } else {
      Alert.alert('No Recording', 'Please record an audio first.');
    }
  };

  const stopPlayRecording = async () => {
    if (sound) {
      await sound.stopAsync();
    }
  };

  return {
    playRecording,
    stopPlayRecording,
    sound
  }
};
