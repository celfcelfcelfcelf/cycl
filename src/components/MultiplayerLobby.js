import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Wifi, WifiOff } from 'lucide-react';

const MultiplayerLobby = ({ 
  isHost, 
  roomCode, 
  players, 
  onStartGame, 
  onLeave,
  maxPlayers,
  gameConfig 
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = players.length >= 2; // Need at least 2 players

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} />
            Multiplayer Lobby
          </h2>
          {isHost && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              HOST
            </span>
          )}
        </div>

        {/* Room Code */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-2">Room Code:</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold tracking-widest text-blue-600">
              {roomCode}
            </div>
            <button
              onClick={copyRoomCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Share this code with other players to join
          </div>
        </div>

        {/* Game Settings */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Game Settings:</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">Track:</div>
            <div className="font-semibold">{gameConfig.trackName}</div>
            <div className="text-gray-600">Max Teams:</div>
            <div className="font-semibold">{maxPlayers}</div>
            <div className="text-gray-600">Riders/Team:</div>
            <div className="font-semibold">{gameConfig.ridersPerTeam}</div>
            {gameConfig.isStageRace && (
              <>
                <div className="text-gray-600">Stages:</div>
                <div className="font-semibold">{gameConfig.stages?.length || 0}</div>
              </>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Players ({players.length}/{maxPlayers}):
          </div>
          <div className="space-y-2">
            {players.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white border rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-sm text-gray-500">{player.team}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {player.isHost && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                      HOST
                    </span>
                  )}
                  {player.connected ? (
                    <Wifi size={16} className="text-green-600" />
                  ) : (
                    <WifiOff size={16} className="text-red-600" />
                  )}
                </div>
              </div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: maxPlayers - players.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 opacity-50"
              >
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users size={20} className="text-gray-500" />
                </div>
                <div className="text-gray-500 italic">Waiting for player...</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLeave}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Leave Lobby
          </button>
          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold ${
                canStart
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Game {!canStart && '(Need 2+ players)'}
            </button>
          )}
          {!isHost && (
            <div className="flex-1 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-center font-semibold">
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;
