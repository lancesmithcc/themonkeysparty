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
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [isTouching, setIsTouching] = useState(false)
  
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
  
  useEffect(() => {
    if (!isMobile) return
    
    // Handle touch events for camera control
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch for cursor control
        const touch = e.touches[0]
        touchStartPos.current = { x: touch.clientX, y: touch.clientY }
        setCursorPosition({ x: touch.clientX, y: touch.clientY })
        setIsTouching(true)
      } else if (e.touches.length === 2) {
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
      e.preventDefault()
      
      if (e.touches.length === 1) {
        // Single touch movement - update cursor and control character
        const touch = e.touches[0]
        const x = touch.clientX
        const y = touch.clientY
        
        if (touchStartPos.current) {
          // Update cursor position
          setCursorPosition({ x, y })
          
          // Calculate swipe direction for character movement
          const deltaX = x - touchStartPos.current.x
          const deltaY = y - touchStartPos.current.y
          const swipeThreshold = 20
          
          // Only move if swipe distance exceeds threshold
          if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
            // Normalize for direction
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            const normalizedX = deltaX / length
            const normalizedY = deltaY / length
            
            // Set movement direction
            setMoveDirection(new THREE.Vector3(normalizedX, 0, normalizedY))
          } else {
            // Reset movement if swipe is too small
            setMoveDirection(new THREE.Vector3(0, 0, 0))
          }
        }
      } else if (e.touches.length === 2 && initialDistance.current !== null && camera) {
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
      // Reset movement direction when touch ends
      setMoveDirection(new THREE.Vector3(0, 0, 0))
      initialDistance.current = null
      initialRotation.current = null
      touchStartPos.current = null
      setIsTouching(false)
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
  
  return (
    <div 
      ref={cursorRef}
      className={`absolute pointer-events-none w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 z-[9000] transition-all ${
        isTouching ? 'opacity-100' : 'opacity-50'
      }`}
      style={{
        left: `${cursorPosition.x}px`,
        top: `${cursorPosition.y}px`,
      }}
    >
      {/* Nintendo-style cursor */}
      <div className="w-full h-full flex items-center justify-center nintendo-cursor">
        <div className="w-12 h-12 rounded-full border-4 border-white opacity-70 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white opacity-70 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
          </div>
        </div>
      </div>
      
      {/* Touch instructions - shown when not touching */}
      {!isTouching && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs p-2 rounded-lg whitespace-nowrap">
          Swipe to move • Pinch to zoom & rotate
        </div>
      )}
    </div>
  )
} 