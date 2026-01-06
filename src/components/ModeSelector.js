import React from 'react';
import { Play, Users, FlaskConical } from 'lucide-react';

const ModeSelector = ({ onSelectMode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">🚴 Cycling Game</h1>
          <p className="text-xl text-gray-600">Vælg spiltype</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Single Player */}
          <button
            onClick={() => onSelectMode('singleplayer')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-green-500"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Play className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Single Player</h2>
              <p className="text-gray-600">
                Spil alene mod computer-styrede hold
              </p>
              <div className="mt-4 text-sm text-gray-500">
                ✓ Klassisk spilmode<br/>
                ✓ AI modstandere<br/>
                ✓ Hurtig opstart
              </div>
            </div>
          </button>

          {/* Test Mode */}
          <button
            onClick={() => onSelectMode('testmode')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <FlaskConical className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">2TK→MK Test</h2>
              <p className="text-gray-600">
                Test nye trætkortregler
              </p>
              <div className="mt-4 text-sm text-gray-500">
                ✓ Single player mode<br/>
                ✓ 2 TK → 1 MK konvertering<br/>
                ✓ Trætkort-ekstra regler
              </div>
            </div>
          </button>

          {/* Multiplayer */}
          <button
            onClick={() => onSelectMode('multiplayer')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Multiplayer</h2>
              <p className="text-gray-600">
                Spil online mod andre spillere
              </p>
              <div className="mt-4 text-sm text-red-600 font-semibold">
                ⚠️ Virker ikke endnu
              </div>
              <div className="mt-2 text-sm text-gray-500">
                ✓ Online spil<br/>
                ✓ Create eller Join<br/>
                ✓ Real-time sync
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Cycling Manager Game v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
