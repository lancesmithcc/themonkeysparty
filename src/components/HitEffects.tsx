import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import BloodSpatter from './BloodSpatter';
import * as THREE from 'three';

export default function HitEffects() {
  const { 
    isPlayerHit,
    playerHitTime,
    isNpcHit,
    npcHitTime,
    isSecondNpcHit,
    secondNpcHitTime,
    playerPosition, 
    npcPosition, 
    secondNpcPosition,
    isPlayerPurple,
    isNpcPurple,
    isSecondNpcPurple
  } = useGameStore();
  
  // Debug logs
  useEffect(() => {
    if (isPlayerHit) console.log("Player hit detected, time:", playerHitTime);
    if (isNpcHit) console.log("NPC hit detected, time:", npcHitTime);
    if (isSecondNpcHit) console.log("Second NPC hit detected, time:", secondNpcHitTime);
  }, [isPlayerHit, isNpcHit, isSecondNpcHit, playerHitTime, npcHitTime, secondNpcHitTime]);
  
  // State to track current blood spatter effects
  const [effects, setEffects] = useState<{
    id: number;
    position: [number, number, number];
    time: number;
    scale: number;
    intensity: number;
    isPurple: boolean;
  }[]>([]);
  
  // Counter for unique IDs
  const [nextId, setNextId] = useState(1);
  
  // Handle player hit
  useEffect(() => {
    if (isPlayerHit) {
      const offsetPosition: [number, number, number] = [
        playerPosition[0], 
        playerPosition[1] + 1.5, // Raise to character body height
        playerPosition[2]
      ];
      
      setEffects(prev => [
        ...prev,
        {
          id: nextId,
          position: offsetPosition,
          time: playerHitTime / 1000, // Convert ms to seconds
          scale: 1.2,
          intensity: 1.5, // Increased intensity
          isPurple: isPlayerPurple // Track if this is a purple hit
        }
      ]);
      
      setNextId(nextId + 1);
    }
  }, [isPlayerHit, playerHitTime, playerPosition, nextId, isPlayerPurple]);
  
  // Handle first NPC hit
  useEffect(() => {
    if (isNpcHit) {
      const offsetPosition: [number, number, number] = [
        npcPosition[0], 
        npcPosition[1] + 1.5, // Raise to character body height
        npcPosition[2]
      ];
      
      setEffects(prev => [
        ...prev,
        {
          id: nextId,
          position: offsetPosition,
          time: npcHitTime / 1000, // Convert ms to seconds
          scale: 1.2, // Increased scale
          intensity: 1.5, // Increased intensity
          isPurple: isNpcPurple // Track if this is a purple hit
        }
      ]);
      
      setNextId(nextId + 1);
    }
  }, [isNpcHit, npcHitTime, npcPosition, nextId, isNpcPurple]);
  
  // Handle second NPC hit
  useEffect(() => {
    if (isSecondNpcHit) {
      const offsetPosition: [number, number, number] = [
        secondNpcPosition[0], 
        secondNpcPosition[1] + 1.5, // Raise to character body height
        secondNpcPosition[2]
      ];
      
      setEffects(prev => [
        ...prev,
        {
          id: nextId,
          position: offsetPosition,
          time: secondNpcHitTime / 1000, // Convert ms to seconds
          scale: 1.2, // Increased scale
          intensity: 1.5, // Increased intensity
          isPurple: isSecondNpcPurple // Track if this is a purple hit
        }
      ]);
      
      setNextId(nextId + 1);
    }
  }, [isSecondNpcHit, secondNpcHitTime, secondNpcPosition, nextId, isSecondNpcPurple]);
  
  // Clean up old effects
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now() / 1000;
      setEffects(prev => prev.filter(effect => now - effect.time < 2)); // Remove effects older than 2 seconds
    }, 1000);
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  return (
    <>
      {effects.map(effect => (
        <BloodSpatter
          key={effect.id}
          position={effect.position}
          startTime={effect.time}
          scale={effect.scale}
          intensity={effect.intensity}
          isPurple={effect.isPurple}
        />
      ))}
    </>
  );
} 