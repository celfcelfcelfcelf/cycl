import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './config';

// Generate a random 6-character room code
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create a new game room
export const createGame = async (hostName, gameConfig) => {
  const roomCode = generateRoomCode();
  const gameRef = doc(db, 'games', roomCode);
  
  const gameData = {
    roomCode,
    hostId: hostName,
    createdAt: serverTimestamp(),
    status: 'lobby', // lobby, playing, finished
    config: {
      numberOfTeams: gameConfig.numberOfTeams || 3,
      ridersPerTeam: gameConfig.ridersPerTeam || 3,
      trackName: gameConfig.trackName || 'Yorkshire',
      track: gameConfig.track || '',
      isStageRace: gameConfig.isStageRace || false,
      stages: gameConfig.stages || [],
      currentStageIndex: gameConfig.currentStageIndex || 0,
    },
    players: [{
      name: hostName,
      team: 'Team1',
      isHost: true,
      connected: true,
      joinedAt: Date.now()
    }],
    gameState: null, // Will be set when game starts
    currentTurn: null,
    lastUpdate: serverTimestamp()
  };
  
  await setDoc(gameRef, gameData);
  return roomCode;
};

// Join an existing game
export const joinGame = async (roomCode, playerName) => {
  const gameRef = doc(db, 'games', roomCode.toUpperCase());
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }
  
  const gameData = gameSnap.data();
  
  if (gameData.status !== 'lobby') {
    throw new Error('Game already started');
  }
  
  if (gameData.players.length >= gameData.config.numberOfTeams) {
    throw new Error('Game is full');
  }
  
  // Check if player name already exists
  if (gameData.players.some(p => p.name === playerName)) {
    throw new Error('Player name already taken');
  }
  
  // Assign next available team
  const teamNumber = gameData.players.length + 1;
  const newPlayer = {
    name: playerName,
    team: `Team${teamNumber}`,
    isHost: false,
    connected: true,
    joinedAt: Date.now()
  };
  
  // Update players array by reading, modifying, and writing back
  // (arrayUnion has issues with nested objects containing timestamps)
  const updatedPlayers = [...gameData.players, newPlayer];
  
  await updateDoc(gameRef, {
    players: updatedPlayers,
    lastUpdate: serverTimestamp()
  });
  
  return newPlayer.team;
};

// Update player connection status
export const updatePlayerConnection = async (roomCode, playerName, connected) => {
  const gameRef = doc(db, 'games', roomCode);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  const updatedPlayers = gameData.players.map(p => 
    p.name === playerName ? { ...p, connected } : p
  );
  
  await updateDoc(gameRef, {
    players: updatedPlayers,
    lastUpdate: serverTimestamp()
  });
};

// Start the game (host only)
export const startMultiplayerGame = async (roomCode, gameState) => {
  const gameRef = doc(db, 'games', roomCode);
  
  await updateDoc(gameRef, {
    status: 'playing',
    gameState: gameState,
    currentTurn: gameState.currentTeam || gameState.teams?.[0] || 'Team1',
    lastUpdate: serverTimestamp()
  });
};

// Update game state
export const updateGameState = async (roomCode, updates) => {
  const gameRef = doc(db, 'games', roomCode);
  
  await updateDoc(gameRef, {
    gameState: updates,
    lastUpdate: serverTimestamp()
  });
};

// Update current turn
export const updateCurrentTurn = async (roomCode, teamName) => {
  const gameRef = doc(db, 'games', roomCode);
  
  await updateDoc(gameRef, {
    currentTurn: teamName,
    lastUpdate: serverTimestamp()
  });
};

// Subscribe to game updates
export const subscribeToGame = (roomCode, callback) => {
  const gameRef = doc(db, 'games', roomCode);
  
  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  });
};

// Leave game
export const leaveGame = async (roomCode, playerName) => {
  const gameRef = doc(db, 'games', roomCode);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  const player = gameData.players.find(p => p.name === playerName);
  
  if (!player) return;
  
  // If host leaves, delete the game
  if (player.isHost) {
    await deleteDoc(gameRef);
  } else {
    // Remove player from game
    await updateDoc(gameRef, {
      players: arrayRemove(player),
      lastUpdate: serverTimestamp()
    });
  }
};

// Delete game (cleanup)
export const deleteGame = async (roomCode) => {
  const gameRef = doc(db, 'games', roomCode);
  await deleteDoc(gameRef);
};
