import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat } from 'expo-av/build/Audio/RecordingConstants';
import { RecordingStatus } from 'expo-av/build/Audio';
import { initWhisper, releaseAllWhisper, TranscribeResult, WhisperContext } from 'whisper.rn'
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';


const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [wavFiles, setWavFiles] = useState<string[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [transcription, setTranscription] = useState<string>('');
  const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadRecordings();
    loadWhisper();
    return () => {
      releaseAllWhisper();
    }
  }, []);

  useEffect(() => {
    return () => {
        sound?.unloadAsync();
    }
  }, [sound]);

  const loadRecordings = async () => {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
    console.log('files', files);
    setRecordings(files.filter(file => file.endsWith('.m4a')));
    setWavFiles(files.filter(file => file.endsWith('_converted.wav')));
  };

  const loadWhisper = async () => {
    try {
      const whisperContext = await initWhisper({
        filePath: require('./assets/model/ggml-small-q8_0.bin'), 
      });
      setWhisperContext(whisperContext);
      console.log('Whisper model loaded successfully', whisperContext);
    } catch (error) {
      console.error('Failed to load Whisper model', error);
      Alert.alert('Error', 'Failed to load Whisper model.');
    }
  };

  const transcribeAudio = async (wavFilePath: string) => {
    if (whisperContext) {
      setIsLoading(true);
      const { stop, promise } = whisperContext.transcribe(wavFilePath, {
        onProgress: (progress: number) => {
          console.log('Progress:', progress);
        },
        onNewSegments: (segments: any) => {
          console.log('New segments:', segments);
        },
        language: 'zh',
      });
      const result: TranscribeResult = await promise;
      const transcriptionText = result.result;
      setTranscription(transcriptionText);
      console.log('Transcribe result:', transcriptionText);
      setIsLoading(false);
    } else {
      // await FileSystem.deleteAsync(wavFilePath);
      Alert.alert('Whisper model not loaded', 'Please wait for the Whisper model to load.');
    }
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
          transcribeAudio(targetUri);
        }
      }

      setRecording(null);
      setIsRecording(false);
      setVolume(0);
      loadRecordings();
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

  const deleteRecording = async (fileName: string) => {
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.deleteAsync(filePath);
    loadRecordings();
    Alert.alert('Deleted', `Recording ${fileName} has been deleted.`);
  };

  const playRecording = async (fileName: string) => {
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    const { sound } = await Audio.Sound.createAsync({ uri: filePath });
    setSound(sound);
    await sound.playAsync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.listTitle}>Converted Text</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color="#0000ff" />
      ) : (
        <Text style={styles.transcriptionText}>{transcription}</Text>
      )}
      <Text style={styles.listTitle}>Volume </Text>
      <View style={styles.volumeBarContainer}>
        <View style={[styles.volumeBar, { width: `${volume * 100}%` }]} />
      </View>
      <Text style={styles.volumeText}>Volume: {Math.round(volume * 100)}</Text>
      
      <Text style={styles.listTitle}>Original Recordings</Text>
      <FlatList
        style={styles.List}
        data={recordings}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.recordingItem}>
            <Text style={styles.recordingText} numberOfLines={1} ellipsizeMode="tail">{item}</Text>
            <Button title="Play" onPress={() => playRecording(item)} />
            <Button title="Delete" onPress={() => deleteRecording(item)} />
          </View>
        )}
      />

      <Text style={styles.listTitle}>Converted WAV Files</Text>
      <FlatList
        data={wavFiles}
        style={styles.List}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.recordingItem}>
            <Text style={styles.recordingText} numberOfLines={1} ellipsizeMode="tail">{item}</Text>
            <Button title="Play" onPress={() => playRecording(item)} />
            <Button title="Delete" onPress={() => deleteRecording(item)} />
          </View>
        )}
      />

      <View style={styles.buttonContainer}>
        <Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={handleRecording} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  List: {
    height: 150,
    width: '100%',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  volumeBarContainer: {
    width: '80%',
    height: 20,
    backgroundColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 20,
  },
  volumeBar: {
    height: '100%',
    backgroundColor: 'green',
  },
  volumeText: {
    marginTop: 5,
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
    marginTop: 20,
    fontSize: 16,
    color: 'black',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default App;
