import { create } from 'zustand';
import * as THREE from 'three';

interface GameState {
  playerPosition: [number, number, number];
  moveDirection: THREE.Vector3;
  isStrafing: boolean;
  setMoveDirection: (direction: THREE.Vector3) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  updatePosition: (delta: number) => void;
}

// Hexagon platform parameters
const PLATFORM_RADIUS = 5.0; // Must match the radius in Room.tsx

export const useGameStore = create<GameState>((set, get) => ({
  playerPosition: [0, 0, 0],
  moveDirection: new THREE.Vector3(),
  isStrafing: false,
  setMoveDirection: (direction) => set({ moveDirection: direction }),
  
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
        newDirection.z = -1; // Forward (negative Z)
        break;
      case 'ArrowDown':
        newDirection.z = 1; // Backward (positive Z)
        break;
      case 'ArrowLeft':
        newDirection.x = -1; // Left (negative X)
        break;
      case 'ArrowRight':
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
        newDirection.z = 0;
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        newDirection.x = 0;
        break;
    }

    set({ moveDirection: newDirection });
  },
}));