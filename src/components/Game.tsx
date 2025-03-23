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

// Simple fallback component for loading
function SimpleLoading() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
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
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
          camera={{ position: [0, 5, 10], fov: 45 }}
        >
          {/* Debug stats - comment out in production */}
          <Stats />
          
          {/* Scene background color */}
          <color attach="background" args={["#000000"]} />
          <fog attach="fog" color="#000000" near={1} far={50} />
          
          {/* Enhanced lighting */}
          <ambientLight intensity={1.0} />
          <pointLight position={[10, 10, 10]} intensity={2.0} />
          <directionalLight 
            position={[5, 5, 5]}
            intensity={1.0}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          <Suspense fallback={<SimpleLoading />}>
            <OrbitControls 
              target={[0, 0, 0]}
              maxPolarAngle={Math.PI / 2}
              enableZoom={true}
              minDistance={2}
              maxDistance={15}
              zoomSpeed={1}
            />
            
            <Stars />
            <Room />
            <Player position={position} />
            <Npc />
            <SecondNpc />
            
            {/* Render collision effect when collision is detected */}
            {isColliding && (
              <CollisionEffect position={new THREE.Vector3(
                collisionPosition[0], 
                collisionPosition[1], 
                collisionPosition[2]
              )} />
            )}
          </Suspense>
        </Canvas>
      </KeyboardControls>
      
      {isMobile && <MobileControls />}
    </div>
  );
}