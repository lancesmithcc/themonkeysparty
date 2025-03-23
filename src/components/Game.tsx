import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { useEffect, Suspense } from 'react';
import Room from './Room';
import Player from './Player';
import Npc from './Npc';
import SecondNpc from './SecondNpc';
import CollisionEffect from './CollisionEffect';
import MobileControls from './MobileControls';
import { useGameStore } from '../store/gameStore';
import { KeyboardControls } from '@react-three/drei';
import GeometricShapes from './GeometricShapes';
import * as THREE from 'three';
import Stars from './Stars';

// Simple fallback component
function SimpleLoading() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

// Debug mesh component
function DebugMesh() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="hotpink" emissive="hotpink" emissiveIntensity={0.5} />
    </mesh>
  )
}

export default function Game() {
  const { isColliding, collisionPosition, isMobile, setIsMobile } = useGameStore();
  const position = useGameStore(state => state.playerPosition);
  
  // Map keyboard controls to game actions
  const keyMap = [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right', keys: ['ArrowRight', 'KeyD'] },
    { name: 'jump', keys: ['Space'] }
  ];

  // Mobile detection
  useEffect(() => {
    // Simple mobile detection
    const checkMobile = () => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };

    setIsMobile(checkMobile());

    // Update on resize
    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsMobile]);

  // CSS classes with conditional mobile adjustments
  const gameContainerClasses = `game-container w-full h-full ${
    isMobile ? 'touch-manipulation' : ''
  }`;

  return (
    <div className={gameContainerClasses} style={{ width: '100vw', height: '100vh' }}>
      <KeyboardControls
        map={keyMap}
      >
        <Canvas 
          shadows 
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
          camera={{ position: [0, 5, 10], fov: 45 }}
        >
          {/* Debug stats */}
          <Stats />
          
          {/* Set scene background color to dark blue instead of black */}
          <color attach="background" args={["#0a0a2a"]} />
          
          {/* Basic lighting */}
          <ambientLight intensity={1.0} />
          <pointLight position={[0, 5, 0]} intensity={2.0} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} castShadow />
          
          {/* Debug floor */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#444466" />
          </mesh>
          
          {/* Debug content */}
          <Suspense fallback={<SimpleLoading />}>
            <DebugMesh />
          </Suspense>
          
          {/* Controls */}
          <OrbitControls />
        </Canvas>
      </KeyboardControls>
      
      {isMobile && <MobileControls />}
    </div>
  );
}