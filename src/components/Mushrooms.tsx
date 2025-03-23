import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import Mushroom from './Mushroom';

// Mushrooms component to manage all mushrooms in the scene
export default function Mushrooms() {
  const { 
    mushrooms, 
    updateMushrooms, 
    collectMushroom,
    playerPosition,
    npcPosition,
    secondNpcPosition
  } = useGameStore();
  
  // Initialize mushrooms on first render
  useEffect(() => {
    // Ensure we start with a full set of mushrooms
    const state = useGameStore.getState();
    const currentMushrooms = state.mushrooms;
    
    console.log("Mushrooms component mounted, current mushrooms:", currentMushrooms.length);
    
    // Only spawn initial mushrooms if we don't already have any
    // This prevents respawning on component remounts
    if (currentMushrooms.length === 0) {
      console.log("Spawning initial mushrooms");
      const MIN_INITIAL_MUSHROOMS = 5;
      
      // Force set the timer to allow immediate spawning
      state.lastMushroomSpawnTime = 0;
      
      // Create a staggered spawn of initial mushrooms
      const spawnInitialMushrooms = (remaining: number) => {
        if (remaining <= 0) return;
        
        state.spawnMushroom();
        console.log("Spawned mushroom, remaining:", remaining - 1);
        
        // Stagger spawning for better visual effect and to avoid placement conflicts
        setTimeout(() => {
          spawnInitialMushrooms(remaining - 1);
        }, 100);
      };
      
      spawnInitialMushrooms(MIN_INITIAL_MUSHROOMS);
    }
  }, []);
  
  // Update mushrooms and check for collection
  useFrame((state, delta) => {
    // Update mushroom animations and spawn new ones if needed
    updateMushrooms(delta);
    
    // Check for collisions with player and NPCs
    mushrooms.forEach(mushroom => {
      if (mushroom.collected) return;
      
      // Collection distance - use constant from game store
      const COLLECT_DISTANCE = 0.5;
      
      // Check player collision
      const playerDistance = Math.sqrt(
        Math.pow(playerPosition[0] - mushroom.position[0], 2) +
        Math.pow(playerPosition[2] - mushroom.position[2], 2)
      );
      
      if (playerDistance < COLLECT_DISTANCE) {
        collectMushroom(mushroom.id, 'player');
        return;
      }
      
      // Check first NPC collision
      const npcDistance = Math.sqrt(
        Math.pow(npcPosition[0] - mushroom.position[0], 2) +
        Math.pow(npcPosition[2] - mushroom.position[2], 2)
      );
      
      if (npcDistance < COLLECT_DISTANCE) {
        collectMushroom(mushroom.id, 'npc');
        return;
      }
      
      // Check second NPC collision
      const secondNpcDistance = Math.sqrt(
        Math.pow(secondNpcPosition[0] - mushroom.position[0], 2) +
        Math.pow(secondNpcPosition[2] - mushroom.position[2], 2)
      );
      
      if (secondNpcDistance < COLLECT_DISTANCE) {
        collectMushroom(mushroom.id, 'secondNpc');
        return;
      }
    });
  });
  
  return (
    <>
      {mushrooms.map(mushroom => (
        <Mushroom
          key={mushroom.id}
          position={mushroom.position}
          scale={mushroom.scale}
          collected={mushroom.collected}
          animationProgress={mushroom.animationProgress}
        />
      ))}
    </>
  );
} 