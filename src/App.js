import React, { useState } from 'react';
import ModeSelector from './components/ModeSelector';
import SinglePlayer from './modes/SinglePlayer';
import TestMode from './modes/TestMode';
import MultiplayerGame from './modes/MultiplayerGame';
import './App.css';

function App() {
  const [selectedMode, setSelectedMode] = useState(null);

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
  };

  const handleBackToMenu = () => {
    setSelectedMode(null);
  };

  // Mode Router
  if (selectedMode === 'singleplayer') {
    return <SinglePlayer onBackToMenu={handleBackToMenu} />;
  }

  if (selectedMode === 'testmode') {
    return <TestMode onBackToMenu={handleBackToMenu} />;
  }

  if (selectedMode === 'multiplayer') {
    return <MultiplayerGame onBackToMenu={handleBackToMenu} />;
  }

  // Default: Show Mode Selector
  return <ModeSelector onSelectMode={handleModeSelect} />;
}

export default App;
