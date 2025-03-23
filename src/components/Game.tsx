import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import React, { useEffect, Suspense, useState } from 'react';
import Room from './Room';
import Player from './Player';
import Npc from './Npc';
import SecondNpc from './SecondNpc';
import MobileControls from './MobileControls';
import Scoreboard from './Scoreboard';
import { useGameStore } from '../store/gameStore';
import { KeyboardControls } from '@react-three/drei';
import GeometricShapes from './GeometricShapes';
import Mushrooms from './Mushrooms';
import Eyeballs from './Eyeballs';
import HitEffects from './HitEffects';
import { Html } from '@react-three/drei';

// Add VictoryScreen component
function VictoryScreen({ winner }: { winner: string }) {
  const restartGame = useGameStore(state => state.restartGame);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="text-center p-8 bg-gradient-to-r from-purple-900 via-violet-800 to-purple-900 rounded-xl shadow-2xl border-4 border-yellow-400 transform animate-bounce-slow">
        <h1 className="text-5xl font-bold text-yellow-300 mb-6 animate-pulse">
          {winner} WINS!
        </h1>
        <p className="text-2xl text-yellow-200 mb-8">
          The ultimate champion of the arena!
        </p>
        <button
          onClick={restartGame}
          className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full transform transition hover:scale-110"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// Simple fallback component for loading
function SimpleLoading() {
  const [dots, setDots] = useState('.');
  
  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Html fullscreen>
      <div style={{
        width: '100vw', 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 0 20px rgba(128, 0, 255, 0.5)',
          border: '2px solid #8a2be2',
          zIndex: 1000,
        }}>
          <div style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}>
            Loading 3D World
          </div>
          <div style={{ 
            padding: '10px',
            background: 'rgba(138, 43, 226, 0.3)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '18px'
          }}>
            Please wait{dots}
          </div>
        </div>
      </div>
    </Html>
  );
}

// Error boundary component for 3D content
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html fullscreen>
          <div style={{
            width: '100vw', 
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.9)'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              background: 'rgba(20, 20, 20, 0.9)',
              padding: '40px',
              borderRadius: '15px',
              boxShadow: '0 0 30px rgba(255, 0, 0, 0.6)',
              border: '2px solid #ff0000',
              maxWidth: '80%',
            }}>
              <div style={{ 
                fontSize: '28px',
                fontWeight: 'bold',
                marginBottom: '20px',
                color: '#ff3333'
              }}>
                Oh no! Something went wrong.
              </div>
              <div style={{ marginBottom: '20px', textAlign: 'center', fontSize: '16px' }}>
                There was an error loading the 3D content.
                <br/>
                Please try refreshing the page or check your browser console for more details.
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: '#ff3333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 10px rgba(255, 0, 0, 0.4)'
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

// Game updater component that uses useFrame inside the Canvas
function GameUpdater() {
  const gameState = useGameStore();
  
  // Log that the GameUpdater is running
  useEffect(() => {
    console.log("GameUpdater mounted - game logic will now run each frame");
    
    // Clean up function
    return () => {
      console.log("GameUpdater unmounted");
    };
  }, []);
  
  // Update game state each frame
  useFrame((state, delta) => {
    // Get game state
    const gameState = useGameStore.getState();
    
    // Skip updates if game is over
    if (gameState.gameOver) return;
    
    // Disable animations when page is not focused to prevent background processing
    if (document.hidden) return;
    
    try {
      // Force second NPC to always move
      gameState.shouldSecondNpcMove = true;
      
      // Update character positions
      gameState.updatePosition();
      gameState.updateNpcPosition();
      gameState.updateSecondNpcPosition();
      
      // Check for collisions
      gameState.checkCollision();
      
      // Check for purple character collisions
      gameState.checkPurpleCollisions();
      
      // Update mushrooms
      gameState.updateMushrooms(delta);
      
      // Update eyeballs
      gameState.updateEyeballs(delta);
      
      // Update purple states
      gameState.updatePurpleStates();
      
      // Update hit animation states
      gameState.updateHitStates();
      
      // Check if any character should melt
      gameState.checkMeltingState();
    } catch (error) {
      console.error("Error in game loop:", error);
    }
  });
  
  // This component doesn't render anything visual
  return null;
}

