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
      npcFibDirection
    } = get();
    
    // No movement during collision animation
    if (isColliding) return;
    
    // Update wander timer and set new target if needed
    const newTimer = npcWanderTimer - 1;
    if (newTimer <= 0) {
      // Use Fibonacci pattern for movement
      const nextFibStep = (npcFibStep % 10) + 1; // Cycle through first 10 Fibonacci numbers
      const fibValue = getFibonacciNumber(nextFibStep);
      
      // Increment direction more frequently for more active movement
      const nextDirection = (npcFibDirection + Math.PI / 3) % (2 * Math.PI);
      
      set({ 
        npcFibStep: nextFibStep,
        npcFibDirection: nextDirection,
        npcWanderTimer: fibValue * 15 + 10 // Scale Fibonacci number for shorter timer (more movement)
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
    if (distanceToTarget < 0.1) { // Reduced threshold to change targets more often
      set({ 
        npcMoveDirection: new THREE.Vector3(0, 0, 0),
        // Shorter pause at destination
        npcWanderTimer: 10 + Math.random() * 20
      });
      // 20% chance to immediately pick a new target
      if (Math.random() < 0.2) {
        get().setNewNpcTarget();
      }
      return;
    }
    
    // Update direction
    targetVector.normalize();
    set({ npcMoveDirection: targetVector });
    
    // Move towards target with faster speed
    const speed = MOVEMENT_SPEED * (1.2 + Math.sin(Date.now() * 0.001) * 0.3); // Faster base movement
    
    const newX = npcPosition[0] + targetVector.x * speed;
    const newZ = npcPosition[2] + targetVector.z * speed;
    
    // Check if new position is within bounds
    if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
      set({ npcPosition: [newX, npcPosition[1], newZ] });
    } else {
      // If outside bounds, get a new target
      get().setNewNpcTarget();
    }
    
    // Check for collision with player
    get().checkCollision();
  },
  
  // Set a new target for the NPC based on Fibonacci pattern
  setNewNpcTarget: () => {
    const { npcFibStep, npcFibDirection, npcPosition } = get();
    
    // Use Fibonacci number to determine distance but scale up for longer paths
    const fibNumber = getFibonacciNumber(npcFibStep);
    const normalizedFib = fibNumber / 10; // Scale down to reasonable values
    const distance = PLATFORM_RADIUS * 0.6 * Math.min(normalizedFib + 0.3, 0.9); // More distance, cap at 90% of radius
    
    // Add some randomness to the direction for less predictable patterns
    const randomOffset = (Math.random() - 0.5) * Math.PI / 4; // ±22.5 degrees randomness
    const direction = npcFibDirection + randomOffset;
    
    // Calculate new target position using the direction
    const newX = Math.cos(direction) * distance;
    const newZ = Math.sin(direction) * distance;
    
    // Ensure target is within platform bounds
    if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
      set({ npcTarget: [newX, 0, newZ] });
    } else {
      // If outside bounds, pick a point toward center
      const angle = Math.atan2(npcPosition[2], npcPosition[0]) + Math.PI; // Opposite direction
      const safeDistance = PLATFORM_RADIUS * 0.5;
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
  }
}));