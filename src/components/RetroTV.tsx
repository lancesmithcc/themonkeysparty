import * as THREE from 'three';
import { useGLTF, useTexture } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function RetroTV() {
  const { scene } = useGLTF('/models/TV.glb');
  const monkeboiTexture = useTexture('/models/monkeboi.png');
  const tvRef = useRef(null);
  const floatingMonkeyRef = useRef<THREE.Mesh>(null);
  
  // Scale the TV to be twice as big
  useEffect(() => {
    scene.scale.set(2, 2, 2);
  }, [scene]);
  
  // Apply the texture to any potential screen surface
  useEffect(() => {
    console.log('TV model structure:');
    
    // Create screen material
    const screenMaterial = new THREE.MeshStandardMaterial({
      map: monkeboiTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: monkeboiTexture,
      emissiveIntensity: 1.0, // Increased brightness
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Find all meshes in the TV model
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Log all mesh names and their current material for debugging
        console.log('Mesh found:', object.name);
        if (object.material) {
          // Log material color to help identify the greenscreen
          const material = object.material as THREE.MeshStandardMaterial;
          if (material.color) {
            console.log('  Material color:', material.color.getHexString());
          }
        }
        
        // First priority: try to find greenscreen by material color
        const material = object.material as THREE.MeshStandardMaterial;
        if (material && material.color) {
          const hexColor = material.color.getHexString().toLowerCase();
          // Check for green-ish colors
          if (hexColor.includes('00ff') || hexColor.includes('00ee') || 
              hexColor.includes('33ff') || hexColor.includes('00cc')) {
            console.log('Found potential greenscreen by color:', object.name);
            object.material = screenMaterial;
            return; // Exit early if we found a greenscreen
          }
        }
        
        // Second priority: look for screen-related names
        if (
          object.name.toLowerCase().includes('screen') || 
          object.name.toLowerCase().includes('display') ||
          object.name.toLowerCase().includes('monitor') ||
          object.name.toLowerCase().includes('green')
        ) {
          console.log('Applying texture to:', object.name);
          object.material = screenMaterial;
          return; // Exit if we found a named screen
        }
      }
    });
    
    // Last resort: apply to the first flat mesh we find
    let screenApplied = false;
    scene.traverse((object) => {
      if (!screenApplied && object instanceof THREE.Mesh) {
        // Simple check for relatively flat mesh that might be a screen
        const geometry = object.geometry;
        
        // Compute bounding box manually
        geometry.computeBoundingBox();
        
        if (geometry.boundingBox) {
          const size = new THREE.Vector3();
          geometry.boundingBox.getSize(size);
          
          // If one dimension is much smaller than the others, it might be a screen
          if (size.z < 0.2 * Math.max(size.x, size.y) && size.x > 0.5 && size.y > 0.5) {
            console.log('Using mesh as fallback screen:', object.name);
            object.material = screenMaterial;
            screenApplied = true;
          }
        }
      }
    });
  }, [scene, monkeboiTexture]);

  // Animate the floating monkey
  useFrame((state) => {
    if (floatingMonkeyRef.current) {
      const time = state.clock.getElapsedTime();
      // Add subtle hovering motion - properly centered on TV screen
      floatingMonkeyRef.current.position.y = Math.sin(time * 1.5) * 0.1 + 0.3;
      // Add subtle swaying motion
      floatingMonkeyRef.current.rotation.z = Math.sin(time) * 0.05;
    }
  });

  return (
    <group position={[0, 1.5, -4.5]} ref={tvRef}>
      <primitive object={scene} />
      
      {/* Floating monkey in front of the TV */}
      <mesh 
        ref={floatingMonkeyRef}
        position={[0, 0.3, 1.5]} // Moved further forward (z=1.5) to be clearly in front of the TV
        scale={[1.2, 1.2, 1.2]} // Scale as needed
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          map={monkeboiTexture} 
          transparent={true}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/TV.glb');