import { create } from 'zustand';
import * as THREE from 'three';

// Constants for platform bounds checking
const PLATFORM_RADIUS = 4;
const MOVEMENT_SPEED = 0.01;
const MAX_SPEED = 0.02;
const ACCELERATION = 0.001;
const DECELERATION = 0.002;
const COLLISION_DISTANCE = 0.4;
const COLLISION_DURATION = 3000; // Milliseconds collision effect lasts
const KNOCKBACK_FORCE = 0.15; // Force applied when characters collide

// Helper function to check if a position is within hexagon bounds
function isWithinHexagon(x: number, z: number, radius: number): boolean {
  // Hexagon boundary check (based on regular hexagon math)
  const absoluteX = Math.abs(x);
  const absoluteZ = Math.abs(z);
  
  // Check against hexagon boundaries
  if (absoluteX > radius * Math.sqrt(3) / 2) return false;
  if (absoluteZ > radius) return false;
  if (absoluteX * 0.5 + absoluteZ * Math.sqrt(3) / 2 > radius * Math.sqrt(3) / 2) return false;
  
  return true;
}

// Fibonacci sequence helper for NPC movement
function getFibonacciNumber(n: number): number {
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

// Define the interface for second NPC target settings
interface SecondNpcTargetSettings {
  timer: number;
  moveDirection: THREE.Vector3;
  fibStep: number;
  fibDirection: number;
}

// Define the game state interface
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
  
  // Platform state
  platformColor: [number, number, number];
  
  // NPC state
  npcPosition: [number, number, number];
  npcRotation: [number, number, number];
  npcTarget: [number, number, number];
  npcWanderTimer: number;
  shouldNpcMove: boolean;
  npcMoveDirection: THREE.Vector3;
  npcFibStep: number;
  npcFibDirection: number;
  
  // Collision state
  isColliding: boolean;
  collisionPosition: [number, number, number];
  collisionTime: number;
  
  // Mobile state
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  
  // Methods for player movement
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  setMoveDirection: (direction: THREE.Vector3) => void;
  updatePosition: () => void;
  
  // Methods for NPC movement
  updateNpcPosition: () => void;
  setNewNpcTarget: () => void;
  
  // Collision detection
  checkCollision: () => void;
  
  // Second NPC properties
  secondNpcPosition: [number, number, number];
  secondNpcRotation: [number, number, number];
  secondNpcMoveDirection: THREE.Vector3;
  secondNpcFibStep: number;
  secondNpcFibDirection: number;
  secondNpcWanderTimer: number;
  shouldSecondNpcMove: boolean;
  
  // Methods for second NPC movement
  updateSecondNpcPosition: () => void;
  setNewSecondNpcTarget: (state: GameState, settings: SecondNpcTargetSettings) => Partial<GameState>;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Player state
  playerPosition: [2, 0, 2],
  playerRotation: [0, 0, 0],
  playerSpeed: [0, 0, 0],
  isMoving: false,
  isStrafing: false,
  currentSpeed: 0,
  movementDirection: [0, 0],
  moveDirection: new THREE.Vector3(),
  isPlayerMoving: false,
  
  // Platform state
  platformColor: [0.1, 0.5, 0.8],
  
  // NPC state
  npcPosition: [-2, 0, -2],
  npcRotation: [0, 0, 0],
  npcTarget: [-2, 0, -2],
  npcWanderTimer: 0,
  shouldNpcMove: true,
  npcMoveDirection: new THREE.Vector3(),
  npcFibStep: 0,
  npcFibDirection: 0,
  
  // Collision state
  isColliding: false,
  collisionPosition: [0, 0, 0],
  collisionTime: 0,
  
  // Mobile state
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  
  // Set the movement direction based on key input
  handleKeyDown: (e) => {
    const { moveDirection, isStrafing } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
    // Toggle strafing mode
    if (e.key === 'Shift') {
      set({ isStrafing: true });
      return;
    }
    
    switch (e.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        newDirection.z = -1;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        newDirection.z = 1;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        newDirection.x = -1;
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        newDirection.x = 1;
        break;
    }
    
    set({ 
      moveDirection: newDirection,
      isPlayerMoving: newDirection.length() > 0
    });
  },
  
  // Clear the movement direction when key is released
  handleKeyUp: (e) => {
    const { moveDirection, isStrafing } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
    // Reset strafing mode
    if (e.key === 'Shift') {
      set({ isStrafing: false });
      return;
    }
    
    switch (e.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        if (moveDirection.z === -1) newDirection.z = 0;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        if (moveDirection.z === 1) newDirection.z = 0;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        if (moveDirection.x === -1) newDirection.x = 0;
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        if (moveDirection.x === 1) newDirection.x = 0;
        break;
    }
    
    set({ 
      moveDirection: newDirection,
      isPlayerMoving: newDirection.length() > 0
    });
  },
  
  // Set movement direction directly (for mobile controls)
  setMoveDirection: (direction) => {
    set({ 
      moveDirection: direction,
      isPlayerMoving: direction.length() > 0
    });
  },
  
  // Update the player's position based on the movement direction with smooth acceleration/deceleration
  updatePosition: () => {
    const { playerPosition, moveDirection, isColliding, currentSpeed, isPlayerMoving } = get();
    
    // No movement during collision animation
    if (isColliding) return;
    
    // Calculate new speed with acceleration or deceleration
    let newSpeed = currentSpeed;
    
    if (isPlayerMoving) {
      // Accelerate when moving
      newSpeed = Math.min(currentSpeed + ACCELERATION, MAX_SPEED);
    } else {
      // Decelerate when not pressing any keys
      newSpeed = Math.max(currentSpeed - DECELERATION, 0);
    }
    
    // Only update position if we have some speed
    if (newSpeed > 0) {
      // Normalize for diagonal movement
      const normalizedDirection = moveDirection.clone().normalize();
      
      // Calculate new position
      const newX = playerPosition[0] + normalizedDirection.x * newSpeed;
      const newZ = playerPosition[2] + normalizedDirection.z * newSpeed;
      
      // Check if the new position is within bounds
      if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
        set({ 
          playerPosition: [newX, playerPosition[1], newZ],
          currentSpeed: newSpeed
        });
      } else {
        // Hit boundary, reduce speed more quickly
        set({ currentSpeed: newSpeed * 0.5 });
      }
    } else {
      // If speed is zero, ensure we store that
      set({ currentSpeed: 0 });
    }
    
    // Check for collision with NPC
    get().checkCollision();
  },
  
  // Update NPC position with Fibonacci pattern
  updateNpcPosition: () => {
    const { 
      npcPosition, 
      npcTarget, 
      npcWanderTimer, 
      npcMoveDirection, 
      isColliding,
      npcFibStep,
      npcFibDirection,
      shouldNpcMove
    } = get();
    
    // No movement during collision animation or if movement is disabled
    if (isColliding || !shouldNpcMove) return;
    
    // Randomly decide if NPC should stop (2% chance per update)
    if (Math.random() < 0.002) {
      // Stop for a random period between 2-7 seconds
      const stopDuration = 2000 + Math.random() * 5000;
      
      set({ shouldNpcMove: false });
      
      setTimeout(() => {
        set({ shouldNpcMove: true });
      }, stopDuration);
      
      return;
    }
    
    // Update wander timer and set new target if needed
    const newTimer = npcWanderTimer - 1;
    if (newTimer <= 0) {
      // Use Fibonacci pattern for movement
      const nextFibStep = (npcFibStep % 10) + 1; // Cycle through first 10 Fibonacci numbers
      const fibValue = getFibonacciNumber(nextFibStep);
      
      // More significant direction changes for wider exploration
      const nextDirection = (npcFibDirection + Math.PI * (0.3 + Math.random() * 0.7)) % (2 * Math.PI);
      
      set({ 
        npcFibStep: nextFibStep,
        npcFibDirection: nextDirection,
        // Shorter timer for more frequent movement changes
        npcWanderTimer: fibValue * 8 + 5 + Math.floor(Math.random() * 20) // Add randomness to timer
      });
      
      get().setNewNpcTarget();
      return;
    }
    
    // Calculate direction to target
    const targetVector = new THREE.Vector3(
      npcTarget[0] - npcPosition[0],
      0,
      npcTarget[2] - npcPosition[2]
    );
    
    // If close to target, set a new target more quickly
    const distanceToTarget = targetVector.length();
    if (distanceToTarget < 0.1) { // Very short threshold to change targets
      set({ 
        npcMoveDirection: new THREE.Vector3(0, 0, 0),
        // Very short pause at destination with randomized duration
        npcWanderTimer: 5 + Math.floor(Math.random() * 30)
      });
      // 40% chance to immediately pick a new target
      if (Math.random() < 0.4) {
        get().setNewNpcTarget();
      }
      return;
    }
    
    // Update direction with slight random deviation
    targetVector.normalize();
    // Add some random drift to movement direction (5% deviation)
    const randomDrift = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      0,
      (Math.random() - 0.5) * 0.1
    );
    targetVector.add(randomDrift).normalize();
    
    set({ npcMoveDirection: targetVector });
    
    // Move towards target with variable speed
    const speedVariation = 0.7 + Math.random() * 0.6; // 70% to 130% of base speed
    const speed = MOVEMENT_SPEED * speedVariation;
    
    const newX = npcPosition[0] + targetVector.x * speed;
    const newZ = npcPosition[2] + targetVector.z * speed;
    
    // Check if new position is within bounds
    if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
      set({ 
        npcPosition: [newX, npcPosition[1], newZ],
        npcRotation: [0, Math.atan2(targetVector.x, targetVector.z), 0],
        npcWanderTimer: newTimer
      });
    } else {
      // If outside bounds, get a new target
      get().setNewNpcTarget();
    }
    
    // Check for collision with player
    get().checkCollision();
  },
  
  // Set a new target for the NPC with more randomness
  setNewNpcTarget: () => {
    const { npcFibStep, npcFibDirection, npcPosition } = get();
    
    // 20% chance to aim for a completely random point
    if (Math.random() < 0.2) {
      // Generate a random angle
      const randomAngle = Math.random() * Math.PI * 2; 
      // Random distance from 30-100% of platform radius
      const randomDistance = PLATFORM_RADIUS * (0.3 + Math.random() * 0.7);
      
      const randomX = Math.cos(randomAngle) * randomDistance;
      const randomZ = Math.sin(randomAngle) * randomDistance;
      
      // Ensure target is within platform bounds
      if (isWithinHexagon(randomX, randomZ, PLATFORM_RADIUS)) {
        set({ npcTarget: [randomX, 0, randomZ] });
        return;
      }
    }
    
    // Use Fibonacci number to determine distance but with more randomness
    const fibNumber = getFibonacciNumber(npcFibStep);
    const normalizedFib = fibNumber / 10; // Scale down to reasonable values
    
    // Wide range of distances
    const distanceVariation = 0.5 + Math.random() * 0.5; // 50% to 100% of max distance
    const distance = PLATFORM_RADIUS * distanceVariation;
    
    // Add randomness to the direction
    const randomOffset = (Math.random() - 0.5) * Math.PI; // ±90 degrees randomness
    const direction = npcFibDirection + randomOffset;
    
    // Calculate new target position using the direction
    const newX = Math.cos(direction) * distance;
    const newZ = Math.sin(direction) * distance;
    
    // Ensure target is within platform bounds
    if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
      set({ npcTarget: [newX, 0, newZ] });
    } else {
      // If outside bounds, pick a point toward an edge
      // Find the closest point on the hexagon edge
      const angle = Math.atan2(newZ, newX);
      const safeDistance = PLATFORM_RADIUS * 0.95; // Very close to edge
      set({ 
        npcTarget: [
          Math.cos(angle) * safeDistance,
          0,
          Math.sin(angle) * safeDistance
        ]
      });
    }
  },
  
  // Check for collision between player and NPC
  checkCollision: () => {
    const { 
      playerPosition, 
      npcPosition, 
      secondNpcPosition, 
      isColliding, 
      collisionTime 
    } = get();
    
    // First check for collision with the main NPC
    const dx1 = npcPosition[0] - playerPosition[0];
    const dz1 = npcPosition[2] - playerPosition[2];
    const distance1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
    
    // Then check for collision with the second NPC
    const dx2 = secondNpcPosition[0] - playerPosition[0];
    const dz2 = secondNpcPosition[2] - playerPosition[2];
    const distance2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
    
    // Debug distances
    // console.log("Distance to NPC1:", distance1, "Distance to NPC2:", distance2);
    
    // Collision with main NPC
    if (distance1 < COLLISION_DISTANCE && !isColliding) {
      console.log("Collision with main NPC!");
      
      // Calculate the collision point
      const collisionX = (playerPosition[0] + npcPosition[0]) / 2;
      const collisionY = 0.3; // Raised up for better visibility
      const collisionZ = (playerPosition[2] + npcPosition[2]) / 2;
      
      // Calculate normalized direction vectors for knockback
      const playerNormDx = dx1 / distance1;
      const playerNormDz = dz1 / distance1;
      
      // Apply knockback to player position (away from NPC)
      const newPlayerX = playerPosition[0] - playerNormDx * KNOCKBACK_FORCE;
      const newPlayerZ = playerPosition[2] - playerNormDz * KNOCKBACK_FORCE;
      
      // Apply knockback to NPC position (away from player)
      const newNpcX = npcPosition[0] + playerNormDx * KNOCKBACK_FORCE;
      const newNpcZ = npcPosition[2] + playerNormDz * KNOCKBACK_FORCE;
      
      // Set a timeout to resume movement after collision
      setTimeout(() => {
        set({ 
          isColliding: false,
          shouldNpcMove: true,
          shouldSecondNpcMove: true
        });
      }, COLLISION_DURATION);
      
      // Return updated state with collision information
      set({
        isColliding: true,
        collisionPosition: [collisionX, collisionY, collisionZ],
        collisionTime: Date.now(),
        playerPosition: [newPlayerX, playerPosition[1], newPlayerZ],
        npcPosition: [newNpcX, npcPosition[1], newNpcZ],
        currentSpeed: 0 // Reset player speed on collision
      });
      
      return;
    }
    
    // Collision with second NPC
    if (distance2 < COLLISION_DISTANCE && !isColliding) {
      console.log("Collision with second NPC!");
      
      // Calculate the collision point
      const collisionX = (playerPosition[0] + secondNpcPosition[0]) / 2;
      const collisionY = 0.3; // Raised up for better visibility
      const collisionZ = (playerPosition[2] + secondNpcPosition[2]) / 2;
      
      // Calculate normalized direction vectors for knockback
      const playerNormDx = dx2 / distance2;
      const playerNormDz = dz2 / distance2;
      
      // Apply knockback to player position (away from NPC)
      const newPlayerX = playerPosition[0] - playerNormDx * KNOCKBACK_FORCE;
      const newPlayerZ = playerPosition[2] - playerNormDz * KNOCKBACK_FORCE;
      
      // Apply knockback to NPC position (away from player)
      const newNpcX = secondNpcPosition[0] + playerNormDx * KNOCKBACK_FORCE;
      const newNpcZ = secondNpcPosition[2] + playerNormDz * KNOCKBACK_FORCE;
      
      // Set a timeout to resume movement after collision
      setTimeout(() => {
        set({ 
          isColliding: false,
          shouldNpcMove: true,
          shouldSecondNpcMove: true
        });
      }, COLLISION_DURATION);
      
      // Return updated state with collision information
      set({
        isColliding: true,
        collisionPosition: [collisionX, collisionY, collisionZ],
        collisionTime: Date.now(),
        playerPosition: [newPlayerX, playerPosition[1], newPlayerZ],
        secondNpcPosition: [newNpcX, secondNpcPosition[1], newNpcZ],
        currentSpeed: 0 // Reset player speed on collision
      });
      
      return;
    }
    
    // If no longer in collision range but still in collision state
    if ((distance1 >= COLLISION_DISTANCE && distance2 >= COLLISION_DISTANCE) && 
        isColliding && Date.now() - collisionTime >= COLLISION_DURATION) {
      set({
        isColliding: false
      });
    }
  },
  
  // Second NPC initialization
  secondNpcPosition: [3, 0, 3], // Start at a different position than first NPC
  secondNpcRotation: [0, 0, 0],
  secondNpcMoveDirection: new THREE.Vector3(),
  secondNpcFibStep: 1,
  secondNpcFibDirection: 1,
  secondNpcWanderTimer: 0,
  shouldSecondNpcMove: true,
  
  // Second NPC movement functions 
  updateSecondNpcPosition: () => {
    set((state) => {
      // No movement during collision
      if (state.isColliding) return state;
      
      // Randomly decide if NPC should stop (5% chance per update)
      if (state.shouldSecondNpcMove && Math.random() < 0.002) {
        // Stop for a random period between 3-8 seconds
        const stopDuration = 3000 + Math.random() * 5000;
        
        setTimeout(() => {
          set({ shouldSecondNpcMove: true });
        }, stopDuration);
        
        return {
          ...state,
          shouldSecondNpcMove: false
        };
      }
      
      // If NPC is stopped, maintain position
      if (!state.shouldSecondNpcMove) {
        return state;
      }
      
      // Add random direction changes (10% chance)
      const shouldChangeDirection = Math.random() < 0.01;
      
      if (shouldChangeDirection) {
        // Pick a completely random point on the platform
        const randomAngle = Math.random() * Math.PI * 2;
        // Use varying distance from center for more randomness
        const randomDistance = PLATFORM_RADIUS * (0.3 + Math.random() * 0.6);
        
        return {
          ...state,
          secondNpcPosition: [
            Math.sin(randomAngle) * randomDistance, 
            0, 
            Math.cos(randomAngle) * randomDistance
          ],
          secondNpcRotation: [
            0,
            Math.atan2(Math.sin(randomAngle), Math.cos(randomAngle)),
            0
          ]
        };
      }
      
      // Current time-based movement but with some randomness added
      const now = Date.now();
      const noiseX = Math.sin(now * 0.001 + 42) * 0.3; // Add some noise to x
      const noiseZ = Math.cos(now * 0.00073 + 17) * 0.3; // Different frequency for z
      
      return {
        ...state,
        secondNpcPosition: [
          Math.sin(now * 0.0003) * 2.5 + noiseX,
          0,
          Math.cos(now * 0.0004) * 2.5 + noiseZ
        ],
        secondNpcRotation: [
          0,
          Math.atan2(
            Math.cos(now * 0.0003) * 0.0003 + Math.cos(now * 0.001) * 0.0001,
            -Math.sin(now * 0.0004) * 0.0004 - Math.sin(now * 0.00073) * 0.0001
          ),
          0
        ]
      };
    });
  },
  
  // Set new target for second NPC
  setNewSecondNpcTarget: (state: GameState, { timer, moveDirection, fibStep, fibDirection }: SecondNpcTargetSettings): Partial<GameState> => {
    // Different target selection for second NPC - more variable radius exploration
    const currentPos = new THREE.Vector3(
      state.secondNpcPosition[0],
      state.secondNpcPosition[1],
      state.secondNpcPosition[2]
    );
    
    // Decide target radius - 2nd NPC explores more outer areas
    const useRandomTarget = Math.random() < 0.2; // 20% chance to use a random target
    
    if (useRandomTarget) {
      // Random point anywhere on platform at varying distances
      const randomAngle = Math.random() * Math.PI * 2;
      // Prefer outer areas (60-95% of radius)
      const randomDistance = PLATFORM_RADIUS * (0.6 + Math.random() * 0.35); 
      
      const targetX = Math.sin(randomAngle) * randomDistance;
      const targetZ = Math.cos(randomAngle) * randomDistance;
      
      // Create direction to this random point
      const direction = new THREE.Vector3(targetX, 0, targetZ).sub(currentPos).normalize();
      
      return {
        ...state,
        secondNpcMoveDirection: direction,
        secondNpcWanderTimer: timer,
        secondNpcFibStep: fibStep,
        secondNpcFibDirection: fibDirection,
        secondNpcRotation: [0, Math.atan2(direction.x, direction.z), 0]
      };
    } 
    
    // For standard movement, use the provided direction
    return {
      ...state,
      secondNpcMoveDirection: moveDirection,
      secondNpcWanderTimer: timer,
      secondNpcFibStep: fibStep,
      secondNpcFibDirection: fibDirection,
      secondNpcRotation: [0, Math.atan2(moveDirection.x, moveDirection.z), 0]
    };
  },
}));

// Helper function for setting second NPC target
function setNewSecondNpcTarget(state: GameState, { timer, moveDirection, fibStep, fibDirection }: SecondNpcTargetSettings): Partial<GameState> {
  return state.setNewSecondNpcTarget(state, { timer, moveDirection, fibStep, fibDirection });
}