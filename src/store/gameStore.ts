import { create } from 'zustand';
import * as THREE from 'three';

// Constants for platform bounds checking
const PLATFORM_RADIUS = 4;
const MOVEMENT_SPEED = 0.003; // Reduced from 0.005
const MAX_SPEED = 0.007; // Reduced from 0.01
const ACCELERATION = 0.0003; // Reduced from 0.0005
const DECELERATION = 0.001; // Reduced from 0.002
const COLLISION_DISTANCE = 0.4;
const COLLISION_DURATION = 3000; // Milliseconds collision effect lasts
const KNOCKBACK_FORCE = 0.15; // Force applied when characters collide
const MUSHROOM_COLLECT_DISTANCE = 0.5; // Distance required to collect a mushroom
const MAX_MUSHROOMS = 8; // Maximum number of mushrooms on the platform at once
const MUSHROOM_POINTS = 10; // Increased base points for collecting a mushroom (from 5 to 10)
const MUSHROOM_BONUS_MIN = 1; // Minimum bonus points
const MUSHROOM_BONUS_MAX = 5; // Maximum bonus points
const MUSHROOM_SPAWN_DELAY = 2000; // Time in ms between mushroom spawns
const MIN_MUSHROOMS = 5; // Minimum number of mushrooms that should be on the platform

// Constants for eyeball configuration
const EYEBALL_COLLECT_DISTANCE = 0.7; // Larger collection distance than mushrooms
const EYEBALL_POINTS = 50; // Significant points for collecting a rare eyeball
const EYEBALL_BONUS_MIN = 10; // Minimum bonus points
const EYEBALL_BONUS_MAX = 30; // Maximum bonus points
const MUSHROOMS_PER_EYEBALL = 33; // Spawn an eyeball after this many mushrooms collected
const MAX_EYEBALLS = 1; // Only one eyeball at a time
const PURPLE_STATE_DURATION = 13000; // Duration of purple state in milliseconds
const POINTS_STEAL_AMOUNT = 15; // Amount of points stolen when in purple state
const POINTS_STEAL_COOLDOWN = 2000; // Cooldown between point stealing in milliseconds
const EYEBALL_FORCE_SPAWN_DELAY = 30000; // Spawn an eyeball after this many ms if none has spawned
const EYEBALL_RESPAWN_DELAY = 5000; // Delay before attempting to respawn an eyeball

// TV position and collision box size
const TV_POSITION = [0, 1.5, -4.5];
const TV_SIZE = { width: 2.5, height: 3, depth: 1.5 };

// Add new constants for purple collision effect
const PURPLE_COLLISION_POINTS = 100; // Points lost when hit by a purple character
const PURPLE_KNOCKBACK_FORCE = 0.6; // Stronger knockback for purple collisions
const PURPLE_COLLISION_COOLDOWN = 1000; // Cooldown between collisions in ms

// Add new constants for hit animation
const HIT_ANIMATION_DURATION = 600; // Duration of hit animation in ms

// Add new constants for melting animation
const MELTING_ANIMATION_DURATION = 3000; // Duration of melting animation in ms

// Constants for melting characters
const MELTING_DURATION = 2; // Duration in seconds for melting animation
const PUDDLE_SCALE = 0.5; // Scale for the melted puddle

// Add these new constants at the top with the other constants
const GAME_RESTART_DELAY = 5000; // Time in ms before restarting after a win
const WIN_SCREEN_DURATION = 4000; // How long to show the win screen
const MIN_POINTS_TO_SURVIVE = 1; // Minimum points needed to avoid melting

// Helper functions
function isWithinHexagon(x: number, z: number, radius: number): boolean {
  const absoluteX = Math.abs(x);
  const absoluteZ = Math.abs(z);
  
  if (absoluteX > radius * Math.sqrt(3) / 2) return false;
  if (absoluteZ > radius) return false;
  if (absoluteX * 0.5 + absoluteZ * Math.sqrt(3) / 2 > radius * Math.sqrt(3) / 2) return false;
  
  return true;
}

function isCollidingWithTV(x: number, z: number): boolean {
  const halfWidth = TV_SIZE.width / 2;
  const halfDepth = TV_SIZE.depth / 2;
  
  return (
    x > TV_POSITION[0] - halfWidth && 
    x < TV_POSITION[0] + halfWidth && 
    z > TV_POSITION[2] - halfDepth && 
    z < TV_POSITION[2] + halfDepth
  );
}

function calculateFibonacci(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  
  let a = 0;
  let b = 1;
  let result = 0;
  
  for (let i = 2; i <= n; i++) {
    result = a + b;
    a = b;
    b = result;
  }
  
  return result;
}

// Interface definitions
interface SecondNpcTargetSettings {
  timer: number;
  moveDirection: THREE.Vector3;
  fibStep: number;
  fibDirection: number;
}

interface Mushroom {
  id: number;
  position: [number, number, number];
  scale: number;
  collected: boolean;
  collectedBy?: string;
  animationProgress: number;
}

interface Eyeball {
  id: number;
  position: [number, number, number];
  scale: number;
  collected: boolean;
  collectedBy?: string;
  animationProgress: number;
  spawnTime: number;
}

// Define game state interface
export interface GameState {
  // Player state
  playerPosition: [number, number, number];
  playerRotation: [number, number, number];
  playerSpeed: [number, number, number];
  isMoving: boolean;
  isStrafing: boolean;
  currentSpeed: number;
  movementDirection: [number, number];
  moveDirection: THREE.Vector3;
  isPlayerMoving: boolean;
  playerScore: number;
  
  // Platform color
  platformColor: [number, number, number];
  
  // NPC state
  npcPosition: [number, number, number];
  npcRotation: [number, number, number];
  npcMoveDirection: THREE.Vector3;
  npcFibStep: number;
  npcFibDirection: number;
  npcWanderTimer: number;
  shouldNpcMove: boolean;
  npcTarget: [number, number, number];
  npcScore: number;
  npcLastPosition: [number, number, number];
  npcStuckCounter: number;
  
  // NPC purple state
  isNpcPurple: boolean;
  npcPurpleEndTime: number;
  npcLastStealTime: number;
  
