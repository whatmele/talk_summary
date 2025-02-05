import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLoadWhisper, modelPaths, useWhisper } from '../context/WhisperContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioTranscription } from '../hooks/useAudioTranscription';
import { useAudioPlayer } from '../hooks/useAudioPlayer';



const AsrScreen: React.FC = () => {

  const { whisperContext, selectedModel, setSelectedModel} = useWhisper();
  const loadWhisper = useLoadWhisper();
  const { stopPlayRecording, playRecording } = useAudioPlayer();
  const { transcribeAudio, stopTranscribe, transcription, isTranscribing } = useAudioTranscription(whisperContext);
  const { audioRecordType, setAudioRecordType, startRecording, stopRecording, recordingUri, recording, volume } = useAudioRecorder();
  

  const handleRecording = async () => {
    if (recording) {
      const resultWavUri = await stopRecording();
      transcribeAudio(resultWavUri);
    } else {
      await startRecording();
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
        {isTranscribing ? (
          <ActivityIndicator size="large" color="#000000" />
        ) : (
          <Text style={styles.transcriptionText}>{transcription}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
      <Text style={styles.listTitle}>Current Recording</Text>
        {recordingUri ? (
          <View style={styles.recordingItem}>
            <Text style={styles.recordingText} numberOfLines={1} ellipsizeMode="tail">{recordingUri.split('/').pop()}</Text>
            <Button title="Play" onPress={() => playRecording(recordingUri)} />
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
            <Text style={styles.buttonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonSpacing} />
        <Button title="Transcribe" onPress={() => transcribeAudio(recordingUri)} />
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
