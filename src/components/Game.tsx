import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { useEffect, Suspense } from 'react';
import Room from './Room';
import Player from './Player';
import Npc from './Npc';
import SecondNpc from './SecondNpc';
import CollisionEffect from './CollisionEffect';
import MobileControls from './MobileControls';
import { useGameStore } from '../store/gameStore';
import { KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import Stars from './Stars';

// Ultra simple debugging component
function SimpleDebugScene() {
  return (
    <>
      {/* Super bright light to ensure visibility */}
      <ambientLight intensity={2.0} />
      <pointLight position={[0, 5, 0]} intensity={5.0} />
      
      {/* Basic mesh with bright color */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="hotpink" emissive="hotpink" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Floor to help with orientation */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="limegreen" />
      </mesh>
    </>
  );
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
    <div className={gameContainerClasses}>
      <KeyboardControls
        map={keyMap}
      >
        <Canvas 
          shadows 
          style={{ background: 'red', width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
          camera={{ position: [0, 1, 5], fov: 60 }}
        >
          <color attach="background" args={["purple"]} />
          
          {/* Debug stats */}
          <Stats />
          
          <Suspense fallback={null}>
            <SimpleDebugScene />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      
      {isMobile && <MobileControls />}
    </div>
  );
}