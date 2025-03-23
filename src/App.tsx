import React, { useEffect } from 'react';
import Game from './components/Game';

function App() {
  // Prevent scrolling when down key is pressed
  useEffect(() => {
    const preventArrowScroll = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', preventArrowScroll);
    
    // Set body and html to prevent scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', preventArrowScroll);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {/* Game container */}
      <div className="absolute inset-0 w-full h-full game-container">
        <Game />
      </div>
      
      {/* Spotify Player Container - using z-index 999 to ensure it's on top */}
      <div 
        className="fixed bottom-[33px] right-[33px] w-[333px] bg-black rounded-[33px] shadow-xl z-[999]"
        style={{
          border: '11px solid #FFDD00',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        <iframe 
          style={{ borderRadius: '22px' }}
          src="https://open.spotify.com/embed/artist/7uRdOviCjjinw4dpBsTy5o?utm_source=generator" 
          width="100%" 
          height="352" 
          frameBorder="0" 
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
}

export default App;