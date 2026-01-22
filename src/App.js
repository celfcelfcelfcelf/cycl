import React, { useState } from 'react';
import ModeSelector from './components/ModeSelector';
import SinglePlayer from './modes/SinglePlayer';
import TestMode from './modes/TestMode';
import MultiplayerGame from './modes/MultiplayerGame';
import './App.css';

const VERSION = 'v4.0.10-CLEAN-JAN12';

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
  return (
    <>
      <ModeSelector onSelectMode={handleModeSelect} />
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px 16px',
        backgroundColor: 'yellow',
        color: 'red',
        fontWeight: 'bold',
        fontSize: '24px',
        borderRadius: '8px',
        zIndex: 9999,
        border: '2px solid red'
      }}>
        🔥 {VERSION} 🔥
      </div>
    </>
  );
}

export default App;
