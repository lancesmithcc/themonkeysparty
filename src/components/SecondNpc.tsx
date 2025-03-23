import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Using the eldara model
const MODEL_URL = '/models/eldara.glb';

export default function SecondNpc() {
  const ref = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  
  const { secondNpcPosition, secondNpcRotation, updateSecondNpcPosition } = useGameStore(state => ({
    secondNpcPosition: state.secondNpcPosition,
    secondNpcRotation: state.secondNpcRotation,
    updateSecondNpcPosition: state.updateSecondNpcPosition
  }));

  // Clone the scene to avoid conflicts
  const npcScene = useMemo(() => scene.clone(), [scene]);
  
  // Scale the model appropriately
  useEffect(() => {
    npcScene.scale.set(0.7, 0.7, 0.7);
    console.log("Second NPC model loaded and scaled");
  }, [npcScene]);

  // Set initial rotation and log available animations
  useEffect(() => {
    console.log("Second NPC component mounted");
    if (ref.current) {
      ref.current.rotation.y = Math.PI;
    }
    
    // Log available animations for debugging
    console.log("Second NPC available animations:", Object.keys(actions));
  }, [actions]);

  // Animation and movement in each frame
  useFrame((state) => {
    // Update NPC position through the store
    updateSecondNpcPosition();
    
    // Ensure reference exists
    if (!ref.current) return;
    
    // Debug log of position
    if (state.clock.elapsedTime % 60 < 0.1) { // Log roughly every minute
      console.log("Second NPC position:", secondNpcPosition);
    }
    
    // Apply position from store
    ref.current.position.set(
      secondNpcPosition[0], 
      secondNpcPosition[1], 
      secondNpcPosition[2]
    );
    
    // Apply rotation from store if provided
    if (secondNpcRotation) {
      ref.current.rotation.set(
        secondNpcRotation[0], 
        secondNpcRotation[1], 
        secondNpcRotation[2]
      );
    }
  });

  return (
    <group ref={ref}>
      <primitive object={npcScene} position={[0, 1, 0]} />
      {/* Simple debug sphere to make it more visible */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
    </group>
  );
}

// Pre-load the model
useGLTF.preload(MODEL_URL); 