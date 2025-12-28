import React, { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';

const MultiplayerSetup = ({ 
  onJoinGame,
  onBackToSetup
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    setError('');
    onJoinGame(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <UserPlus size={24} className="text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Join Game</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-2xl font-bold tracking-widest text-center"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onBackToSetup}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleJoinGame}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerSetup;
