import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, Suspense } from 'react';
import Room from './Room';
import Player from './Player';
import Npc from './Npc';
import CollisionEffect from './CollisionEffect';
import MobileControls from './MobileControls';
import { useGameStore } from '../store/gameStore';
import { KeyboardControls } from '@react-three/drei';
import GeometricShapes from './GeometricShapes';

// Simple fallback component for loading
function SimpleLoading() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="white" wireframe />
    </mesh>
  );
}

export default function Game() {
  const position = useGameStore((state) => state.playerPosition);
  const handleKeyDown = useGameStore((state) => state.handleKeyDown);
  const handleKeyUp = useGameStore((state) => state.handleKeyUp);
  const setIsMobile = useGameStore((state) => state.setIsMobile);
  const isMobile = useGameStore((state) => state.isMobile);

  // Add debug logging
  console.log("Game component rendering", position);
  
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
    <div className="game-container">
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
          { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
          { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
          { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
        ]}
      >
        <Canvas shadows>
          {/* Set scene background color to black */}
          <color attach="background" args={["#000000"]} />
          
          <PerspectiveCamera makeDefault position={[0, 10, 10]} />
          <OrbitControls
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2}
            enableZoom={false}
          />
          
          {/* Increased ambient light */}
          <ambientLight intensity={0.5} />
          
          {/* Added point light above character */}
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          
          {/* Directional light for general illumination */}
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          <Suspense fallback={<SimpleLoading />}>
            <Room />
            <GeometricShapes />
            <Player position={position} />
            <Npc />
            <CollisionEffect />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      {isMobile && <MobileControls />}
    </div>
  );
}