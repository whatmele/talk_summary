import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ASRScreen from '../screens/AsrScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { useLoadWhisper, useWhisper, WhisperProvider } from '../context/WhisperContext';
import { releaseAllWhisper } from 'whisper.rn';

const Tab = createBottomTabNavigator();

const RootComponent: React.FC = () => {
    const { selectedModel } = useWhisper();
    const loadWhisper = useLoadWhisper();
    useEffect(() => {
        loadWhisper(selectedModel);
        return () => {
            releaseAllWhisper();
        }
    }, []);
  
  return (
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="ASR Testing" component={ASRScreen} />
          <Tab.Screen name="Recording History" component={HistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
  );
};

export default RootComponent;