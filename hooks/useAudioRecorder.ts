import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat } from 'expo-av/build/Audio/RecordingConstants';
import { RecordingStatus } from 'expo-av/build/Audio';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import { Alert } from 'react-native';

export enum AudioRecordType {
  WAV = 'wav',
  M4A = 'm4a',
}

/**
 * 音频录制相关的hook
 */
export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [audioRecordType, setAudioRecordType] = useState<AudioRecordType>(AudioRecordType.M4A);

  useEffect(() => {
   return () => {
      recording?.stopAndUnloadAsync();
   }
  }, []);

  const getAudioRecordOptions = () => {
    
    switch (audioRecordType) {
      case AudioRecordType.WAV:
        // https://github.com/mybigday/whisper.rn/issues/195
        return {
            isMeteringEnabled: true,
            android: {
              ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
              extension: '.wav',
              outputFormat: AndroidOutputFormat.DEFAULT,
              audioEncoder: AndroidAudioEncoder.DEFAULT,
              sampleRate: 16000,
              numberOfChannels: 1
            },
            ios: {
              ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
              extension: '.wav',
              outputFormat: IOSOutputFormat.LINEARPCM,
              audioQuality: IOSAudioQuality.MAX,
              sampleRate: 16000,
              numberOfChannels: 1
            },
            web: {
              mimeType: 'audio/wav',
              bitsPerSecond: 128000,
            }
          } as Audio.RecordingOptions;
      case AudioRecordType.M4A:
      default:
        return {
            isMeteringEnabled: true,
            android: {
              extension: '.m4a',
              outputFormat: AndroidOutputFormat.MPEG_4,
              audioEncoder: AndroidAudioEncoder.AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
            },
            ios: {
              extension: '.m4a',
              outputFormat: IOSOutputFormat.MPEG4AAC,
              audioQuality: IOSAudioQuality.MAX,
              sampleRate: 16000,
              numberOfChannels: 2,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: 'audio/webm',
              bitsPerSecond: 128000,
            }
          } as Audio.RecordingOptions;
    } 
  }

  const convertToWav = (originUri: string, targetUri: string) => {
    return new Promise((resolve, reject) => {
      FFmpegKit.execute(`-i ${originUri} -ar 16000 -ac 1 -c:a pcm_s16le ${targetUri}`).then(async (session) => {
        const returnCode = await session.getReturnCode();
        if (ReturnCode.isSuccess(returnCode)) {
          console.log('Conversion to WAV successful', originUri, targetUri);
          // setWavFiles(prevWavFiles => [...prevWavFiles, targetUri.split('/').pop() || '']);
          resolve(true);
        } else {
          Alert.alert('Conversion Failed', 'Failed to convert file to WAV format.');
          const failStack = await session.getFailStackTrace();
          console.log('Fail stack:', failStack);
          resolve(false);
        }
      });
    });
  }

  const startRecording = async () => {
    try {
      setRecordingUri(null);
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        getAudioRecordOptions(), 
        (status: RecordingStatus) => {
          console.log("recoding status", status);
          if (status.metering) {
            // 将负数的音量计量值转换为0到1之间的比例
            const normalizedVolume = Math.max(0, 1 + status.metering / 100);
            setVolume(normalizedVolume);
          }
        }
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    let resultUri: string | null = null;
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      if (uri) {
        const newUri = `${FileSystem.documentDirectory}${uri.split('/').pop()}`;
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });
        console.log('Recording moved to', newUri);
        const targetUri = `${newUri.replace('.' + audioRecordType, '')}_converted.wav`;
        const convertResult = await convertToWav(newUri, targetUri);
        if (convertResult) {
            setRecordingUri(targetUri);
            resultUri = targetUri;
        }
      }
    }
    setRecording(null);
    setVolume(0);
    return resultUri;
  }


  return {
    startRecording,
    stopRecording,
    recording,
    recordingUri,
    volume,
    audioRecordType,
    setAudioRecordType,
  };
};
