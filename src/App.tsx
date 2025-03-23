import React, { useEffect, useState } from 'react';
import Game from './components/Game';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
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
  }, []);

  // Prevent scrolling when down key is pressed and handle touch events
  useEffect(() => {
    const preventArrowScroll = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    
    // Prevent default touch behavior to avoid browser gestures
    const preventTouchDefault = (e: TouchEvent) => {
      // Allow touch events on the Spotify iframe
      if ((e.target as HTMLElement)?.closest('.spotify-container')) {
        return;
      }
      e.preventDefault();
    };
    
    window.addEventListener('keydown', preventArrowScroll);
    window.addEventListener('touchmove', preventTouchDefault, { passive: false });
    
    // Set body and html to prevent scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', preventArrowScroll);
      window.removeEventListener('touchmove', preventTouchDefault);
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
        className="fixed spotify-container bottom-[33px] right-[33px] w-[333px] bg-black rounded-[33px] shadow-xl z-[999]"
        style={{
          border: isMobile ? '6px solid #FFDD00' : '11px solid #FFDD00',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        <iframe 
          style={{ borderRadius: isMobile ? '16px' : '22px' }}
          src="https://open.spotify.com/embed/artist/7uRdOviCjjinw4dpBsTy5o?utm_source=generator" 
          width="100%" 
          height={isMobile ? "252" : "352"} 
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