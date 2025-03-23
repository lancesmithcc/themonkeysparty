import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WinScreen() {
  const { showWinScreen, winner } = useGameStore();
  const [confetti, setConfetti] = useState<Array<{
    x: number, 
    y: number, 
    size: number, 
    color: string,
    angle: number,
    speed: number
  }>>([]);
  
  useEffect(() => {
    if (showWinScreen) {
      // Generate confetti pieces
      const newConfetti = [];
      const colors = ['#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800'];
      
      for (let i = 0; i < 100; i++) {
        newConfetti.push({
          x: Math.random() * window.innerWidth,
          y: -Math.random() * 200,
          size: Math.random() * 10 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          angle: Math.random() * 360,
          speed: Math.random() * 5 + 2
        });
      }
      
      setConfetti(newConfetti);
    } else {
      setConfetti([]);
    }
  }, [showWinScreen]);

  // Simple confetti animation
  useEffect(() => {
    if (confetti.length === 0) return;
    
    const interval = setInterval(() => {
      setConfetti(prev => prev.map(piece => ({
        ...piece,
        y: piece.y + piece.speed,
        angle: piece.angle + 2
      })).filter(piece => piece.y < window.innerHeight));
    }, 30);
    
    return () => clearInterval(interval);
  }, [confetti.length]);

  // Get the winner's name for display
  const getWinnerName = () => {
    if (winner === 'player') return 'Player';
    if (winner === 'npc') return 'Anuki';
    if (winner === 'secondNpc') return 'Eldara';
    return '';
  };

  return (
    <AnimatePresence>
      {showWinScreen && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Confetti */}
          {confetti.map((piece, i) => (
            <div 
              key={i}
              className="absolute"
              style={{
                left: `${piece.x}px`,
                top: `${piece.y}px`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.angle}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%'
              }}
            />
          ))}
          
          {/* Win message */}
          <motion.div 
            className="text-center bg-black/70 rounded-xl p-8 shadow-2xl"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', bounce: 0.4 }}
          >
            <h1 className="text-6xl font-bold text-yellow-300 mb-4">
              {getWinnerName()} Wins!
            </h1>
            <p className="text-3xl text-white mb-6">
              Restarting game soon...
            </p>
            <div className="w-24 h-24 mx-auto border-t-4 border-b-4 border-yellow-300 rounded-full animate-spin" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 