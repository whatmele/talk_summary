import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { initWhisper, releaseAllWhisper, WhisperContext } from 'whisper.rn';

// 定义模型路径的类型
export const modelPaths: Record<string, any> = {
    'ggml-small-q8_0.bin': require('../assets/model/ggml-small-q8_0.bin'),
    'ggml-base.bin': require('../assets/model/ggml-base.bin'),
    'ggml-base-q8_0.bin': require('../assets/model/ggml-base-q8_0.bin'),
    'ggmal-tiny.bin': require('../assets/model/ggml-tiny.bin'),
};

export const useLoadWhisper = () => {
  const { setWhisperContext } = useWhisper();

  const loadWhisper = async (model: string) => {
    try {
      const modelPath = modelPaths[model];
      if (!modelPath) {
        throw new Error('Model not found');
      }
      const context = await initWhisper({
        filePath: modelPath,
      });
      setWhisperContext(context);
      Alert.alert('Success', 'Whisper model loaded successfully');
    } catch (error) {
      console.error('Failed to load Whisper model', error);
      Alert.alert('Error', 'Failed to load Whisper model.');
    }
  };

  return loadWhisper;
};

interface WhisperProviderProps {
  children: ReactNode;
}


interface WhisperContextType {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    whisperContext: WhisperContext | null;
    setWhisperContext: (context: WhisperContext | null) => void;
}

const WhisperModelContext = createContext<WhisperContextType | undefined>(undefined);

export const WhisperProvider: React.FC<WhisperProviderProps> = ({ children }) => {
  const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('ggml-small-q8_0.bin');

  return (
    <WhisperModelContext.Provider value={{ whisperContext, setWhisperContext, selectedModel, setSelectedModel }}>
      {children}
    </WhisperModelContext.Provider>
  );
};

export const useWhisper = (): WhisperContextType => {
  const context = useContext(WhisperModelContext);
  if (!context) {
    throw new Error('useWhisper must be used within a WhisperProvider');
  }
  return context;
}; 