export default function Game() {
  // State to detect mobile devices
  const isMobile = useGameStore(state => state.isMobile);
  const setIsMobile = useGameStore(state => state.setIsMobile);
  const position = useGameStore(state => state.playerPosition);
  const handleKeyDown = useGameStore(state => state.handleKeyDown);
  const handleKeyUp = useGameStore(state => state.handleKeyUp);
  
  // For debugging
  console.log("Game component rendered, player position:", position);
  
  // Get game over state and winner
  const { gameOver, winner } = useGameStore(state => ({
    gameOver: state.gameOver,
    winner: state.winner
  }));
  
  // Log game over state
  useEffect(() => {
    if (gameOver) {
      console.log(`Game over detected! Winner: ${winner}`);
    }
  }, [gameOver, winner]);
  
  // Add CSS class for victory animation
  useEffect(() => {
    // Add the animation class to the style sheet if it doesn't exist
    if (!document.getElementById('victory-animations')) {
      const style = document.createElement('style');
      style.id = 'victory-animations';
      style.innerHTML = `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Classes for game container
  const gameContainerClasses = "relative w-screen h-screen overflow-hidden bg-black";
  
  // Set up keyboard event listeners
  useEffect(() => {
    // Function to handle key down events
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      // Send either key or code, preferring code for letter keys
      const keyToSend = e.code.startsWith('Key') ? e.code : e.key;
      handleKeyDown(keyToSend);
    };
    
    // Function to handle key up events
    const onKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      // Send either key or code, preferring code for letter keys
      const keyToSend = e.code.startsWith('Key') ? e.code : e.key;
      handleKeyUp(keyToSend);
    };
    
    // Add event listeners for keyboard input
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // Check if device is mobile
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize event listener to update mobile status
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listeners when component unmounts
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', checkMobile);
    };
  }, [handleKeyDown, handleKeyUp, setIsMobile]);
  
  // Define key mappings for keyboard controls
  const keyMap = [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'jump', keys: ['Space'] },
  ];
  
  // Get game state accessors
  const platformColor = useGameStore(state => state.platformColor);
  const showWinScreen = useGameStore(state => state.showWinScreen);
  const restartGame = useGameStore(state => state.restartGame);
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWinScreen && e.key === 'r') {
        restartGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWinScreen, restartGame]);
  
  return (
    <div className={gameContainerClasses}>
      <Scoreboard />
      <KeyboardControls
        map={keyMap}
      >
        <Canvas shadows style={{ width: '100%', height: '100%' }} gl={{ antialias: true, alpha: false }}>
          {/* Debug stats - comment out in production */}
          {/* <Stats /> */}
          
          {/* Set scene background color to black */}
          <color attach="background" args={["#000000"]} />
          
          {/* Improve fog settings - less dense to avoid black screen */}
          <fog attach="fog" color="#000000" near={8} far={50} />
          
          {/* Camera setup */}
          <PerspectiveCamera 
            makeDefault 
            position={[0, 5, 10]} 
            fov={75}
            near={0.1}
            far={100}
          />
          <OrbitControls 
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2}
            enableZoom={true}
            minDistance={2}
            maxDistance={15}
            zoomSpeed={1}
          />
          
          {/* Enhanced lighting setup */}
          <ambientLight intensity={1.5} /> {/* Increased ambient light */}
          <pointLight position={[10, 10, 10]} intensity={2.5} color="#ffffff" castShadow /> {/* Brighter main light */}
          <pointLight position={[-10, 10, -10]} intensity={1.5} color="#6666ff" /> {/* Fill light with blue tint */}
          <pointLight position={[0, 5, 0]} intensity={2.0} /> {/* Top light */}
          <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#000000" /> {/* Hemisphere light */}

          {/* Main game components */}
          <ErrorBoundary>
            <Suspense fallback={<SimpleLoading />}>
              <Room />
              <Player position={position} />
              <Npc />
              <SecondNpc />
              <Mushrooms />
              <Eyeballs />
              
              {/* Add HitEffects for collision visuals */}
              <HitEffects />
              
              {/* Add visual effects */}
              <GeometricShapes />
              
              {/* Add game state updater */}
              <GameUpdater />
            </Suspense>
          </ErrorBoundary>
        </Canvas>
      </KeyboardControls>
      
      {isMobile && <MobileControls />}
      
      {/* Show victory screen when game is over */}
      {gameOver && winner && <VictoryScreen winner={winner} />}
    </div>
  );
}