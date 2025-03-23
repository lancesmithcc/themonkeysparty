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

// Simple fallback component for loading
function SimpleLoading() {
  return null;
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
          camera={{ position: [0, 5, 8], fov: 45 }}
          gl={{ alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color('#020209'));
          }}
        >
          {/* Debug stats - comment out in production */}
          {/* <Stats /> */}
          
          <fog attach="fog" args={['#020209', 5, 20]} />
          <ambientLight intensity={0.3} />
          <directionalLight 
            castShadow
            position={[5, 8, 5]} 
            intensity={1} 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024}
            shadow-camera-far={20}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          
          <Suspense fallback={null}>
            <OrbitControls 
              enableZoom={false} 
              enablePan={false} 
              minPolarAngle={Math.PI / 4} 
              maxPolarAngle={Math.PI / 2.5}
              rotateSpeed={0.5}
            />
            
            <Stars />
            <Room />
            <Player position={position} />
            <Npc />
            <SecondNpc />
            <GeometricShapes />
            
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