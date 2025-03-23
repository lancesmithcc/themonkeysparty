import { create } from 'zustand';
import * as THREE from 'three';

// Constants for platform bounds checking
const PLATFORM_RADIUS = 4;
const MOVEMENT_SPEED = 0.1;
const COLLISION_DISTANCE = 0.8;
const COLLISION_DURATION = 1500; // ms
const COLLISION_KNOCKBACK = 0.5;

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

// Define the game state interface
export interface GameState {
  // Player state
  playerPosition: [number, number, number];
  moveDirection: THREE.Vector3;
  isPlayerMoving: boolean;
  
  // NPC state
  npcPosition: [number, number, number];
  npcMoveDirection: THREE.Vector3;
  npcTarget: [number, number, number];
  npcWanderTimer: number;
  
  // Collision state
  isColliding: boolean;
  collisionTime: number;
  collisionPosition: [number, number, number] | null;
  
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
  playerPosition: [0, 0, 0],
  moveDirection: new THREE.Vector3(0, 0, 0),
  isPlayerMoving: false,
  
  // NPC state
  npcPosition: [2, 0, 2],
  npcMoveDirection: new THREE.Vector3(0, 0, 0),
  npcTarget: [2, 0, 2],
  npcWanderTimer: 0,
  
  // Collision state
  isColliding: false,
  collisionTime: 0,
  collisionPosition: null,
  
  // Mobile state
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  
  // Set the movement direction based on key input
  handleKeyDown: (e) => {
    const { moveDirection } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
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
    const { moveDirection } = get();
    const newDirection = new THREE.Vector3(moveDirection.x, moveDirection.y, moveDirection.z);
    
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
  
  // Update the player's position based on the movement direction
  updatePosition: () => {
    const { playerPosition, moveDirection, isColliding } = get();
    
    // No movement during collision animation
    if (isColliding) return;
    
    // Normalize for diagonal movement
    const normalizedDirection = moveDirection.clone().normalize();
    
    // Calculate new position
    const newX = playerPosition[0] + normalizedDirection.x * MOVEMENT_SPEED;
    const newZ = playerPosition[2] + normalizedDirection.z * MOVEMENT_SPEED;
    
    // Check if the new position is within bounds
    if (isWithinHexagon(newX, newZ, PLATFORM_RADIUS)) {
      set({ playerPosition: [newX, playerPosition[1], newZ] });
    }
    
    // Check for collision with NPC
    get().checkCollision();
  },
  
  // Update NPC position
  updateNpcPosition: () => {
    const { npcPosition, npcTarget, npcWanderTimer, npcMoveDirection, isColliding } = get();
    
    // No movement during collision animation
    if (isColliding) return;
    
    // Update wander timer and set new target if needed
    const newTimer = npcWanderTimer - 1;
    if (newTimer <= 0) {
      get().setNewNpcTarget();
      set({ npcWanderTimer: Math.random() * 100 + 100 }); // 100-200 frames
      return;
    }
    
    // Calculate direction to target
    const targetVector = new THREE.Vector3(
      npcTarget[0] - npcPosition[0],
      0,
      npcTarget[2] - npcPosition[2]
    );
    
    // If close to target, slow down
    const distanceToTarget = targetVector.length();
    if (distanceToTarget < 0.2) {
      set({ 
        npcMoveDirection: new THREE.Vector3(0, 0, 0),
        npcWanderTimer: Math.random() * 50 + 50 // Shorter pause at destination
      });
      return;
    }
    
    // Update direction
    targetVector.normalize();
    set({ npcMoveDirection: targetVector });
    
    // Move towards target
    const speed = MOVEMENT_SPEED * 0.7; // NPC moves slightly slower
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
  
  // Set a new random target for the NPC
  setNewNpcTarget: () => {
    // Random angle and distance within the platform
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * PLATFORM_RADIUS * 0.8;
    
    // Calculate new target position
    const newX = Math.cos(angle) * distance;
    const newZ = Math.sin(angle) * distance;
    
    set({ npcTarget: [newX, 0, newZ] });
  },
  
  // Check for collision between player and NPC
  checkCollision: () => {
    const { playerPosition, npcPosition, isColliding } = get();
    
    // Skip if already in collision
    if (isColliding) return;
    
    // Calculate distance between player and NPC
    const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
    const npcPos = new THREE.Vector3(npcPosition[0], npcPosition[1], npcPosition[2]);
    const distance = playerPos.distanceTo(npcPos);
    
    // Check if collision occurs
    if (distance < COLLISION_DISTANCE) {
      // Calculate collision point (midpoint between characters)
      const collisionPoint: [number, number, number] = [
        (playerPosition[0] + npcPosition[0]) / 2,
        (playerPosition[1] + npcPosition[1]) / 2,
        (playerPosition[2] + npcPosition[2]) / 2
      ];
      
      // Calculate knockback directions
      const knockbackDirPlayer = new THREE.Vector3()
        .subVectors(playerPos, npcPos)
        .normalize()
        .multiplyScalar(COLLISION_KNOCKBACK);
      
      const knockbackDirNpc = new THREE.Vector3()
        .subVectors(npcPos, playerPos)
        .normalize()
        .multiplyScalar(COLLISION_KNOCKBACK);
      
      // Apply knockback
      const newPlayerPos: [number, number, number] = [
        playerPosition[0] + knockbackDirPlayer.x,
        playerPosition[1],
        playerPosition[2] + knockbackDirPlayer.z
      ];
      
      const newNpcPos: [number, number, number] = [
        npcPosition[0] + knockbackDirNpc.x,
        npcPosition[1],
        npcPosition[2] + knockbackDirNpc.z
      ];
      
      // Update state with collision info
      set({
        isColliding: true,
        collisionTime: Date.now(),
        collisionPosition: collisionPoint,
        playerPosition: newPlayerPos,
        npcPosition: newNpcPos
      });
      
      // Reset collision state after animation duration
      setTimeout(() => {
        set({ isColliding: false });
      }, COLLISION_DURATION);
    }
  }
}));