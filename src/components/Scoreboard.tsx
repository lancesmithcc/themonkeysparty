import { useGameStore } from '../store/gameStore';
import '@fontsource/press-start-2p';

export default function Scoreboard() {
  const npcScore = useGameStore(state => state.npcScore);
  const secondNpcScore = useGameStore(state => state.secondNpcScore);
  // The player doesn't have a score yet, but we'll add a placeholder for consistency
  const playerScore = useGameStore(state => state.playerScore || 0);
  
  return (
    <div className="fixed top-0 left-0 w-full bg-black bg-opacity-70 px-4 py-2 z-10">
      <div className="flex justify-between items-center max-w-4xl mx-auto">
        {/* Robo-Bonobo (Player) Score */}
        <div className="text-center">
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '12px',
              color: '#ffcc00'
            }}
          >
            ROBO-BONOBO
          </div>
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '16px',
              color: '#ffcc00',
              marginTop: '4px'
            }}
          >
            {playerScore}
          </div>
        </div>
        
        {/* Anuki (First NPC) Score */}
        <div className="text-center">
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '12px',
              color: '#CCFFE5'
            }}
          >
            ANUKI
          </div>
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '16px',
              color: '#CCFFE5',
              marginTop: '4px'
            }}
          >
            {npcScore}
          </div>
        </div>
        
        {/* Eldara Oakwing (Second NPC) Score */}
        <div className="text-center">
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '12px',
              color: '#80CCFF'
            }}
          >
            ELDARA OAKWING
          </div>
          <div 
            style={{ 
              fontFamily: '"Press Start 2P", cursive',
              fontSize: '16px',
              color: '#80CCFF',
              marginTop: '4px'
            }}
          >
            {secondNpcScore}
          </div>
        </div>
      </div>
    </div>
  );
} 