  // Second NPC state
  secondNpcPosition: [number, number, number];
  secondNpcRotation: [number, number, number];
  secondNpcMoveDirection: THREE.Vector3;
  secondNpcFibStep: number;
  secondNpcFibDirection: number;
  secondNpcWanderTimer: number;
  shouldSecondNpcMove: boolean;
  secondNpcScore: number;
  secondNpcLastPosition: [number, number, number];
  secondNpcStuckCounter: number;
  
  // Second NPC purple state
  isSecondNpcPurple: boolean;
  secondNpcPurpleEndTime: number;
  secondNpcLastStealTime: number;
  
  // Player purple state
  isPlayerPurple: boolean;
  playerPurpleEndTime: number;
  playerLastStealTime: number;
  
  // Melting states and progress
  playerMelted: boolean;
  npcMelted: boolean;
  secondNpcMelted: boolean;
  playerMeltProgress: number;
  npcMeltProgress: number;
  secondNpcMeltProgress: number;
  playerMeltStartTime: number;
  npcMeltStartTime: number;
  secondNpcMeltStartTime: number;
  
  // Collision state
  isColliding: boolean;
  isCollidingWithTV: boolean;
  collisionPosition: [number, number, number];
  collisionTime: number;
  
  // Collision cooldown timers
  playerLastCollisionTime: number;
  npcLastCollisionTime: number;
  secondNpcLastCollisionTime: number;
  
  // Mobile state
  isMobile: boolean;
  
  // Mushroom state
  mushrooms: Mushroom[];
  lastMushroomId: number;
  lastMushroomSpawnTime: number;
  
  // Eyeball state
  eyeballs: Eyeball[];
  lastEyeballId: number;
  lastEyeballSpawnTime: number;
  mushroomsCollectedSinceLastEyeball: number;
  
  // Hit states for visual effects
  isPlayerHit: boolean;
  playerHitTime: number;
  isNpcHit: boolean;
  npcHitTime: number;
  isSecondNpcHit: boolean;
  secondNpcHitTime: number;
  
  // Win state
  winner: string | null;
  showWinScreen: boolean;
  winScreenStartTime: number;
  gameOver: boolean;
  
  // Methods
  setIsMobile: (isMobile: boolean) => void;
  handleKeyDown: (key: string) => void;
  handleKeyUp: (key: string) => void;
  setMoveDirection: (direction: THREE.Vector3) => void;
  updatePosition: () => void;
  updateNpcPosition: () => void;
  setNewNpcTarget: () => void;
  checkCollision: () => void;
  setNewSecondNpcTarget: (state: GameState, settings: SecondNpcTargetSettings) => Partial<GameState>;
  updateNpcScore: () => void;
  updateSecondNpcScore: () => void;
  spawnMushroom: () => void;
  updateMushrooms: (deltaTime: number) => void;
  collectMushroom: (id: number, collector: string) => void;
  trySpawnEyeball: () => void;
  updateEyeballs: (deltaTime: number) => void;
  collectEyeball: (id: number, collector: string) => void;
  updatePurpleStates: () => void;
  checkPointStealing: () => void;
  checkPurpleCollisions: () => void;
  updateHitStates: () => void;
  setPlayerHit: () => void;
  setNpcHit: () => void;
  setSecondNpcHit: () => void;
  updateSecondNpcPosition: () => void;
  checkWinCondition: () => void;
  restartGame: () => void;
  checkMeltingState: () => void;
}

