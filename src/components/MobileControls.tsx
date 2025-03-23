import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

export default function MobileControls() {
  // Safely access Three.js context with a try/catch to prevent crashes
  const threeContext = (() => {
    try {
      return useThree()
    } catch (error) {
      // Return a dummy camera if not inside a Canvas context
      return { 
        camera: null 
      }
    }
  })()
  
  const { camera } = threeContext
  const setMoveDirection = useGameStore((state) => state.setMoveDirection)
  const initialDistance = useRef<number | null>(null)
  const initialRotation = useRef<number | null>(null)
  const touchStartPos = useRef<{x: number, y: number} | null>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const [activeButton, setActiveButton] = useState<string | null>(null)
  
  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      )
      setIsMobile(isMobileDevice || window.innerWidth < 768)
      
      // Add touch-device class to body for CSS optimization
      if (isMobileDevice || window.innerWidth < 768) {
        document.body.classList.add('touch-device')
      } else {
        document.body.classList.remove('touch-device')
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      document.body.classList.remove('touch-device')
    }
  }, [])
  
  // Handle D-pad button press
  const handleButtonPress = (direction: string) => {
    setActiveButton(direction)
    switch (direction) {
      case 'up':
        setMoveDirection(new THREE.Vector3(0, 0, -1))
        break
      case 'down':
        setMoveDirection(new THREE.Vector3(0, 0, 1))
        break
      case 'left':
        setMoveDirection(new THREE.Vector3(-1, 0, 0))
        break
      case 'right':
        setMoveDirection(new THREE.Vector3(1, 0, 0))
        break
      default:
        setMoveDirection(new THREE.Vector3(0, 0, 0))
    }
  }
  
  // Handle D-pad button release
  const handleButtonRelease = () => {
    setActiveButton(null)
    setMoveDirection(new THREE.Vector3(0, 0, 0))
  }
  
  // Setup for press-and-hold functionality
  const buttonHoldInterval = useRef<number | null>(null)
  
  const startHoldingButton = (direction: string) => {
    // First set immediately for responsive feel
    handleButtonPress(direction)
    
    // Clear any existing interval
    if (buttonHoldInterval.current) {
      window.clearInterval(buttonHoldInterval.current)
    }
    
    // Continue to apply movement while button is held
    buttonHoldInterval.current = window.setInterval(() => {
      handleButtonPress(direction)
    }, 100) // Keep applying at short intervals
  }
  
  const stopHoldingButton = () => {
    if (buttonHoldInterval.current) {
      window.clearInterval(buttonHoldInterval.current)
      buttonHoldInterval.current = null
    }
    handleButtonRelease()
  }
  
  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (buttonHoldInterval.current) {
        window.clearInterval(buttonHoldInterval.current)
      }
    }
  }, [])
  
  useEffect(() => {
    if (!isMobile) return
    
    // Handle touch events for camera control
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Double touch for pinch-zoom
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const dx = touch1.clientX - touch2.clientX
        const dy = touch1.clientY - touch2.clientY
        initialDistance.current = Math.sqrt(dx * dx + dy * dy)
        
        // Calculate initial rotation for camera rotation
        initialRotation.current = Math.atan2(
          touch1.clientY - touch2.clientY,
          touch1.clientX - touch2.clientX
        )
      }
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      // Always prevent default to avoid browser gestures, except on D-pad
      if (!(e.target as HTMLElement)?.closest('.d-pad-button')) {
        e.preventDefault()
      }
      
      if (e.touches.length === 2 && initialDistance.current !== null && camera) {
        // Only run pinch-zoom if camera is available
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        
        // Calculate current distance for zoom
        const dx = touch1.clientX - touch2.clientX
        const dy = touch1.clientY - touch2.clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)
        
        // Apply zoom based on pinch gesture
        if (initialDistance.current) {
          const zoomDelta = currentDistance / initialDistance.current
          // Adjust camera position based on zoom (move closer or further)
          const zoomSpeed = 0.1
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.position.z = Math.max(2, Math.min(8, camera.position.z / (1 + (zoomDelta - 1) * zoomSpeed)))
          }
        }
        
        // Calculate current rotation for camera orbit
        if (initialRotation.current !== null) {
          const currentRotation = Math.atan2(
            touch1.clientY - touch2.clientY,
            touch1.clientX - touch2.clientX
          )
          const rotationDelta = currentRotation - initialRotation.current
          
          // Apply camera rotation
          camera.position.x = Math.sin(rotationDelta) * 5
          camera.position.z = Math.cos(rotationDelta) * 5
          camera.lookAt(0, 0, 0)
        }
      }
    }
    
    const handleTouchEnd = () => {
      initialDistance.current = null
      initialRotation.current = null
      touchStartPos.current = null
    }
    
    // Add touch event listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [camera, isMobile, setMoveDirection])
  
  if (!isMobile) return null
  
  // Common button styles
  const buttonBase = "d-pad-button absolute w-7 h-7 flex items-center justify-center bg-gray-800 rounded-md border-1 active:bg-gray-700 select-none"
  const buttonActive = "bg-gray-700 border-red-500"
  const buttonInactive = "bg-gray-800 border-gray-600"
  
  return (
    // Nintendo D-pad in top right corner (half-sized)
    <div 
      ref={cursorRef}
      className="fixed top-5 right-5 w-20 h-20 z-[9999]"
    >
      {/* D-pad container */}
      <div className="relative w-full h-full">
        {/* Up button */}
        <button
          className={`${buttonBase} top-0 left-1/2 transform -translate-x-1/2 ${activeButton === 'up' ? buttonActive : buttonInactive}`}
          onTouchStart={() => startHoldingButton('up')}
          onTouchEnd={stopHoldingButton}
          onTouchCancel={stopHoldingButton}
          onMouseDown={() => startHoldingButton('up')}
          onMouseUp={stopHoldingButton}
          onMouseLeave={stopHoldingButton}
          onClick={() => {/* Prevent click handling since we're using mousedown/up */}}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        
        {/* Left button */}
        <button
          className={`${buttonBase} top-1/2 left-0 transform -translate-y-1/2 ${activeButton === 'left' ? buttonActive : buttonInactive}`}
          onTouchStart={() => startHoldingButton('left')}
          onTouchEnd={stopHoldingButton}
          onTouchCancel={stopHoldingButton}
          onMouseDown={() => startHoldingButton('left')}
          onMouseUp={stopHoldingButton}
          onMouseLeave={stopHoldingButton}
          onClick={() => {/* Prevent click handling since we're using mousedown/up */}}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Center button - only for styling */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-gray-800 rounded-md border-1 border-gray-600">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          </div>
        </div>
        
        {/* Right button */}
        <button
          className={`${buttonBase} top-1/2 right-0 transform -translate-y-1/2 ${activeButton === 'right' ? buttonActive : buttonInactive}`}
          onTouchStart={() => startHoldingButton('right')}
          onTouchEnd={stopHoldingButton}
          onTouchCancel={stopHoldingButton}
          onMouseDown={() => startHoldingButton('right')}
          onMouseUp={stopHoldingButton}
          onMouseLeave={stopHoldingButton}
          onClick={() => {/* Prevent click handling since we're using mousedown/up */}}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Down button */}
        <button
          className={`${buttonBase} bottom-0 left-1/2 transform -translate-x-1/2 ${activeButton === 'down' ? buttonActive : buttonInactive}`}
          onTouchStart={() => startHoldingButton('down')}
          onTouchEnd={stopHoldingButton}
          onTouchCancel={stopHoldingButton}
          onMouseDown={() => startHoldingButton('down')}
          onMouseUp={stopHoldingButton}
          onMouseLeave={stopHoldingButton}
          onClick={() => {/* Prevent click handling since we're using mousedown/up */}}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  )
} 