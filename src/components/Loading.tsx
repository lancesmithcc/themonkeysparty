import { Html } from '@react-three/drei';
import { useEffect, useState } from 'react';

export function Loading() {
  const [dots, setDots] = useState('.');
  
  // Animate the loading dots
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 400);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <Html center>
      <div style={styles.container}>
        <div style={styles.spinner}></div>
        <div style={styles.text}>Loading{dots}</div>
      </div>
    </Html>
  );
}

// Styles object
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'sans-serif',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '150px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTop: '3px solid white',
    animation: 'spin 1s ease-in-out infinite',
    marginBottom: '10px'
  },
  text: {
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '100px',
    textAlign: 'center' as const
  }
}; 