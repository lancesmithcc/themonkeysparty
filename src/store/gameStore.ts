import { create } from 'zustand';
import * as THREE from 'three';

interface GameState {
  playerPosition: [number, number, number];
  npcPosition: [number, number, number];
  moveDirection: THREE.Vector3;
  npcMoveDirection: THREE.Vector3;
  isStrafing: boolean;
  isMobile: boolean;
  npcTargetPosition: [number, number, number];
  npcWanderTimer: number;
  setMoveDirection: (direction: THREE.Vector3) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  updatePosition: (delta: number) => void;
  updateNpcPosition: (delta: number) => void;
  setIsMobile: (isMobile: boolean) => void;
}

// Hexagon platform parameters
const PLATFORM_RADIUS = 5.0; // Must match the radius in Room.tsx

// NPC movement parameters
const NPC_SPEED = 0.5; // Slower than player
const NPC_WANDER_INTERVAL_MIN = 3; // Minimum seconds before changing direction
const NPC_WANDER_INTERVAL_MAX = 8; // Maximum seconds before changing direction
const NPC_PROXIMITY_RADIUS = 1.5; // How close NPC gets to target before finding new target
const NPC_ROTATION_SPEED = 0.07; // How quickly the NPC rotates to new directions

export const useGameStore = create<GameState>((set, get) => ({
  playerPosition: [0, 0, 0],
  npcPosition: [2, 0, 2], // Start NPC at a different position
  moveDirection: new THREE.Vector3(),
  npcMoveDirection: new THREE.Vector3(),
  isStrafing: false,
  isMobile: false,
  npcTargetPosition: [2, 0, 2], // Initial target is the same as position
  npcWanderTimer: 0,
  setMoveDirection: (direction) => set({ moveDirection: direction }),
  
  // Set mobile state
  setIsMobile: (isMobile) => set({ isMobile }),
  
  // Function to update position with platform boundary checking
  updatePosition: (delta: number) => {
    const { playerPosition, moveDirection } = get();
    
    if (moveDirection.length() === 0) return;
    
    // Calculate new position
    const speed = 1; // Movement speed
    const newX = playerPosition[0] + moveDirection.x * speed * delta;
    const newZ = playerPosition[2] + moveDirection.z * speed * delta;
    
    // Check if the new position is within the hexagon boundary
    // Using a simple circular approximation for the hexagon
    const distanceFromCenter = Math.sqrt(newX * newX + newZ * newZ);
    
    // Add a small margin to prevent getting too close to the edge
    const safeRadius = PLATFORM_RADIUS - 0.3;
    
    if (distanceFromCenter <= safeRadius) {
      // Only update if within bounds
      set({ playerPosition: [newX, playerPosition[1], newZ] });
    } else {
      // Optional: Slide along the boundary
      // This is a simple approach - calculate the unit vector toward the center
      // and adjust the position to stay at the boundary
      const angle = Math.atan2(newZ, newX);
      const boundaryX = safeRadius * Math.cos(angle);
      const boundaryZ = safeRadius * Math.sin(angle);
      set({ playerPosition: [boundaryX, playerPosition[1], boundaryZ] });
    }
  },
  
  // Function to update NPC position with AI movement
  updateNpcPosition: (delta: number) => {
    const { npcPosition, npcTargetPosition, npcMoveDirection, npcWanderTimer, playerPosition } = get();
    
    // Decrement wander timer
    const newWanderTimer = npcWanderTimer - delta;
    
    // Check if we need a new target position
    let newTargetPosition = [...npcTargetPosition] as [number, number, number];
    let newMoveDirection = npcMoveDirection.clone();
    
    if (newWanderTimer <= 0 || 
        (Math.abs(npcPosition[0] - npcTargetPosition[0]) < NPC_PROXIMITY_RADIUS && 
         Math.abs(npcPosition[2] - npcTargetPosition[2]) < NPC_PROXIMITY_RADIUS)) {
      
      // Generate new random target position within platform boundary
      const randomAngle = Math.random() * Math.PI * 2;
      const randomRadius = Math.random() * (PLATFORM_RADIUS - 1.0); // Stay away from the edge
      
      newTargetPosition = [
        randomRadius * Math.cos(randomAngle),
        0,
        randomRadius * Math.sin(randomAngle)
      ];
      
      // Set new timer
      const newTimer = NPC_WANDER_INTERVAL_MIN + 
                       Math.random() * (NPC_WANDER_INTERVAL_MAX - NPC_WANDER_INTERVAL_MIN);
      
      // Calculate direction to new target
      const directionX = newTargetPosition[0] - npcPosition[0];
      const directionZ = newTargetPosition[2] - npcPosition[2];
      
      // Normalize direction
      const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
      if (length > 0) {
        newMoveDirection.set(directionX / length, 0, directionZ / length);
      }
      
      set({ 
        npcTargetPosition: newTargetPosition,
        npcWanderTimer: newTimer,
        npcMoveDirection: newMoveDirection
      });
    } else {
      // Gradually adjust direction toward target for smooth turning
      const targetDirX = npcTargetPosition[0] - npcPosition[0];
      const targetDirZ = npcTargetPosition[2] - npcPosition[2];
      
      // Normalize target direction
      const targetLength = Math.sqrt(targetDirX * targetDirX + targetDirZ * targetDirZ);
      
      if (targetLength > 0) {
        const normalizedTargetX = targetDirX / targetLength;
        const normalizedTargetZ = targetDirZ / targetLength;
        
        // Smoothly adjust direction
        newMoveDirection.x = THREE.MathUtils.lerp(
          npcMoveDirection.x, 
          normalizedTargetX, 
          NPC_ROTATION_SPEED
        );
        
        newMoveDirection.z = THREE.MathUtils.lerp(
          npcMoveDirection.z, 
          normalizedTargetZ, 
          NPC_ROTATION_SPEED
        );
        
        // Renormalize
        const newLength = Math.sqrt(newMoveDirection.x * newMoveDirection.x + newMoveDirection.z * newMoveDirection.z);
        if (newLength > 0) {
          newMoveDirection.x /= newLength;
          newMoveDirection.z /= newLength;
        }
        
        set({ npcMoveDirection: newMoveDirection, npcWanderTimer: newWanderTimer });
      }
    }
    
    // Move toward target
    const newX = npcPosition[0] + newMoveDirection.x * NPC_SPEED * delta;
    const newZ = npcPosition[2] + newMoveDirection.z * NPC_SPEED * delta;
    
    // Check if the new position is within the hexagon boundary
    const distanceFromCenter = Math.sqrt(newX * newX + newZ * newZ);
    
    // Add a small margin to prevent getting too close to the edge
    const safeRadius = PLATFORM_RADIUS - 0.3;
    
    if (distanceFromCenter <= safeRadius) {
      // Only update if within bounds
      set({ npcPosition: [newX, npcPosition[1], newZ] });
    } else {
      // Slide along the boundary and pick a new target toward the center
      const angle = Math.atan2(newZ, newX);
      const boundaryX = safeRadius * Math.cos(angle);
      const boundaryZ = safeRadius * Math.sin(angle);
      
      // Set new target position toward center
      set({ 
        npcPosition: [boundaryX, npcPosition[1], boundaryZ],
        npcTargetPosition: [0, 0, 0], // Center of platform
        npcWanderTimer: 0 // Force new target calculation next frame
      });
    }
  },
  
  handleKeyDown: (event: KeyboardEvent) => {
    const { moveDirection } = get();
    const newDirection = moveDirection.clone();

    // Update strafing state
    if (event.key === 'Shift') {
      set({ isStrafing: true });
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        newDirection.z = -1; // Forward (negative Z)
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        newDirection.z = 1; // Backward (positive Z)
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        newDirection.x = -1; // Left (negative X)
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        newDirection.x = 1; // Right (positive X)
        break;
    }

    set({ moveDirection: newDirection });
  },

  handleKeyUp: (event: KeyboardEvent) => {
    const { moveDirection } = get();
    const newDirection = moveDirection.clone();

    // Update strafing state
    if (event.key === 'Shift') {
      set({ isStrafing: false });
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'w':
      case 'W':
      case 's':
      case 'S':
        newDirection.z = 0;
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'a':
      case 'A':
      case 'd':
      case 'D':
        newDirection.x = 0;
        break;
    }

    set({ moveDirection: newDirection });
  },
}));