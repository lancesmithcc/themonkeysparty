import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect } from 'react';
import Room from './Room';
import Player from './Player';
import MobileControls from './MobileControls';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

export default function Game() {
  const position = useGameStore((state) => state.playerPosition);
  const handleKeyDown = useGameStore((state) => state.handleKeyDown);
  const handleKeyUp = useGameStore((state) => state.handleKeyUp);
  const setIsMobile = useGameStore((state) => state.setIsMobile);

  // Detect mobile and set in store
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      setIsMobile(isMobileDevice || window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setIsMobile]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="w-full h-screen">
      <Canvas shadows>
        {/* Set scene background color to black */}
        <color attach="background" args={["#000000"]} />
        
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2}
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={10}
        />
        
        {/* Increased ambient light */}
        <ambientLight intensity={0.7} />
        
        {/* Added point light above character */}
        <pointLight
          position={[0, 8, 0]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        {/* Directional light for general illumination */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        <Room />
        <Player position={position} />
      </Canvas>
      
      {/* Mobile controls overlay */}
      <MobileControls />
    </div>
  );
}