// Create the store
export const useGameStore = create<GameState>((set, get) => ({
  // Player state
  playerPosition: [0, 0, 0],
  playerRotation: [0, 0, 0],
  playerSpeed: [0, 0, 0],
  isMoving: false,
  isStrafing: false,
  currentSpeed: 0,
  movementDirection: [0, 0],
  moveDirection: new THREE.Vector3(0, 0, 0),
  isPlayerMoving: false,
  playerScore: 50,
  
  // Platform color
  platformColor: [1, 1, 1],
  
  // NPC state
  npcPosition: [2, 0, 2],
  npcRotation: [0, 0, 0],
  npcMoveDirection: new THREE.Vector3(),
  npcFibStep: 1,
  npcFibDirection: 1,
  npcWanderTimer: 0,
  shouldNpcMove: true,
  npcTarget: [0, 0, 0],
  npcScore: 50,
  npcLastPosition: [2, 0, 2],
  npcStuckCounter: 0,
  
  // NPC purple state
  isNpcPurple: false,
  npcPurpleEndTime: 0,
  npcLastStealTime: 0,
  
  // Second NPC state
  secondNpcPosition: [-3, 0, -3],
  secondNpcRotation: [0, 0, 0],
  secondNpcMoveDirection: new THREE.Vector3(),
  secondNpcFibStep: 1,
  secondNpcFibDirection: 1,
  secondNpcWanderTimer: 0,
  shouldSecondNpcMove: true,
  secondNpcScore: 50,
  secondNpcLastPosition: [-3, 0, -3],
  secondNpcStuckCounter: 0,
  
  // Second NPC purple state
  isSecondNpcPurple: false,
  secondNpcPurpleEndTime: 0,
  secondNpcLastStealTime: 0,
  
  // Player purple state
  isPlayerPurple: false,
  playerPurpleEndTime: 0,
  playerLastStealTime: 0,
  
  // Melting states and progress
  playerMelted: false,
  npcMelted: false,
  secondNpcMelted: false,
  playerMeltProgress: 0,
  npcMeltProgress: 0,
  secondNpcMeltProgress: 0,
  playerMeltStartTime: 0,
  npcMeltStartTime: 0,
  secondNpcMeltStartTime: 0,
  
  // Collision state
  isColliding: false,
  isCollidingWithTV: false,
  collisionPosition: [0, 0, 0],
  collisionTime: 0,
  
  // Collision cooldown timers
  playerLastCollisionTime: 0,
  npcLastCollisionTime: 0,
  secondNpcLastCollisionTime: 0,
  
  // Mobile state
  isMobile: false,
  
  // Mushroom state
  mushrooms: [],
  lastMushroomId: 0,
  lastMushroomSpawnTime: 0,
  
  // Eyeball state
  eyeballs: [],
  lastEyeballId: 0,
  lastEyeballSpawnTime: 0,
  mushroomsCollectedSinceLastEyeball: 0,
  
  // Hit states for visual effects
  isPlayerHit: false,
  playerHitTime: 0,
  isNpcHit: false,
  npcHitTime: 0,
  isSecondNpcHit: false,
  secondNpcHitTime: 0,
  
  // Win state
  winner: null,
  showWinScreen: false,
  winScreenStartTime: 0,
  gameOver: false,
  
  // Method implementations
  setIsMobile: (isMobile) => set({ isMobile }),
  
  handleKeyDown: (key) => {
    const { moveDirection, isStrafing } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
    // Toggle strafing mode
    if (key === 'Shift' || key === 'ShiftLeft' || key === 'ShiftRight') {
      set({ isStrafing: true });
    }
    
    // Movement keys
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      newDirection.z = -1;
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      newDirection.z = 1;
    }
    
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      newDirection.x = -1;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      newDirection.x = 1;
    }
    
    // Normalize the direction vector to maintain consistent speed in all directions
    if (newDirection.length() > 0) {
      newDirection.normalize();
      set({ 
        moveDirection: newDirection,
        isMoving: true
      });
    }
  },
  
  handleKeyUp: (key) => {
    const { moveDirection } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
    // Handle shift key release for strafing
    if (key === 'Shift' || key === 'ShiftLeft' || key === 'ShiftRight') {
      set({ isStrafing: false });
    }
    
    // Reset movement direction when keys are released
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      if (newDirection.z < 0) newDirection.z = 0;
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      if (newDirection.z > 0) newDirection.z = 0;
    }
    
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (newDirection.x < 0) newDirection.x = 0;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (newDirection.x > 0) newDirection.x = 0;
    }
    
    // Check if we're still moving
    const isStillMoving = newDirection.length() > 0;
    
    set({
      moveDirection: newDirection,
      isMoving: isStillMoving
    });
  },
  
  setMoveDirection: (direction) => {
    set({ 
      moveDirection: direction,
      isPlayerMoving: direction.length() > 0
    });
  },
  
  updatePosition: () => {
    const { 
      playerPosition, 
      moveDirection, 
      currentSpeed, 
      isStrafing,
      isMoving,
      playerMelted
    } = get();
    
    // If player is melted, don't update position
    if (playerMelted) return;
    
    // Calculate the new speed based on acceleration/deceleration
    let newSpeed = currentSpeed;
    
    if (isMoving) {
      // Accelerate up to max speed
      newSpeed = Math.min(currentSpeed + ACCELERATION, MAX_SPEED);
    } else {
      // Decelerate to zero
      newSpeed = Math.max(currentSpeed - DECELERATION, 0);
    }
    
    // Only move if we have some speed
    if (newSpeed > 0) {
      // Calculate new position
      const moveVector = new THREE.Vector3(
        moveDirection.x * newSpeed,
        0,
        moveDirection.z * newSpeed
      );
      
      // Adjust for strafing - move slower when strafing
      if (isStrafing) {
        moveVector.multiplyScalar(0.5);
      }
      
      // Calculate new position
      const newX = playerPosition[0] + moveVector.x;
      const newZ = playerPosition[2] + moveVector.z;
      
      // Check if new position is within platform boundaries
      if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
        // Check for TV collision
        if (isCollidingWithTV(newX, newZ)) {
          // Bounce back from TV
          set({
            isCollidingWithTV: true,
            collisionPosition: [newX, playerPosition[1], newZ],
            collisionTime: Date.now()
          });
          // Reduce speed more dramatically on collision
          set({ currentSpeed: newSpeed * 0.3 });
        } else {
          // Update position and clear collision state if needed
          const now = Date.now();
          set({ 
            playerPosition: [newX, playerPosition[1], newZ],
            currentSpeed: newSpeed,
            isCollidingWithTV: false
          });
          
          // Check for mushroom collection
          const { mushrooms } = get();
          mushrooms.forEach(mushroom => {
            if (mushroom.collected) return;
            
            const dx = mushroom.position[0] - newX;
            const dz = mushroom.position[2] - newZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < MUSHROOM_COLLECT_DISTANCE) {
              get().collectMushroom(mushroom.id, 'player');
            }
          });
          
          // Check for eyeball collection
          const { eyeballs } = get();
          eyeballs.forEach(eyeball => {
            if (eyeball.collected) return;
            
            const dx = eyeball.position[0] - newX;
            const dz = eyeball.position[2] - newZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < EYEBALL_COLLECT_DISTANCE) {
              get().collectEyeball(eyeball.id, 'player');
            }
          });
          
          // Check for point stealing when player is in purple state
          get().checkPointStealing();
          
          // Check if any characters need to melt
          get().checkMeltingState();
          
          // Check if there's a winner
          get().checkWinCondition();
        }
      } else {
        // Hit boundary, reduce speed more quickly
        set({ currentSpeed: newSpeed * 0.5 });
      }
    } else {
      // If speed is zero, ensure we store that
      set({ currentSpeed: 0 });
    }
  },
  
  updateNpcPosition: () => {
    const state = get();
    
    // If NPC is melted, don't update position
    if (state.npcMelted) return;
    
    const now = Date.now();
    
    // Change direction randomly if it's time
    if (now > state.npcWanderTimer) {
      // Calculate Fibonacci number for more interesting movement patterns
      const fibValue = calculateFibonacci(state.npcFibStep);
      
      // Determine new direction with some randomness
      const newDirection = new THREE.Vector3(
        (Math.random() * 2 - 1) * fibValue * 0.2,
        0,
        (Math.random() * 2 - 1) * fibValue * 0.2
      ).normalize();
      
      // Update Fibonacci step (influences movement complexity)
      let newFibStep = state.npcFibStep;
      let newFibDirection = state.npcFibDirection;
      
      if (state.npcFibDirection > 0) {
        newFibStep += 1;
        if (newFibStep > 8) {
          newFibDirection = -1;
        }
      } else {
        newFibStep -= 1;
        if (newFibStep < 1) {
          newFibDirection = 1;
          newFibStep = 1;
        }
      }
      
      // Random timer between 200ms and 800ms + Fibonacci scaling
      const dirChangeDelay = Math.random() * 600 + 200 + fibValue * 8;
      
      set({
        npcMoveDirection: newDirection,
        npcWanderTimer: now + dirChangeDelay,
        npcFibStep: newFibStep,
        npcFibDirection: newFibDirection
      });
    }
    
    // Only move if NPC movement is enabled
    if (state.shouldNpcMove) {
      // Use consistent BASE_MOVEMENT_SPEED plus small random variation
      const speed = 0.007 + (Math.random() * 0.001); // Match player MAX_SPEED
      
      // Calculate new position
      const newPosition: [number, number, number] = [...state.npcPosition];
      newPosition[0] += state.npcMoveDirection.x * speed;
      newPosition[2] += state.npcMoveDirection.z * speed;
      
      // Check platform boundaries
      if (isWithinHexagon(newPosition[0], newPosition[2], PLATFORM_RADIUS * 0.95)) {
        // Check TV collision
        if (isCollidingWithTV(newPosition[0], newPosition[2])) {
          // Reverse direction if hitting the TV
          set({
            npcMoveDirection: new THREE.Vector3(
              -state.npcMoveDirection.x,
              0,
              -state.npcMoveDirection.z
            )
          });
        } else {
          // Update position if checks pass
          set({ npcPosition: newPosition });
          
          // Check for mushroom collection
          const { mushrooms } = state;
          mushrooms.forEach(mushroom => {
            if (mushroom.collected) return;
            
            const dx = mushroom.position[0] - newPosition[0];
            const dz = mushroom.position[2] - newPosition[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < MUSHROOM_COLLECT_DISTANCE) {
              get().collectMushroom(mushroom.id, 'npc');
            }
          });
          
          // Check for eyeball collection
          const { eyeballs } = state;
          eyeballs.forEach(eyeball => {
            if (eyeball.collected) return;
            
            const dx = eyeball.position[0] - newPosition[0];
            const dz = eyeball.position[2] - newPosition[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < EYEBALL_COLLECT_DISTANCE) {
              get().collectEyeball(eyeball.id, 'npc');
            }
          });
        }
      } else {
        // Point back toward center if going out of bounds
        const dirToCenter = new THREE.Vector3(
          -newPosition[0],
          0,
          -newPosition[2]
        ).normalize();
        
        set({ npcMoveDirection: dirToCenter });
      }
      
      // Check for being stuck
      const { npcLastPosition } = state;
      const moveDistance = Math.sqrt(
        Math.pow(newPosition[0] - npcLastPosition[0], 2) +
        Math.pow(newPosition[2] - npcLastPosition[2], 2)
      );
      
      // If barely moved, increment stuck counter
      if (moveDistance < 0.01) {
        set({ npcStuckCounter: state.npcStuckCounter + 1 });
        
        // If stuck for too long, force a direction change
        if (state.npcStuckCounter > 10) {
          const randomDirection = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
          ).normalize();
          
          set({
            npcMoveDirection: randomDirection,
            npcStuckCounter: 0
          });
        }
      } else {
        // Reset stuck counter if moving normally
        set({
          npcLastPosition: newPosition,
          npcStuckCounter: 0
        });
      }
      
      // Check if any characters need to melt
      get().checkMeltingState();
      
      // Check if there's a winner
      get().checkWinCondition();
    }
  },
  
  setNewNpcTarget: () => {
    // Placeholder - implement actual functionality
    const { npcPosition } = get();
    // Logic to set a new NPC target would go here
  },
  
  checkCollision: () => {
    // Placeholder - implement actual functionality
    // Collision detection logic would go here
  },
  
  setNewSecondNpcTarget: (state, settings) => {
    return {
      secondNpcMoveDirection: settings.moveDirection,
      secondNpcWanderTimer: settings.timer,
      secondNpcFibStep: settings.fibStep,
      secondNpcFibDirection: settings.fibDirection
    };
  },
  
  updateNpcScore: () => {
    // Placeholder - implement actual functionality
    // NPC score update logic would go here
  },
  
  updateSecondNpcScore: () => {
    // Placeholder - implement actual functionality
    // Second NPC score update logic would go here
  },
  
  updateMushrooms: (deltaTime) => {
    const { mushrooms } = get();
    const now = Date.now();
    
    // Get uncollected mushrooms count
    const uncollectedCount = mushrooms.filter(m => !m.collected).length;
    
    // Ensure we maintain a minimum number of mushrooms by forcing spawns
    if (uncollectedCount < MIN_MUSHROOMS) {
      console.log(`Low mushroom count (${uncollectedCount}/${MIN_MUSHROOMS}) - spawning more`);
      // Try multiple times to ensure we get new mushrooms
      for (let i = 0; i < (MIN_MUSHROOMS - uncollectedCount); i++) {
        setTimeout(() => get().spawnMushroom(), i * 100); // Faster staggered spawns
      }
    }
    
    // Update mushroom animation states
    const updatedMushrooms = mushrooms.map(mushroom => {
      if (mushroom.collected && mushroom.animationProgress < 1) {
        // Update collection animation progress
        return {
          ...mushroom,
          animationProgress: Math.min(mushroom.animationProgress + deltaTime * 1.5, 1)
        };
      }
      return mushroom;
    });
    
    // Only remove mushrooms that have been fully collected AND completed their animation
    const filteredMushrooms = updatedMushrooms.filter(m => {
      // Keep uncollected mushrooms
      if (!m.collected) return true;
      
      // If collected but animation not complete, keep it
      if (m.animationProgress < 1) return true;
      
      // Remove only if fully collected and animation complete
      return false;
    });
    
    // Update state
    set({ 
      mushrooms: filteredMushrooms,
      // Force second NPC to move
      shouldSecondNpcMove: true
    });
    
    // Try to spawn a new mushroom regularly
    if (now % 3 === 0) { // More frequent spawn attempts
      get().spawnMushroom();
    }
  },
  
  spawnMushroom: () => {
    const now = Date.now();
    const { lastMushroomSpawnTime, mushrooms, lastMushroomId } = get();
    
    // Filter to get only uncollected mushrooms
    const uncollectedMushrooms = mushrooms.filter(m => !m.collected);
    
    // Don't spawn if we have too many mushrooms, but ignore the delay check to be more aggressive with spawning
    if (uncollectedMushrooms.length >= MAX_MUSHROOMS) {
      console.log(`Already have ${uncollectedMushrooms.length}/${MAX_MUSHROOMS} mushrooms - skipping spawn`);
      return;
    }
    
    // Find a random position on the platform
    let x = 0, z = 0;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 30; // Increased max attempts for better success rate
    
    // Keep trying until we find a valid position or run out of attempts
    while (!validPosition && attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (PLATFORM_RADIUS * 0.8);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      attempts++;
      
      // Position is valid if not colliding with TV
      if (!isCollidingWithTV(x, z)) {
        validPosition = true;
      }
    }
    
    // If couldn't find a valid position, just place it away from the center
    if (!validPosition) {
      x = (Math.random() > 0.5 ? 1 : -1) * (PLATFORM_RADIUS * 0.6);
      z = (Math.random() > 0.5 ? 1 : -1) * (PLATFORM_RADIUS * 0.6);
    }
    
    // Generate random scale for the mushroom
    const scale = 0.3 + Math.random() * 0.2;
    
    // Create new mushroom
    const newMushroom: Mushroom = {
      id: lastMushroomId + 1,
      position: [x, 0, z],
      scale,
      collected: false,
      animationProgress: 0
    };
    
    // Update state
    set({
      mushrooms: [...mushrooms, newMushroom],
      lastMushroomId: lastMushroomId + 1,
      lastMushroomSpawnTime: now
    });
    
    console.log(`Spawned new mushroom at [${x.toFixed(2)}, 0, ${z.toFixed(2)}], total: ${uncollectedMushrooms.length + 1}`);
  },
  
  collectMushroom: (id: number, collector: string) => {
    const mushrooms = get().mushrooms;
    const mushroom = mushrooms.find(m => m.id === id);
    
    // Return if mushroom doesn't exist or is already collected
    if (!mushroom || mushroom.collected) return;
    
    // Mark as collected and track collector
    mushroom.collected = true;
    mushroom.collectedBy = collector;
    
    // Calculate bonus points (more for consecutive collections)
    const bonusPoints = Math.floor(Math.random() * (MUSHROOM_BONUS_MAX - MUSHROOM_BONUS_MIN + 1)) + MUSHROOM_BONUS_MIN;
    const totalPoints = MUSHROOM_POINTS + bonusPoints;
    
    // Update scores based on collector
    if (collector === 'player') {
      set(state => ({
        playerScore: state.playerScore + totalPoints
      }));
    } else if (collector === 'npc') {
      set(state => ({
        npcScore: state.npcScore + totalPoints
      }));
    } else if (collector === 'secondNpc') {
      set(state => ({
        secondNpcScore: state.secondNpcScore + totalPoints
      }));
    }
    
    // Update the mushroom collection
    set(state => ({
      mushrooms: state.mushrooms.map(m => 
        m.id === id ? { ...m, collected: true, collectedBy: collector } : m
      ),
      mushroomsCollectedSinceLastEyeball: state.mushroomsCollectedSinceLastEyeball + 1
    }));
    
    // Try to spawn an eyeball if we've collected enough mushrooms
    if (get().mushroomsCollectedSinceLastEyeball >= MUSHROOMS_PER_EYEBALL) {
      get().trySpawnEyeball();
    }
  },
  
  trySpawnEyeball: () => {
    const { eyeballs, lastEyeballId, lastEyeballSpawnTime } = get();
    const now = Date.now();
    
    // Don't spawn if we recently spawned one or already have max eyeballs
    if (now - lastEyeballSpawnTime < EYEBALL_RESPAWN_DELAY || eyeballs.filter(e => !e.collected).length >= MAX_EYEBALLS) {
      return;
    }
    
    // Find a random position on the platform
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * (PLATFORM_RADIUS * 0.7);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Check if position is too close to TV
    if (isCollidingWithTV(x, z)) {
      // Try again next frame
      return;
    }
    
    // Create new eyeball
    const newEyeball: Eyeball = {
      id: lastEyeballId + 1,
      position: [x, 0.5, z], // Slightly above the platform
      scale: 1.0,
      collected: false,
      animationProgress: 0,
      spawnTime: now
    };
    
    // Update state
    set({
      eyeballs: [...eyeballs, newEyeball],
      lastEyeballId: lastEyeballId + 1,
      lastEyeballSpawnTime: now,
      mushroomsCollectedSinceLastEyeball: 0 // Reset counter
    });
    
    console.log("Eyeball spawned!");
  },
  
  updateEyeballs: (deltaTime) => {
    const { eyeballs } = get();
    
    // Update eyeball animation states
    const updatedEyeballs = eyeballs.map(eyeball => {
      if (eyeball.collected && eyeball.animationProgress < 1) {
        // Update collection animation progress
        return {
          ...eyeball,
          animationProgress: Math.min(eyeball.animationProgress + deltaTime * 2, 1)
        };
      }
      return eyeball;
    });
    
    // Remove fully collected eyeballs
    const filteredEyeballs = updatedEyeballs.filter(e => 
      !e.collected || e.animationProgress < 1
    );
    
    // Update state
    set({ eyeballs: filteredEyeballs });
  },
  
  collectEyeball: (id, collector) => {
    const { eyeballs, playerScore, npcScore, secondNpcScore } = get();
    
    const eyeballToCollect = eyeballs.find(e => e.id === id);
    const wasAlreadyCollected = eyeballToCollect?.collected || false;
    
    // If already collected, don't do anything
    if (wasAlreadyCollected) return;
    
    // Update the eyeball state
    const updatedEyeballs = eyeballs.map(eyeball => {
      if (eyeball.id === id) {
        return { ...eyeball, collected: true, collectedBy: collector };
      }
      return eyeball;
    });
    
    // Calculate points with bonus
    const bonusPoints = Math.floor(Math.random() * (EYEBALL_BONUS_MAX - EYEBALL_BONUS_MIN + 1)) + EYEBALL_BONUS_MIN;
    const totalPoints = EYEBALL_POINTS + bonusPoints;
    
    // Update scores and enter purple state for collector
    if (collector === "player") {
      // Update player score and enter purple state
      set({
        eyeballs: updatedEyeballs,
        playerScore: playerScore + totalPoints,
        isPlayerPurple: true,
        playerPurpleEndTime: Date.now() + PURPLE_STATE_DURATION
      });
      console.log(`Player enters purple state for ${PURPLE_STATE_DURATION/1000} seconds!`);
    } 
    else if (collector === "npc") {
      // Update NPC score and enter purple state
      set({
        eyeballs: updatedEyeballs,
        npcScore: npcScore + totalPoints,
        isNpcPurple: true,
        npcPurpleEndTime: Date.now() + PURPLE_STATE_DURATION
      });
      console.log(`Anuki enters purple state for ${PURPLE_STATE_DURATION/1000} seconds!`);
    } 
    else if (collector === "secondNpc") {
      // Update second NPC score and enter purple state
      set({
        eyeballs: updatedEyeballs,
        secondNpcScore: secondNpcScore + totalPoints,
        isSecondNpcPurple: true,
        secondNpcPurpleEndTime: Date.now() + PURPLE_STATE_DURATION
      });
      console.log(`Eldara enters purple state for ${PURPLE_STATE_DURATION/1000} seconds!`);
    }
  },
  
  updatePurpleStates: () => {
    const { 
      isPlayerPurple, playerPurpleEndTime,
      isNpcPurple, npcPurpleEndTime,
      isSecondNpcPurple, secondNpcPurpleEndTime
    } = get();
    
    const now = Date.now();
    
    // Check and update player purple state
    if (isPlayerPurple && now > playerPurpleEndTime) {
      set({ isPlayerPurple: false });
      console.log("Player's purple state ended");
    }
    
    // Check and update NPC purple state
    if (isNpcPurple && now > npcPurpleEndTime) {
      set({ isNpcPurple: false });
      console.log("Anuki's purple state ended");
    }
    
    // Check and update second NPC purple state
    if (isSecondNpcPurple && now > secondNpcPurpleEndTime) {
      set({ isSecondNpcPurple: false });
      console.log("Eldara's purple state ended");
    }
  },
  
  checkPointStealing: () => {
    const { 
      isPlayerPurple, playerLastStealTime,
      isNpcPurple, npcLastStealTime,
      isSecondNpcPurple, secondNpcLastStealTime,
      playerPosition, npcPosition, secondNpcPosition,
      playerScore, npcScore, secondNpcScore
    } = get();
    
    const now = Date.now();
    
    // Check player stealing from NPCs
    if (isPlayerPurple && now - playerLastStealTime > POINTS_STEAL_COOLDOWN) {
      // Check distance to first NPC
      const distToNpc = Math.sqrt(
        Math.pow(playerPosition[0] - npcPosition[0], 2) +
        Math.pow(playerPosition[2] - npcPosition[2], 2)
      );
      
      // Check distance to second NPC
      const distToSecondNpc = Math.sqrt(
        Math.pow(playerPosition[0] - secondNpcPosition[0], 2) +
        Math.pow(playerPosition[2] - secondNpcPosition[2], 2)
      );
      
      let didSteal = false;
      
      // Steal from first NPC if close enough
      if (distToNpc < COLLISION_DISTANCE && npcScore > 0) {
        const stealAmount = Math.min(npcScore, POINTS_STEAL_AMOUNT);
        set({
          playerScore: playerScore + stealAmount,
          npcScore: npcScore - stealAmount,
          playerLastStealTime: now,
          isNpcHit: true,
          npcHitTime: now
        });
        console.log(`Player stole ${stealAmount} points from Anuki!`);
        didSteal = true;
      }
      
      // Steal from second NPC if close enough and didn't steal from first
      if (!didSteal && distToSecondNpc < COLLISION_DISTANCE && secondNpcScore > 0) {
        const stealAmount = Math.min(secondNpcScore, POINTS_STEAL_AMOUNT);
        set({
          playerScore: playerScore + stealAmount,
          secondNpcScore: secondNpcScore - stealAmount,
          playerLastStealTime: now,
          isSecondNpcHit: true,
          secondNpcHitTime: now
        });
        console.log(`Player stole ${stealAmount} points from Eldara!`);
      }
    }
    
    // Similar checks for NPCs stealing points can be added here
  },
  
  updateHitStates: () => {
    const { 
      isPlayerHit, playerHitTime,
      isNpcHit, npcHitTime,
      isSecondNpcHit, secondNpcHitTime
    } = get();
    
    const now = Date.now();
    
    // Check and reset player hit state
    if (isPlayerHit && now - playerHitTime > HIT_ANIMATION_DURATION) {
      set({ isPlayerHit: false });
    }
    
    // Check and reset NPC hit state
    if (isNpcHit && now - npcHitTime > HIT_ANIMATION_DURATION) {
      set({ isNpcHit: false });
    }
    
    // Check and reset second NPC hit state
    if (isSecondNpcHit && now - secondNpcHitTime > HIT_ANIMATION_DURATION) {
      set({ isSecondNpcHit: false });
    }
  },
  
  setPlayerHit: () => set({ isPlayerHit: true, playerHitTime: Date.now() }),
  
  setNpcHit: () => set({ isNpcHit: true, npcHitTime: Date.now() }),
  
  setSecondNpcHit: () => set({ isSecondNpcHit: true, secondNpcHitTime: Date.now() }),
  
  updateSecondNpcPosition: () => {
    const state = get();
    
    // If second NPC is melted, don't update position
    if (state.secondNpcMelted) return;
    
    const now = Date.now();
    
    // Ensure movement is enabled
    if (state.shouldSecondNpcMove === undefined) {
      set({ shouldSecondNpcMove: true });
    }
    
    // Change direction randomly if it's time
    if (now > state.secondNpcWanderTimer) {
      // Calculate Fibonacci number for more interesting movement patterns
      const fibValue = calculateFibonacci(state.secondNpcFibStep);
      
      // Determine new direction with more randomness to ensure movement
      const newDirection = new THREE.Vector3(
        (Math.random() * 2 - 1) * fibValue * 0.3, // Increased randomness
        0,
        (Math.random() * 2 - 1) * fibValue * 0.3
      ).normalize();
      
      // Update Fibonacci step (influences movement complexity)
      let newFibStep = state.secondNpcFibStep;
      let newFibDirection = state.secondNpcFibDirection;
      
      if (state.secondNpcFibDirection > 0) {
        newFibStep += 1;
        if (newFibStep > 8) {
          newFibDirection = -1;
        }
      } else {
        newFibStep -= 1;
        if (newFibStep < 1) {
          newFibDirection = 1;
          newFibStep = 1;
        }
      }
      
      // Random timer between 200ms and 1000ms + Fibonacci scaling
      const dirChangeDelay = Math.random() * 800 + 200 + fibValue * 10;
      
      // Use the helper function to update settings
      const settings = {
        timer: now + dirChangeDelay,
        moveDirection: newDirection,
        fibStep: newFibStep,
        fibDirection: newFibDirection
      };
      
      // Apply settings updates
      const updates = get().setNewSecondNpcTarget(state, settings);
      set(updates);
    }
    
    // Only move if NPC movement is enabled
    if (state.shouldSecondNpcMove) {
      // Use consistent BASE_MOVEMENT_SPEED plus small random variation
      const speed = 0.007 + (Math.random() * 0.001); // Match player MAX_SPEED
      
      // Calculate new position
      const newPosition: [number, number, number] = [...state.secondNpcPosition];
      newPosition[0] += state.secondNpcMoveDirection.x * speed;
      newPosition[2] += state.secondNpcMoveDirection.z * speed;
      
      // Check platform boundaries
      if (isWithinHexagon(newPosition[0], newPosition[2], PLATFORM_RADIUS * 0.95)) {
        // Check TV collision
        if (isCollidingWithTV(newPosition[0], newPosition[2])) {
          // Reverse direction if hitting the TV
          const reverseDirection = new THREE.Vector3(
            -state.secondNpcMoveDirection.x,
            0,
            -state.secondNpcMoveDirection.z
          );
          
          set({ secondNpcMoveDirection: reverseDirection });
        } else {
          // Update position if checks pass
          set({ secondNpcPosition: newPosition });
          
          // Check for mushroom collection
          const { mushrooms } = state;
          mushrooms.forEach(mushroom => {
            if (mushroom.collected) return;
            
            const dx = mushroom.position[0] - newPosition[0];
            const dz = mushroom.position[2] - newPosition[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < MUSHROOM_COLLECT_DISTANCE) {
              get().collectMushroom(mushroom.id, 'secondNpc');
            }
          });
          
          // Check for eyeball collection
          const { eyeballs } = state;
          eyeballs.forEach(eyeball => {
            if (eyeball.collected) return;
            
            const dx = eyeball.position[0] - newPosition[0];
            const dz = eyeball.position[2] - newPosition[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < EYEBALL_COLLECT_DISTANCE) {
              get().collectEyeball(eyeball.id, 'secondNpc');
            }
          });
        }
      } else {
        // Calculate distance from center
        const distFromCenter = Math.sqrt(
          newPosition[0] * newPosition[0] + 
          newPosition[2] * newPosition[2]
        );
        
        // Point back toward center with more force if far from center
        const dirToCenter = new THREE.Vector3(
          -newPosition[0],
          0,
          -newPosition[2]
        ).normalize();
        
        // Apply immediate position correction to move away from edge
        const correctedPosition: [number, number, number] = [...state.secondNpcPosition];
        const correctionForce = 0.05; // Force to push back from edge
        
        correctedPosition[0] += dirToCenter.x * correctionForce;
        correctedPosition[2] += dirToCenter.z * correctionForce;
        
        // Force a direction change toward center
        set({ 
          secondNpcMoveDirection: dirToCenter,
          secondNpcPosition: correctedPosition,
          secondNpcStuckCounter: 0 // Reset stuck counter when boundary correction happens
        });
      }
      
      // Check for being stuck
      const { secondNpcLastPosition } = state;
      const moveDistance = Math.sqrt(
        Math.pow(newPosition[0] - secondNpcLastPosition[0], 2) +
        Math.pow(newPosition[2] - secondNpcLastPosition[2], 2)
      );
      
      // If barely moved, increment stuck counter
      if (moveDistance < 0.01) {
        set({ secondNpcStuckCounter: state.secondNpcStuckCounter + 1 });
        
        // If stuck for too long, force a direction change
        if (state.secondNpcStuckCounter > 5) { // Reduced from 10 to 5 for quicker unstucking
          const randomDirection = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
          ).normalize();
          
          set({
            secondNpcMoveDirection: randomDirection,
            secondNpcStuckCounter: 0
          });
        }
      } else {
        // Reset stuck counter if moving normally
        set({
          secondNpcLastPosition: newPosition,
          secondNpcStuckCounter: 0
        });
      }
      
      // Check if any characters need to melt
      get().checkMeltingState();
      
      // Check if there's a winner
      get().checkWinCondition();
    }
  },
  
  checkPurpleCollisions: () => {
    const {
      isPlayerPurple, playerPosition, playerLastCollisionTime,
      isNpcPurple, npcPosition, npcLastCollisionTime,
      isSecondNpcPurple, secondNpcPosition, secondNpcLastCollisionTime,
      playerScore, npcScore, secondNpcScore
    } = get();
    
    const now = Date.now();
    
    // Check player collisions with NPCs
    if (isPlayerPurple && now - playerLastCollisionTime > PURPLE_COLLISION_COOLDOWN) {
      // Check distance to first NPC
      const distToNpc = Math.sqrt(
        Math.pow(playerPosition[0] - npcPosition[0], 2) +
        Math.pow(playerPosition[2] - npcPosition[2], 2)
      );
      
      // Check distance to second NPC
      const distToSecondNpc = Math.sqrt(
        Math.pow(playerPosition[0] - secondNpcPosition[0], 2) +
        Math.pow(playerPosition[2] - secondNpcPosition[2], 2)
      );
      
      // Collide with first NPC if close enough
      if (distToNpc < COLLISION_DISTANCE) {
        // First NPC loses points
        const pointsLost = Math.min(npcScore, PURPLE_COLLISION_POINTS);
        
        set({
          npcScore: npcScore - pointsLost,
          playerLastCollisionTime: now,
          isNpcHit: true,
          npcHitTime: now
        });
        
        console.log(`Anuki lost ${pointsLost} points from purple collision!`);
      }
      
      // Collide with second NPC if close enough
      if (distToSecondNpc < COLLISION_DISTANCE) {
        // Second NPC loses points
        const pointsLost = Math.min(secondNpcScore, PURPLE_COLLISION_POINTS);
        
        set({
          secondNpcScore: secondNpcScore - pointsLost,
          playerLastCollisionTime: now,
          isSecondNpcHit: true,
          secondNpcHitTime: now
        });
        
        console.log(`Eldara lost ${pointsLost} points from purple collision!`);
      }
    }
    
    // Similar checks can be implemented for NPCs colliding with player and each other
  },
  
  checkWinCondition: () => {
    const { 
      playerScore, npcScore, secondNpcScore,
      playerMelted, npcMelted, secondNpcMelted,
      gameOver, winner
    } = get();
    
    // If game is already over, don't check again
    if (gameOver) return;
    
    // Count unmelted characters
    let unmeltedCount = 0;
    let lastUnmelted = '';
    
    if (!playerMelted && playerScore >= MIN_POINTS_TO_SURVIVE) {
      unmeltedCount++;
      lastUnmelted = 'player';
    }
    
    if (!npcMelted && npcScore >= MIN_POINTS_TO_SURVIVE) {
      unmeltedCount++;
      lastUnmelted = 'npc';
    }
    
    if (!secondNpcMelted && secondNpcScore >= MIN_POINTS_TO_SURVIVE) {
      unmeltedCount++;
      lastUnmelted = 'secondNpc';
    }
    
    // If only one character remains, they win
    if (unmeltedCount === 1 && !winner) {
      const now = Date.now();
      
      let winnerName = '';
      if (lastUnmelted === 'player') winnerName = 'Player';
      else if (lastUnmelted === 'npc') winnerName = 'Anuki';
      else if (lastUnmelted === 'secondNpc') winnerName = 'Eldara';
      
      console.log(`${winnerName} wins the game!`);
      
      set({
        winner: lastUnmelted,
        showWinScreen: true,
        winScreenStartTime: now,
        gameOver: true
      });
      
      // Schedule game restart
      setTimeout(() => {
        get().restartGame();
      }, GAME_RESTART_DELAY);
    }
  },
  
  restartGame: () => {
    console.log("Restarting game...");
    
    // Reset all character states and scores
    set({
      // Reset scores
      playerScore: 50,
      npcScore: 50,
      secondNpcScore: 50,
      
      // Reset positions
      playerPosition: [0, 0, 0],
      npcPosition: [2, 0, 2],
      secondNpcPosition: [-3, 0, -3],
      
      // Reset melting states
      playerMelted: false,
      npcMelted: false,
      secondNpcMelted: false,
      playerMeltProgress: 0,
      npcMeltProgress: 0,
      secondNpcMeltProgress: 0,
      
      // Reset purple states
      isPlayerPurple: false,
      isNpcPurple: false,
      isSecondNpcPurple: false,
      
      // Reset game state
      winner: null,
      showWinScreen: false,
      gameOver: false,
      
      // Reset mushroom and eyeball counts to force respawns
      mushrooms: [],
      eyeballs: [],
      lastMushroomId: 0,
      lastEyeballId: 0,
      mushroomsCollectedSinceLastEyeball: 0
    });
    
    // Force initial mushroom and eyeball spawns for the new game
    const state = get();
    for (let i = 0; i < MIN_MUSHROOMS; i++) {
      state.spawnMushroom();
    }
    state.trySpawnEyeball();
  },
  
  checkMeltingState: () => {
    const { 
      playerScore, npcScore, secondNpcScore,
      playerMelted, npcMelted, secondNpcMelted,
      playerMeltProgress, npcMeltProgress, secondNpcMeltProgress,
      playerMeltStartTime, npcMeltStartTime, secondNpcMeltStartTime
    } = get();
    
    const now = Date.now();
    
    // Force second NPC to move if not melted
    if (!secondNpcMelted) {
      set({ shouldSecondNpcMove: true });
    }
    
    // Check player melting
    if (playerScore < MIN_POINTS_TO_SURVIVE && !playerMelted) {
      set({ 
        playerMelted: true, 
        playerMeltStartTime: now 
      });
      console.log("Player is melting!");
    }
    
    // Check NPC melting
    if (npcScore < MIN_POINTS_TO_SURVIVE && !npcMelted) {
      set({ 
        npcMelted: true, 
        npcMeltStartTime: now 
      });
      console.log("Anuki is melting!");
    }
    
    // Check second NPC melting
    if (secondNpcScore < MIN_POINTS_TO_SURVIVE && !secondNpcMelted) {
      set({ 
        secondNpcMelted: true, 
        secondNpcMeltStartTime: now 
      });
      console.log("Eldara is melting!");
    }
    
    // Update melting progress for player
    if (playerMelted && playerMeltProgress < 1) {
      const elapsed = (now - playerMeltStartTime) / (MELTING_ANIMATION_DURATION);
      const progress = Math.min(elapsed, 1);
      set({ playerMeltProgress: progress });
    }
    
    // Update melting progress for NPC
    if (npcMelted && npcMeltProgress < 1) {
      const elapsed = (now - npcMeltStartTime) / (MELTING_ANIMATION_DURATION);
      const progress = Math.min(elapsed, 1);
      set({ npcMeltProgress: progress });
    }
    
    // Update melting progress for second NPC
    if (secondNpcMelted && secondNpcMeltProgress < 1) {
      const elapsed = (now - secondNpcMeltStartTime) / (MELTING_ANIMATION_DURATION);
      const progress = Math.min(elapsed, 1);
      set({ secondNpcMeltProgress: progress });
    }
  }
})); 