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
  
  // Update NPC position based on calculated path and allow for stops
  updateNpcPosition: () => {
    const state = get();
    
    // Skip if collision or movement disabled
    if (state.isColliding || !state.shouldNpcMove) return;
    
    const now = Date.now();
    let { npcWanderTimer, npcPosition, npcRotation, npcMoveDirection, npcFibStep, npcFibDirection } = state;
    
    // Get next Fibonacci value (for variable timing)
    const fibValue = getFibonacciNumber(state.npcFibStep);
    
    // Check if it's time to stop/change direction
    if (now > npcWanderTimer) {
      // 30% chance to stop for a while
      if (Math.random() < 0.3) {
        // Longer pause when stopping (using Fibonacci for varied timing)
        const pauseDuration = fibValue * 100 + 1000;
        console.log(`NPC pausing for ${pauseDuration}ms`);
        
        set({
          npcWanderTimer: now + pauseDuration,
          shouldNpcMove: false
        });
        
        // Set a timeout to resume movement
        setTimeout(() => {
          set({ shouldNpcMove: true });
        }, pauseDuration);
        
        return;
      }
      
      // Otherwise, change direction more frequently
      const newDirection = new THREE.Vector3();
      
      // 85% chance of slight direction change, 15% chance of major change
      if (Math.random() < 0.85) {
        // Get current direction and add some randomness
        newDirection.copy(npcMoveDirection);
        
        // Add jitter - random angle between -45 and 45 degrees
        const angle = (Math.random() - 0.5) * Math.PI / 2;
        newDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      } else {
        // Completely new random direction
        newDirection.set(
          Math.random() * 2 - 1,
          0,
          Math.random() * 2 - 1
        ).normalize();
      }
      
      // Update Fibonacci pattern step
      const newFibStep = state.npcFibStep + state.npcFibDirection;
      
      // Reverse direction if we reach limits
      let newFibDirection = state.npcFibDirection;
      if (newFibStep > 10 || newFibStep < 1) {
        newFibDirection = -newFibDirection;
      }
      
      // Random timer between 300ms and 1000ms + Fibonacci scaling
      const dirChangeDelay = Math.random() * 700 + 300 + fibValue * 8;
      
      set({
        npcMoveDirection: newDirection,
        npcWanderTimer: now + dirChangeDelay,
        npcFibStep: newFibStep,
        npcFibDirection: newFibDirection
      });
    }
    
    // Only move if we should move
    if (state.shouldNpcMove) {
      // Vary the speed slightly for more natural movement
      const speed = 0.02 + (Math.random() * 0.01);
      
      // Calculate new position
      const newPosition: [number, number, number] = [...npcPosition];
      newPosition[0] += npcMoveDirection.x * speed;
      newPosition[2] += npcMoveDirection.z * speed;
      
      // Ensure NPC stays within platform bounds
      const distance = Math.sqrt(newPosition[0] * newPosition[0] + newPosition[2] * newPosition[2]);
      if (distance > 9.5) {
        // Bounce off the edge with a bit of randomness
        npcMoveDirection.reflect(new THREE.Vector3(newPosition[0], 0, newPosition[2]).normalize());
        
        // Add slight random deviation after bounce
        const bounceAngle = (Math.random() - 0.5) * Math.PI / 6;
        npcMoveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), bounceAngle);
        
        // Recalculate position to stay in bounds
        newPosition[0] = npcPosition[0] + npcMoveDirection.x * speed;
        newPosition[2] = npcPosition[2] + npcMoveDirection.z * speed;
      }
      
      // Calculate rotation to face movement direction
      const targetRotation = Math.atan2(npcMoveDirection.x, npcMoveDirection.z);
      
      // Smooth rotation
      const rotationSpeed = 0.1;
      let newRotation = npcRotation[1];
      
      // Calculate the shortest angle difference
      let rotDiff = targetRotation - newRotation;
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      // Apply smooth rotation
      newRotation += rotDiff * rotationSpeed;
      
      set({
        npcPosition: newPosition,
        npcRotation: [0, newRotation, 0] as [number, number, number],
        isPlayerMoving: true
      });
    } else {
      // If not moving, make sure isPlayerMoving is false for correct animation
      set({ isPlayerMoving: false });
    }
  },
  
  // Set a new target for the NPC based on Fibonacci pattern
  setNewNpcTarget: () => {
    const { npcFibStep, npcFibDirection, npcPosition } = get();
    
    // Use Fibonacci number to determine distance but scale up for longer paths
    const fibNumber = getFibonacciNumber(npcFibStep);
    const normalizedFib = fibNumber / 10; // Scale down to reasonable values
    
    // Increase distance to encourage exploration of the entire platform
    // Use 85-100% of the platform radius for wider coverage
    const distance = PLATFORM_RADIUS * (0.85 + Math.random() * 0.15);
    
    // Add more randomness to the direction for unpredictable movement
    const randomOffset = (Math.random() - 0.5) * Math.PI / 2; // ±45 degrees randomness (increased)
    const direction = npcFibDirection + randomOffset;
    
    // Calculate new target position using the direction
    const newX = Math.cos(direction) * distance;
    const newZ = Math.sin(direction) * distance;
    
    // 15% chance to aim for a completely random point on the platform
    if (Math.random() < 0.15) {
      // Generate a random angle
      const randomAngle = Math.random() * Math.PI * 2; 
      // Random distance from 50-100% of platform radius
      const randomDistance = PLATFORM_RADIUS * (0.5 + Math.random() * 0.5);
      
      const randomX = Math.cos(randomAngle) * randomDistance;
      const randomZ = Math.sin(randomAngle) * randomDistance;
      
      // Ensure target is within platform bounds
      if (isWithinHexagon(randomX, randomZ, PLATFORM_RADIUS)) {
        set({ npcTarget: [randomX, 0, randomZ] });
        return;
      }
    }
    
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
    const { playerPosition, npcPosition, isColliding, collisionTime } = get();
    
    // Calculate distance between player and NPC
    const dx = npcPosition[0] - playerPosition[0];
    const dz = npcPosition[2] - playerPosition[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    console.log("Distance between player and NPC:", distance);
    
    // If collision detected and not already in collision state
    if (distance < COLLISION_DISTANCE && !isColliding) {
      console.log("Collision detected!");
      
      // Calculate the collision point (slightly above the ground for better visibility)
      const collisionX = (playerPosition[0] + npcPosition[0]) / 2;
      const collisionY = 0.3; // Raised up for better visibility
      const collisionZ = (playerPosition[2] + npcPosition[2]) / 2;
      
      // Calculate normalized direction vectors for knockback
      const playerNormDx = dx / distance;
      const playerNormDz = dz / distance;
      
      // Apply knockback to player position (away from NPC)
      const newPlayerX = playerPosition[0] - playerNormDx * KNOCKBACK_FORCE;
      const newPlayerZ = playerPosition[2] - playerNormDz * KNOCKBACK_FORCE;
      
      // Apply knockback to NPC position (away from player)
      const newNpcX = npcPosition[0] + playerNormDx * KNOCKBACK_FORCE;
      const newNpcZ = npcPosition[2] + playerNormDz * KNOCKBACK_FORCE;
      
      // Set a timeout to resume NPC movement after collision
      setTimeout(() => {
        set({ 
          isColliding: false,
          shouldNpcMove: true
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
    }
    
    // If no longer in collision range but still in collision state
    if (distance >= COLLISION_DISTANCE && isColliding && 
        Date.now() - collisionTime >= COLLISION_DURATION) {
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
  
  // Second NPC movement functions with more natural, random movement
  updateSecondNpcPosition: () => {
    const state = get();
    
    // Skip if collision
    if (state.isColliding) return;
    
    const now = Date.now();
    
    // Check if it's time to change behavior
    if (now > state.secondNpcWanderTimer) {
      // 30% chance to stop for a while
      if (Math.random() < 0.3) {
        // Pause for 2-5 seconds
        const pauseDuration = Math.random() * 3000 + 2000;
        console.log(`Second NPC pausing for ${pauseDuration}ms`);
        
        // Set timer and temporarily disable movement
        set({
          secondNpcWanderTimer: now + pauseDuration,
          shouldSecondNpcMove: false
        });
        
        // Set a timeout to resume movement
        setTimeout(() => {
          set({ shouldSecondNpcMove: true });
        }, pauseDuration);
        
        return;
      }
      
      // Random direction with preference for forward movement
      const angle = Math.random() * Math.PI * 2;
      const direction = new THREE.Vector3(
        Math.sin(angle),
        0,
        Math.cos(angle)
      ).normalize();
      
      // Random speed between 0.01 and 0.03
      const speed = 0.01 + Math.random() * 0.02;
      
      // New behavior change in 1-3 seconds
      const nextChange = Math.random() * 2000 + 1000;
      
      set({
        secondNpcMoveDirection: direction,
        secondNpcWanderTimer: now + nextChange,
        shouldSecondNpcMove: true
      });
    }
    
    // Only move if we're in a moving state
    if (state.shouldSecondNpcMove) {
      const { secondNpcPosition, secondNpcMoveDirection } = state;
      
      // Calculate new position
      const newPosition: [number, number, number] = [...secondNpcPosition];
      newPosition[0] += secondNpcMoveDirection.x * speed;
      newPosition[2] += secondNpcMoveDirection.z * speed;
      
      // Check if within bounds
      const distance = Math.sqrt(newPosition[0] * newPosition[0] + newPosition[2] * newPosition[2]);
      if (distance > 9.5) {
        // Bounce off edge with randomness
        const bounceDirection = new THREE.Vector3(
          -secondNpcMoveDirection.x + (Math.random() * 0.4 - 0.2),
          0,
          -secondNpcMoveDirection.z + (Math.random() * 0.4 - 0.2)
        ).normalize();
        
        // Set new direction and recalculate position
        set({ secondNpcMoveDirection: bounceDirection });
        
        newPosition[0] = secondNpcPosition[0] + bounceDirection.x * speed;
        newPosition[2] = secondNpcPosition[2] + bounceDirection.z * speed;
      }
      
      // Calculate rotation to face movement direction
      const targetRotation = Math.atan2(secondNpcMoveDirection.x, secondNpcMoveDirection.z);
      
      set({
        secondNpcPosition: newPosition,
        secondNpcRotation: [0, targetRotation, 0] as [number, number, number]
      });
    }
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