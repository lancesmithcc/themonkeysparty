import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import Eyeball from './Eyeball';

// Component to manage the eyeballs in the scene
export default function Eyeballs() {
  const { 
    eyeballs, 
    updateEyeballs, 
    collectEyeball,
    playerPosition,
    npcPosition,
    secondNpcPosition
  } = useGameStore();
  
  // Initialize eyeballs on first render
  useEffect(() => {
    // Ensure we have eyeballs at game start
    const state = useGameStore.getState();
    const currentEyeballs = state.eyeballs;
    
    console.log("Eyeballs component mounted, current eyeballs:", currentEyeballs.length);
    
    // Only spawn initial eyeballs if we don't already have any
    // This prevents respawning on component remounts
    if (currentEyeballs.length === 0) {
      console.log("Spawning initial eyeballs");
      const MIN_INITIAL_EYEBALLS = 1;
      
      // Force set mushroomsCollectedSinceLastEyeball to a high value to allow spawning
      state.mushroomsCollectedSinceLastEyeball = 50;
      
      // Create a staggered spawn of initial eyeballs
      const spawnInitialEyeballs = (remaining: number) => {
        if (remaining <= 0) return;
        
        state.trySpawnEyeball();
        console.log("Attempted to spawn eyeball, remaining:", remaining - 1);
        
        // Stagger spawning for better visual effect
        setTimeout(() => {
          spawnInitialEyeballs(remaining - 1);
        }, 200);
      };
      
      spawnInitialEyeballs(MIN_INITIAL_EYEBALLS);
    }
  }, []);
  
  // Update eyeballs and check for collection in each frame
  useFrame((state, delta) => {
    // Update eyeball animations and possibly spawn new ones
    updateEyeballs(delta);
    
    // Check for eyeball collection by any character
    eyeballs.forEach(eyeball => {
      if (eyeball.collected) return;
      
      // Collection distance - larger for the rare eyeball
      const COLLECT_DISTANCE = 0.7;
      
      // Check player collision
      const playerDistance = Math.sqrt(
        Math.pow(playerPosition[0] - eyeball.position[0], 2) +
        Math.pow(playerPosition[2] - eyeball.position[2], 2)
      );
      
      if (playerDistance < COLLECT_DISTANCE) {
        console.log("Player collected a rare eyeball!");
        collectEyeball(eyeball.id, 'player');
        return;
      }
      
      // Check first NPC collision
      const npcDistance = Math.sqrt(
        Math.pow(npcPosition[0] - eyeball.position[0], 2) +
        Math.pow(npcPosition[2] - eyeball.position[2], 2)
      );
      
      if (npcDistance < COLLECT_DISTANCE) {
        console.log("Anuki collected a rare eyeball!");
        collectEyeball(eyeball.id, 'npc');
        return;
      }
      
      // Check second NPC collision
      const secondNpcDistance = Math.sqrt(
        Math.pow(secondNpcPosition[0] - eyeball.position[0], 2) +
        Math.pow(secondNpcPosition[2] - eyeball.position[2], 2)
      );
      
      if (secondNpcDistance < COLLECT_DISTANCE) {
        console.log("Eldara collected a rare eyeball!");
        collectEyeball(eyeball.id, 'secondNpc');
        return;
      }
    });
  });
  
  return (
    <>
      {eyeballs.map(eyeball => (
        <Eyeball
          key={eyeball.id}
          position={eyeball.position}
          scale={eyeball.scale}
          collected={eyeball.collected}
        />
      ))}
    </>
  );
} 