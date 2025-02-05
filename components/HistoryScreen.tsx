import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { AudioRecordType } from '../hooks/useAudioRecorder';

const HistoryScreen: React.FC = () => {
  const [files, setFiles] = useState<{ name: string, format: string }[]>([]);
  const { stopPlayRecording, playRecording, sound } = useAudioPlayer();

  useFocusEffect(
    useCallback(() => {
      // 这个函数在屏幕获得焦点时执行
      console.log('Screen is focused');
      loadFiles();
      return async () => {
        // 这个清理函数在屏幕失去焦点时执行
        console.log('Screen is unfocused', sound?._key);
        await sound?.stopAsync();
        await sound?.unloadAsync();
      };
    }, [sound])
  );

  const loadFiles = async () => {
    const fileNames = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');

    // 获取 AudioRecordType 枚举的所有值
    const audioExtensions = Object.values(AudioRecordType);

    // 过滤文件，确保只展示音频文件
    const audioFiles = fileNames
      .filter(file => audioExtensions.some(ext => file.endsWith(`.${ext}`)))
      .map(file => ({
        name: file,
        format: file.split('.').pop() ?? 'unknown',
      }));

    setFiles(audioFiles);
  };

  const deleteFile = async (fileName: string) => {
    await FileSystem.deleteAsync(fileName);
    loadFiles();
    Alert.alert('Deleted', `Recording ${fileName} has been deleted.`);
  };

  const deleteAllFiles = async () => {
    for (const file of files) {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file.name}`);
    }
    loadFiles();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={files}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            <Text style={styles.fileFormat}>{item.format}</Text>
            <TouchableOpacity onPress={() => playRecording(`${FileSystem.documentDirectory}${item.name}`)} style={styles.button}>
              <Text style={styles.buttonText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteFile(`${FileSystem.documentDirectory}${item.name}`)} style={styles.button}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
       <TouchableOpacity onPress={stopPlayRecording} style={[styles.button, styles.deleteAllButton]}>
        <Text style={styles.buttonText}>Stop Audio</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={deleteAllFiles} style={[styles.button, styles.deleteAllButton]}>
        <Text style={styles.buttonText}>Delete All</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  fileName: {
    flex: 1,
    marginRight: 10,
  },
  fileFormat: {
    width: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteAllButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
});

export default HistoryScreen;
