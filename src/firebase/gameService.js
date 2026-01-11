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
      team: hostName, // Use player name as team identifier
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
  
  // Check if player is rejoining (already in players list)
  const existingPlayer = gameData.players.find(p => p.name === playerName);
  const isRejoin = !!existingPlayer;
  
  if (gameData.status !== 'lobby' && !isRejoin) {
    throw new Error('Game already started');
  }
  
  if (gameData.players.length >= gameData.config.numberOfTeams && !isRejoin) {
    throw new Error('Game is full');
  }
  
  // If rejoining, just update connected status
  if (isRejoin) {
    const updatedPlayers = gameData.players.map(p => 
      p.name === playerName 
        ? { ...p, connected: true, joinedAt: Date.now() }
        : p
    );
    
    await updateDoc(gameRef, {
      players: updatedPlayers
    });
    
    return {
      roomCode: roomCode.toUpperCase(),
      playerName,
      isHost: existingPlayer.isHost,
      team: existingPlayer.team
    };
  }
  
  // Check if player name already exists (only for new joins)
  if (gameData.players.some(p => p.name === playerName)) {
    throw new Error('Player name already taken');
  }
  
  // Assign team as player name
  const newPlayer = {
    name: playerName,
    team: playerName, // Use player name as team identifier
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

// Sync a player's move to Firebase
export const syncPlayerMove = async (roomCode, moveData) => {
  const gameRef = doc(db, 'games', roomCode);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  
  // Merge teamPaces and teamPaceMeta instead of replacing them
  // This allows multiple teams to submit independently without overwriting each other
  // EXCEPTION: If moveData sends an empty object, treat it as an explicit reset (for new rounds)
  const existingTeamPaces = (gameData.gameState && gameData.gameState.teamPaces) || {};
  const existingTeamPaceMeta = (gameData.gameState && gameData.gameState.teamPaceMeta) || {};
  
  const shouldResetPaces = Object.keys(moveData.teamPaces || {}).length === 0 && 'teamPaces' in moveData;
  const shouldResetMeta = Object.keys(moveData.teamPaceMeta || {}).length === 0 && 'teamPaceMeta' in moveData;
  
  // Log postMoveInfo syncing for debugging
  console.log('🔥 syncPlayerMove: postMoveInfo in moveData:', {
    hasPostMoveInfo: !!moveData.postMoveInfo,
    postMoveInfo: moveData.postMoveInfo,
    isExplicitNull: moveData.postMoveInfo === null,
    isInMoveData: 'postMoveInfo' in moveData
  });
  
  console.log('🔥 syncPlayerMove: teamPaces handling:', {
    shouldResetPaces,
    shouldResetMeta,
    moveDataPacesKeys: Object.keys(moveData.teamPaces || {}).length,
    moveDataMetaKeys: Object.keys(moveData.teamPaceMeta || {}).length
  });
  
  // Build gameState update object
  const gameStateUpdate = {
    ...gameData.gameState,
    cards: moveData.cards,
    round: moveData.round,
    currentGroup: moveData.currentGroup,
    currentTeam: moveData.currentTeam,
    teamPaces: shouldResetPaces ? {} : { ...existingTeamPaces, ...moveData.teamPaces },
    teamPaceMeta: shouldResetMeta ? {} : { ...existingTeamPaceMeta, ...moveData.teamPaceMeta },
    teamPaceRound: moveData.teamPaceRound,
    movePhase: moveData.movePhase,
    logs: moveData.logs
  };

  // Conditionally add optional fields if they exist in moveData
  if ('groupSpeed' in moveData) {
    gameStateUpdate.groupSpeed = moveData.groupSpeed;
  }
  if ('slipstream' in moveData) {
    gameStateUpdate.slipstream = moveData.slipstream;
  }
  if ('teamPullInvests' in moveData) {
    // Merge teamPullInvests if it exists
    const existingPullInvests = (gameData.gameState && gameData.gameState.teamPullInvests) || {};
    gameStateUpdate.teamPullInvests = { ...existingPullInvests, ...moveData.teamPullInvests };
  }
  
  // Only include postMoveInfo if it's explicitly in moveData (even if null)
  // This allows clearing postMoveInfo by passing null, or preserving it by not passing it at all
  if ('postMoveInfo' in moveData) {
    console.log('🔥 Including postMoveInfo in Firebase update:', moveData.postMoveInfo);
    gameStateUpdate.postMoveInfo = moveData.postMoveInfo;
  } else {
    console.log('🔥 NOT including postMoveInfo in update (key not present in moveData)');
  }
  
  await updateDoc(gameRef, {
    gameState: gameStateUpdate,
    currentTurn: moveData.currentTeam,
    lastUpdate: serverTimestamp()
  });
};

// Sync AI move from host to all players
export const syncAIMove = async (roomCode, aiMoveData) => {
  const gameRef = doc(db, 'games', roomCode);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  
  await updateDoc(gameRef, {
    gameState: {
      ...gameData.gameState,
      ...aiMoveData
    },
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
