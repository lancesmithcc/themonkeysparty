import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EyeballProps {
  position: [number, number, number];
  scale: number;
  collected: boolean;
}

export default function Eyeball({ position, scale, collected }: EyeballProps) {
  const eyeballRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Create materials for the eyeball
  const eyeballMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6a0dad'), // Deep purple
    emissive: new THREE.Color('#9932cc'), // Bright purple
    emissiveIntensity: 1.2,
    metalness: 0.7,
    roughness: 0.2,
  });
  
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#000000'), // Black
    emissive: new THREE.Color('#000000'),
    metalness: 0.5,
    roughness: 0.1,
  });
  
  const irisMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff1493'), // Deep pink
    emissive: new THREE.Color('#ff00ff'), // Magenta
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1,
  });
  
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8a2be2'), // Violet
    emissive: new THREE.Color('#ff00ff'), // Magenta
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.7,
  });
  
  // Animation for the eyeball
  useFrame((state) => {
    if (!eyeballRef.current || !flameRef.current || !lightRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Floating animation for the eyeball
    eyeballRef.current.position.y = position[1] + Math.sin(time * 1) * 0.1;
    
    // Slow rotation for the eyeball
    eyeballRef.current.rotation.y = time * 0.3;
    
    // Pulsating scale for the eyeball
    const pulseScale = 1 + Math.sin(time * 2) * 0.1;
    eyeballRef.current.scale.set(
      scale * pulseScale, 
      scale * pulseScale, 
      scale * pulseScale
    );
    
    // Animate the flames
    if (flameRef.current) {
      // Rotate flames in opposite direction
      flameRef.current.rotation.y = -time * 0.5;
      
      // Randomly update flame intensity
      if (flameMaterial.emissiveIntensity) {
        flameMaterial.emissiveIntensity = 1.2 + Math.sin(time * 3) * 0.3;
      }
      
      // Scale flames with a different rhythm
      const flameScale = 1 + Math.sin(time * 3.5) * 0.15;
      flameRef.current.scale.set(flameScale, flameScale, flameScale);
    }
    
    // Animate the light intensity and color
    if (lightRef.current) {
      // Pulsating intensity
      lightRef.current.intensity = 2 + Math.sin(time * 2.5) * 0.8;
      
      // Shifting purple-magenta color
      const hue = (time * 0.1) % 1;
      const color = new THREE.Color().setHSL(0.75 + hue * 0.1, 0.8, 0.6);
      lightRef.current.color = color;
      
      // If collected, fade the light
      if (collected) {
        lightRef.current.intensity *= (1 - Math.min(1, eyeballRef.current.userData.collectionProgress || 0));
      }
    }
  });
  
  // If collected, shrink and fade out
  const currentScale = collected ? scale * (1 - Math.min(1, eyeballRef.current?.userData.collectionProgress || 0)) : scale;
  const opacity = collected ? 1 - Math.min(0.9, eyeballRef.current?.userData.collectionProgress || 0) : 1;
  
  // Update material opacity when collected
  if (collected) {
    eyeballMaterial.transparent = true;
    eyeballMaterial.opacity = opacity;
    irisMaterial.transparent = true;
    irisMaterial.opacity = opacity;
    pupilMaterial.transparent = true;
    pupilMaterial.opacity = opacity;
    flameMaterial.opacity = opacity * 0.7;
  }
  
  return (
    <group 
      ref={eyeballRef} 
      position={[position[0], position[1] + 0.5, position[2]]} 
      scale={[currentScale, currentScale, currentScale]}
    >
      {/* Purple point light for glow effect */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color="#9932cc"
        intensity={2}
        distance={3}
        decay={2}
        castShadow={false}
      />
      
      {/* Main eyeball sphere */}
      <mesh castShadow receiveShadow material={eyeballMaterial}>
        <sphereGeometry args={[0.3, 32, 32]} />
      </mesh>
      
      {/* Iris */}
      <mesh position={[0, 0, 0.2]} material={irisMaterial}>
        <sphereGeometry args={[0.15, 32, 32]} />
      </mesh>
      
      {/* Pupil */}
      <mesh position={[0, 0, 0.25]} material={pupilMaterial}>
        <sphereGeometry args={[0.07, 32, 32]} />
      </mesh>
      
      {/* Fiery flames around the eyeball */}
      <group ref={flameRef}>
        {/* Create 8 flame wisps around the eyeball */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 0.4;
          const z = Math.sin(angle) * 0.4;
          
          return (
            <mesh 
              key={i} 
              position={[x, 0, z]} 
              rotation={[0, -angle, 0]} 
              material={flameMaterial}
            >
              <coneGeometry args={[0.1, 0.3, 8]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
} 