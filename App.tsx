import React from 'react';
import { WhisperProvider } from './context/WhisperContext';
import RootComponent from './components/RootComponent';


const App: React.FC = () => {
  
  return (
    <WhisperProvider>
      <RootComponent/>
    </WhisperProvider>
  );
};

export default App;