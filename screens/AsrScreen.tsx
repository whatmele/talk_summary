import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat } from 'expo-av/build/Audio/RecordingConstants';
import { RecordingStatus } from 'expo-av/build/Audio';
import { TranscribeNewSegmentsResult, TranscribeResult } from 'whisper.rn'
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import { Picker } from '@react-native-picker/picker';
import { useLoadWhisper, modelPaths, useWhisper } from '../context/WhisperContext';



const AsrScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { whisperContext, selectedModel, setSelectedModel} = useWhisper();
  const loadWhisper = useLoadWhisper();
  useEffect(() => {
    return () => {
        sound?.unloadAsync();
    }
  }, [sound]);

  const transcribeAudio = async (wavFilePath: string|null) => {
    if (!wavFilePath) {
      Alert.alert('No Recording', 'Please record an audio first.');
      return;
    }
    if (!whisperContext) {
      Alert.alert('No Whisper Context', 'Please load a Whisper model first.');
      return;
    }
    setIsLoading(true);
    setTranscription('');
    const { stop, promise } = whisperContext.transcribe(wavFilePath, {
        onProgress: (progress: number) => {
        console.log('Progress:', progress);
        },
        onNewSegments: (result: TranscribeNewSegmentsResult) => {
        console.log('New segments:', result);
        setIsLoading(false);
        setTranscription((prevTranscription) => {
            if (!prevTranscription) {
            return prevTranscription + result.segments[result.totalNNew-1].text;
            } else {
            return prevTranscription + ',' + result.segments[result.totalNNew-1].text;
            }
        });
        },
        language: 'zh',
    });
    const result: TranscribeResult = await promise;
    const transcriptionText = result.segments.map(segment => segment.text).join(',');
    setTranscription(transcriptionText);
    console.log('Transcribe result:', transcriptionText);
    setIsLoading(false);
  };

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        {
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
            sampleRate: 44100,
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
        }, 
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
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
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
        const targetUri = `${newUri.replace('.m4a', '')}_converted.wav`;
        const convertResult = await convertToWav(newUri, targetUri);
        if (convertResult) {
          setCurrentRecording(targetUri);
          transcribeAudio(targetUri);
        }
      }

      setRecording(null);
      setIsRecording(false);
      setVolume(0);
    }
  };

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

  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playRecording = async () => {
    if (currentRecording) {
      const { sound } = await Audio.Sound.createAsync({ uri: currentRecording });
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

  const handleModelChange = async (model: string) => {
    if (whisperContext) {
      await whisperContext.release();
    }
    setSelectedModel(model);
    await loadWhisper(model);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedModel} onValueChange={handleModelChange} style={styles.picker}>
          {Object.keys(modelPaths).map((model) => (
            <Picker.Item key={model} label={model} value={model} />
          ))}
        </Picker>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.listTitle}>Converted Text</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#000000" />
        ) : (
          <Text style={styles.transcriptionText}>{transcription}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
      <Text style={styles.listTitle}>Current Recording</Text>
        {currentRecording ? (
          <View style={styles.recordingItem}>
            <Text style={styles.recordingText} numberOfLines={1} ellipsizeMode="tail">{currentRecording.split('/').pop()}</Text>
            <Button title="Play" onPress={playRecording} />
            <View style={styles.buttonSpacingRow} />
            <Button title="Stop" onPress={stopPlayRecording} />
          </View>
        ) : (
          <Text>No recording available</Text>
        )}
        <View style={styles.recordButtonContainer}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecording}
          >
            <View style={[styles.volumeBar, { width: `${volume * 100}%` }]} />
            <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonSpacing} />
        <Button title="Transcribe" onPress={() => transcribeAudio(currentRecording)} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pickerContainer: {
    width: '100%',
  },
  picker: {
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  buttonSpacing: {
    height: 10, // 增加按钮之间的间距
  },
  buttonSpacingRow: {
    width: 10, // 增加按钮之间的间距
  },
  recordButtonContainer: {
    width: '80%',
    height: 50,
    backgroundColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 10
  },
  recordButton: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15
  },
  volumeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 50,
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    zIndex: 1,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    gap: 10,
  },
  recordingText: {
    flex: 1,
    marginRight: 10,
  },
  transcriptionText: {
    height: '100%',
    width: '100%',
    fontSize: 16,
    color: 'black',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default AsrScreen;
