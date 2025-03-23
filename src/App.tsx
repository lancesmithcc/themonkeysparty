import React, { useEffect, useState } from 'react';
import Game from './components/Game';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [isSpotifyMinimized, setIsSpotifyMinimized] = useState(false);

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

  // Toggle Spotify player visibility
  const toggleSpotifyPlayer = () => {
    setIsSpotifyMinimized(!isSpotifyMinimized);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {/* Game container */}
      <div className="w-full h-full">
        <Game />
      </div>
      
      {/* Spotify Player Container with minimize/maximize button */}
      <div 
        className={`fixed spotify-container transition-all duration-300 ease-in-out ${
          isSpotifyMinimized 
            ? 'bottom-[20px] right-[20px] w-[60px] h-[60px] rounded-full' 
            : `bottom-[33px] right-[33px] w-[333px] ${isMobile ? 'h-[252px]' : 'h-[352px]'} rounded-[33px]`
        } bg-black shadow-xl z-[999]`}
        style={{
          border: isSpotifyMinimized 
            ? '4px solid #FFDD00' 
            : isMobile ? '6px solid #FFDD00' : '11px solid #FFDD00',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        {/* Minimize/Maximize button */}
        <button 
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-black bg-opacity-70 rounded-full border-2 border-yellow-300 text-white hover:bg-opacity-100 transition-colors"
          onClick={toggleSpotifyPlayer}
          aria-label={isSpotifyMinimized ? "Expand Spotify Player" : "Minimize Spotify Player"}
        >
          {isSpotifyMinimized ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
        
        {/* Spotify Logo when minimized */}
        {isSpotifyMinimized ? (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={toggleSpotifyPlayer}
          >
            <svg className="w-8 h-8 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
        ) : (
          <iframe 
            style={{ borderRadius: isMobile ? '16px' : '22px' }}
            src="https://open.spotify.com/embed/artist/7uRdOviCjjinw4dpBsTy5o?utm_source=generator" 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
          ></iframe>
        )}
      </div>
    </div>
  );
}

export default App;