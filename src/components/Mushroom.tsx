import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

// Interface for mushroom props
interface MushroomProps {
  position: [number, number, number];
  scale: number;
  collected: boolean;
  animationProgress?: number;
}

// Mushroom component
export default function Mushroom({ position, scale, collected, animationProgress = 0 }: MushroomProps) {
  const mushRef = useRef<THREE.Group>(null);
  const [localAnimProgress, setLocalAnimProgress] = useState(0);
  
  // Load the mushroom model
  const { scene } = useGLTF('/models/mushroom.glb');
  
  // Clone the scene to avoid conflicts with other mushrooms
  const mushroomScene = scene.clone();
  
  // Setup materials for glow effect
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xff9966),
    emissive: new THREE.Color(0xff6600),
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.7,
  });
  
  // Apply custom materials to the mushroom
  mushroomScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Apply the material to the cap of the mushroom
      if (child.name.toLowerCase().includes('cap')) {
        child.material = glowMaterial;
      }
      
      // Make all meshes cast and receive shadows
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  // Handle collection animation locally if store isn't updating it
  useEffect(() => {
    if (collected && animationProgress === 0) {
      const animationInterval = setInterval(() => {
        setLocalAnimProgress(prev => {
          const newValue = Math.min(prev + 0.05, 1);
          if (newValue >= 1) clearInterval(animationInterval);
          return newValue;
        });
      }, 50);
      
      return () => clearInterval(animationInterval);
    }
  }, [collected, animationProgress]);
  
  // Use either the prop animation progress or our local one
  const effectiveProgress = animationProgress > 0 ? animationProgress : localAnimProgress;
  
  // Animation
  useFrame((state) => {
    if (!mushRef.current) return;
    
    // Mushroom bobbing and rotation animation
    const time = state.clock.getElapsedTime();
    
    // Subtle floating animation
    mushRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.05;
    
    // Gentle rotation
    mushRef.current.rotation.y = time * 0.2;
    
    // Pulse the glow when not collected
    if (!collected) {
      const pulse = Math.sin(time * 2) * 0.2 + 0.8;
      
      mushroomScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child.name.toLowerCase().includes('cap')) {
            child.material.emissiveIntensity = 0.3 + pulse * 0.2;
          }
        }
      });
    }
    // Collection animation
    else {
      // Modify glow based on collection progress - fade to green, then disappear
      mushroomScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child.name.toLowerCase().includes('cap')) {
            // Transition from orange to green as it's collected
            const r = 1 - effectiveProgress;
            const g = 0.6 + effectiveProgress * 0.4;
            child.material.emissive.setRGB(r, g, 0);
            child.material.emissiveIntensity = 0.8 - effectiveProgress * 0.8;
          }
          // Fade out opacity
          if (child.material.opacity !== undefined) {
            child.material.transparent = true;
            child.material.opacity = 1 - effectiveProgress;
          }
        }
      });
    }
  });
  
  // If the mushroom is collected, scale it down to create a shrink effect
  const shrinkFactor = collected ? 1 - effectiveProgress * 0.9 : 1.0;
  const currentScale = scale * shrinkFactor;
  
  // Don't render if fully collected
  if (collected && effectiveProgress >= 1) return null;
  
  return (
    <group
      ref={mushRef}
      position={[position[0], position[1], position[2]]}
      scale={[currentScale, currentScale, currentScale]}
    >
      <primitive object={mushroomScene} />
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/mushroom.glb'); 