import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export default function GeometricShapes() {
  // References for the shapes
  const dodecahedronRef = useRef<THREE.LineSegments>(null);
  const icosahedronRef = useRef<THREE.LineSegments>(null);
  const tetrahedronRef = useRef<THREE.LineSegments>(null);
  
  // Track shape state for chaotic transformations
  const [shapesState, setShapesState] = useState({
    currentTransition: 0,
    nextTransitionTime: 0,
    chaosLevel: 0
  });
  
  // Get player position to react to movement
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  // Create animation parameters for each shape
  const dodecahedronAnim = useMemo(() => ({
    position: new THREE.Vector3(-3, 2, -2),
    rotationSpeed: [0.001, 0.002, 0.001],
    movementPhase: 0,
    fadePhase: Math.random() * Math.PI * 2,
    fadeSpeed: 0.3,
    moveRadius: 0.5,
    baseColor: new THREE.Color(0x00ffff),
    glowColor: new THREE.Color(0x88ffff),
    reactColor: new THREE.Color(0x00ffaa),
    chaos: {
      scale: 1,
      targetScale: 1,
      pulseSpeed: 0.2 + Math.random() * 0.3,
      rotationMultiplier: 1,
      noiseOffset: Math.random() * 1000,
      distortionAmount: 0.2
    }
  }), []);
  
  const icosahedronAnim = useMemo(() => ({
    position: new THREE.Vector3(3, 3, -1),
    rotationSpeed: [0.002, 0.001, 0.002],
    movementPhase: Math.PI / 2,
    fadePhase: Math.random() * Math.PI * 2,
    fadeSpeed: 0.4,
    moveRadius: 0.7,
    baseColor: new THREE.Color(0xff00ff),
    glowColor: new THREE.Color(0xff88ff),
    reactColor: new THREE.Color(0xff00aa),
    chaos: {
      scale: 1,
      targetScale: 1,
      pulseSpeed: 0.3 + Math.random() * 0.3,
      rotationMultiplier: 1,
      noiseOffset: Math.random() * 1000,
      distortionAmount: 0.3
    }
  }), []);
  
  const tetrahedronAnim = useMemo(() => ({
    position: new THREE.Vector3(0, 4, -3),
    rotationSpeed: [0.003, 0.002, 0.001],
    movementPhase: Math.PI,
    fadePhase: Math.random() * Math.PI * 2,
    fadeSpeed: 0.5,
    moveRadius: 0.6,
    baseColor: new THREE.Color(0xffff00),
    glowColor: new THREE.Color(0xffff88),
    reactColor: new THREE.Color(0xaaff00),
    chaos: {
      scale: 1,
      targetScale: 1,
      pulseSpeed: 0.4 + Math.random() * 0.3,
      rotationMultiplier: 1,
      noiseOffset: Math.random() * 1000,
      distortionAmount: 0.25
    }
  }), []);
  
  // Noise functions for chaotic movement
  const noise = (x: number, y: number, z: number) => {
    return Math.sin(x * 0.3) * Math.sin(y * 0.4) * Math.sin(z * 0.5) * 0.5;
  };
  
  // Function to generate new random targets for chaotic animation
  const generateChaosTargets = () => {
    // Update chaos target values for each shape
    dodecahedronAnim.chaos.targetScale = 0.7 + Math.random() * 0.6;
    dodecahedronAnim.chaos.rotationMultiplier = 0.5 + Math.random() * 2.5;
    dodecahedronAnim.chaos.distortionAmount = 0.1 + Math.random() * 0.4;
    
    icosahedronAnim.chaos.targetScale = 0.7 + Math.random() * 0.6;
    icosahedronAnim.chaos.rotationMultiplier = 0.5 + Math.random() * 2.5;
    icosahedronAnim.chaos.distortionAmount = 0.1 + Math.random() * 0.4;
    
    tetrahedronAnim.chaos.targetScale = 0.7 + Math.random() * 0.6;
    tetrahedronAnim.chaos.rotationMultiplier = 0.5 + Math.random() * 2.5;
    tetrahedronAnim.chaos.distortionAmount = 0.1 + Math.random() * 0.4;
    
    // Set new colors with occasional drastic shifts
    if (Math.random() > 0.7) {
      const newHue = Math.random();
      dodecahedronAnim.baseColor.setHSL(newHue, 1, 0.5);
      dodecahedronAnim.glowColor.setHSL(newHue, 0.5, 0.7);
      dodecahedronAnim.reactColor.setHSL((newHue + 0.2) % 1, 1, 0.5);
    }
    
    if (Math.random() > 0.7) {
      const newHue = Math.random();
      icosahedronAnim.baseColor.setHSL(newHue, 1, 0.5);
      icosahedronAnim.glowColor.setHSL(newHue, 0.5, 0.7);
      icosahedronAnim.reactColor.setHSL((newHue + 0.2) % 1, 1, 0.5);
    }
    
    if (Math.random() > 0.7) {
      const newHue = Math.random();
      tetrahedronAnim.baseColor.setHSL(newHue, 1, 0.5);
      tetrahedronAnim.glowColor.setHSL(newHue, 0.5, 0.7);
      tetrahedronAnim.reactColor.setHSL((newHue + 0.2) % 1, 1, 0.5);
    }
    
    return Math.random() * 3 + 2; // Random time until next transition (2-5 seconds)
  };
  
  // Create proper platonic solid geometries
  // Dodecahedron and Icosahedron use Three.js built-ins which are correct
  // For tetrahedron, we'll use a proper one with exact coordinates
  const createTetrahedron = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    
    // Exact coordinates for regular tetrahedron
    const vertices = [
      0, 0, 0,                  // base 1
      1, 0, 0,                  // base 2
      0.5, 0, Math.sqrt(0.75),  // base 3
      0.5, Math.sqrt(0.75), Math.sqrt(0.75)/3  // apex
    ];
    
    // Define edges (indexed pairs)
    const indices = [
      0, 1, 1, 2, 2, 0,  // base
      0, 3, 1, 3, 2, 3   // edges to apex
    ];
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Center the geometry
    const center = new THREE.Vector3();
    center.x = (vertices[0] + vertices[3] + vertices[6] + vertices[9]) / 4;
    center.y = (vertices[1] + vertices[4] + vertices[7] + vertices[10]) / 4;
    center.z = (vertices[2] + vertices[5] + vertices[8] + vertices[11]) / 4;
    
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] -= center.x;
      positions[i + 1] -= center.y;
      positions[i + 2] -= center.z;
    }
    
    geometry.computeVertexNormals();
    
    return geometry;
  }, []);
  
  // Enhanced glow shader with improved edge detection and stronger emission
  const enhancedGlowShader = {
    uniforms: {
      baseColor: { value: new THREE.Color(0xffffff) },
      glowColor: { value: new THREE.Color(0xffffff) },
      reactColor: { value: new THREE.Color(0xffffff) },
      time: { value: 0 },
      intensity: { value: 1.0 },
      playerPosition: { value: new THREE.Vector3() },
      reactionRadius: { value: 2.5 },
      reactionStrength: { value: 0.0 },
      distortionAmount: { value: 0.0 },
      chaosLevel: { value: 0.0 }
    },
    vertexShader: `
      uniform float time;
      uniform float distortionAmount;
      uniform float chaosLevel;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      // Simple noise function
      float noise(vec3 p) {
        return sin(p.x * 10.0) * sin(p.y * 10.0) * sin(p.z * 10.0) * 0.5;
      }
      
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        
        // Pass world position for distance calculations
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Chaotic distortion
        vec3 pos = position;
        
        // Basic pulsing effect
        float pulseAmount = sin(time * 3.0) * 0.02;
        
        // Add noise-based distortion affected by chaos level
        float noiseVal = noise(position + vec3(time * 0.5)) * distortionAmount * chaosLevel;
        pos += pos * noiseVal;
        
        // Time-based warping
        float warpFactor = sin(time * 2.0 + position.x + position.y + position.z) * distortionAmount * chaosLevel;
        pos *= 1.0 + pulseAmount + warpFactor;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 glowColor;
      uniform vec3 reactColor;
      uniform float time;
      uniform float intensity;
      uniform vec3 playerPosition;
      uniform float reactionRadius;
      uniform float reactionStrength;
      uniform float chaosLevel;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        // Basic edge glow - stronger at edges
        float viewAngle = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float edgeGlow = pow(viewAngle, 1.5); // Less falloff for more visible lines
        
        // Enhanced pulsing effect with chaos
        float basePulse = sin(time * 2.0) * 0.2 + 0.8;
        float chaosPulse = sin(time * 5.0) * sin(time * 7.0) * chaosLevel * 0.3;
        float pulse = basePulse + chaosPulse;
        
        // Calculate distance to player
        float distToPlayer = length(vWorldPosition - playerPosition);
        float playerProximity = 1.0 - smoothstep(0.0, reactionRadius, distToPlayer);
        float playerEffect = playerProximity * reactionStrength;
        
        // Mix colors based on player proximity and chaos
        vec3 finalColor = mix(baseColor, glowColor, edgeGlow);
        
        // Add chaos color shifting
        float chaosShift = sin(time * 3.0 + vPosition.x * 5.0) * chaosLevel * 0.5;
        vec3 shiftedColor = vec3(
          baseColor.r * (1.0 + chaosShift),
          baseColor.g * (1.0 - chaosShift),
          baseColor.b * (1.0 + sin(time + vPosition.y * 3.0) * chaosLevel * 0.5)
        );
        
        finalColor = mix(finalColor, shiftedColor, chaosLevel * 0.5);
        finalColor = mix(finalColor, reactColor, playerEffect * pulse);
        
        // Increase base brightness and add time-varying effect
        float baseIntensity = intensity * (1.0 + playerEffect);
        float finalIntensity = baseIntensity * (0.7 + pulse * 0.5);
        
        // Add sparkle effect enhanced by chaos
        float sparkle = pow(sin(vPosition.x * 10.0 + time) * 
                           cos(vPosition.y * 10.0 + time) * 
                           sin(vPosition.z * 10.0 + time), 8.0) * (playerEffect + chaosLevel * 0.5);
        
        // Add more chaotic sparkles at high chaos levels
        if (chaosLevel > 0.5) {
          sparkle += pow(sin(vPosition.x * 20.0 + time * 3.0) * 
                        cos(vPosition.y * 15.0 - time * 2.0) * 
                        sin(vPosition.z * 25.0 + time * 4.0), 16.0) * chaosLevel;
        }
        
        finalColor += sparkle * reactColor;
        
        // Stronger glow with additive component
        gl_FragColor = vec4(finalColor, finalIntensity);
      }
    `
  };
  
  // Create enhanced glowing materials with custom shaders
  const dodecaMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: dodecahedronAnim.baseColor },
        glowColor: { value: dodecahedronAnim.glowColor },
        reactColor: { value: dodecahedronAnim.reactColor },
        time: { value: 0 },
        intensity: { value: 1.0 },
        playerPosition: { value: new THREE.Vector3() },
        reactionRadius: { value: 2.5 },
        reactionStrength: { value: 0.0 },
        distortionAmount: { value: dodecahedronAnim.chaos.distortionAmount },
        chaosLevel: { value: 0.0 }
      },
      vertexShader: enhancedGlowShader.vertexShader,
      fragmentShader: enhancedGlowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: 3 // Note: this may not work on all systems due to WebGL limitations
    });
    return material;
  }, []);
  
  const icosaMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: icosahedronAnim.baseColor },
        glowColor: { value: icosahedronAnim.glowColor },
        reactColor: { value: icosahedronAnim.reactColor },
        time: { value: 0 },
        intensity: { value: 1.0 },
        playerPosition: { value: new THREE.Vector3() },
        reactionRadius: { value: 2.5 },
        reactionStrength: { value: 0.0 },
        distortionAmount: { value: icosahedronAnim.chaos.distortionAmount },
        chaosLevel: { value: 0.0 }
      },
      vertexShader: enhancedGlowShader.vertexShader,
      fragmentShader: enhancedGlowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return material;
  }, []);
  
  const tetraMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: tetrahedronAnim.baseColor },
        glowColor: { value: tetrahedronAnim.glowColor },
        reactColor: { value: tetrahedronAnim.reactColor },
        time: { value: 0 },
        intensity: { value: 1.0 },
        playerPosition: { value: new THREE.Vector3() },
        reactionRadius: { value: 2.5 },
        reactionStrength: { value: 0.0 },
        distortionAmount: { value: tetrahedronAnim.chaos.distortionAmount },
        chaosLevel: { value: 0.0 }
      },
      vertexShader: enhancedGlowShader.vertexShader,
      fragmentShader: enhancedGlowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return material;
  }, []);

  // Smoothly transition chaos level
  useEffect(() => {
    // Start with first transition
    setShapesState(prev => ({
      ...prev,
      nextTransitionTime: generateChaosTargets()
    }));
  }, []);
  
  // Animation frame
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // Update chaotic transitions
    if (time > shapesState.nextTransitionTime) {
      const nextTransitionIn = generateChaosTargets();
      setShapesState(prev => ({
        currentTransition: prev.currentTransition + 1,
        nextTransitionTime: time + nextTransitionIn,
        chaosLevel: Math.min(1, prev.chaosLevel + 0.2) // Gradually increase chaos
      }));
    }
    
    // Update all chaos properties with smooth transitions
    const lerpFactor = delta * 2; // Smooth transition speed
    
    // Smoothly adjust scale
    dodecahedronAnim.chaos.scale = THREE.MathUtils.lerp(
      dodecahedronAnim.chaos.scale, 
      dodecahedronAnim.chaos.targetScale, 
      lerpFactor
    );
    
    icosahedronAnim.chaos.scale = THREE.MathUtils.lerp(
      icosahedronAnim.chaos.scale, 
      icosahedronAnim.chaos.targetScale, 
      lerpFactor
    );
    
    tetrahedronAnim.chaos.scale = THREE.MathUtils.lerp(
      tetrahedronAnim.chaos.scale, 
      tetrahedronAnim.chaos.targetScale, 
      lerpFactor
    );
    
    // Create player position vector for shader
    const playerPos = new THREE.Vector3(
      playerPosition[0], 
      playerPosition[1], 
      playerPosition[2]
    );
    
    // Animate dodecahedron
    if (dodecahedronRef.current) {
      const material = dodecahedronRef.current.material as THREE.ShaderMaterial;
      
      // Update shader time and player position
      material.uniforms.time.value = time;
      material.uniforms.playerPosition.value.copy(playerPos);
      material.uniforms.chaosLevel.value = shapesState.chaosLevel;
      
      // Update distortion amount
      material.uniforms.distortionAmount.value = dodecahedronAnim.chaos.distortionAmount;
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(dodecahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Apply scale changes
      dodecahedronRef.current.scale.set(
        dodecahedronAnim.chaos.scale,
        dodecahedronAnim.chaos.scale,
        dodecahedronAnim.chaos.scale
      );
      
      // Adjust rotation speed based on player proximity and chaos
      const baseSpeed = dodecahedronAnim.rotationSpeed;
      const speedMultiplier = (1 + reactionStrength * 2) * dodecahedronAnim.chaos.rotationMultiplier;
      
      // Apply more chaotic rotation patterns
      dodecahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15;
      dodecahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15;
      dodecahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15;
      
      // Chaotic rotation bursts
      if (shapesState.chaosLevel > 0.5 && Math.random() > 0.95) {
        dodecahedronRef.current.rotation.x += (Math.random() - 0.5) * shapesState.chaosLevel * 0.2;
        dodecahedronRef.current.rotation.y += (Math.random() - 0.5) * shapesState.chaosLevel * 0.2;
      }
      
      // Enhanced chaotic movement
      const chaosTime = time * (1 + shapesState.chaosLevel);
      const chaosAmplitude = 0.5 + shapesState.chaosLevel * 0.8;
      
      const moveX = Math.sin(chaosTime * 0.5 + dodecahedronAnim.movementPhase) * 
                    dodecahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveY = Math.cos(chaosTime * 0.3 + dodecahedronAnim.movementPhase) * 
                    dodecahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveZ = Math.sin(chaosTime * 0.4 + dodecahedronAnim.movementPhase) * 
                    dodecahedronAnim.moveRadius * chaosAmplitude;
      
      // Add chaotic noise movement
      const noiseAmount = shapesState.chaosLevel * 0.7;
      const noiseX = noise(time + dodecahedronAnim.chaos.noiseOffset, time * 0.5, time * 0.7) * noiseAmount;
      const noiseY = noise(time * 0.7, time + dodecahedronAnim.chaos.noiseOffset, time * 0.5) * noiseAmount;
      const noiseZ = noise(time * 0.5, time * 0.7, time + dodecahedronAnim.chaos.noiseOffset) * noiseAmount;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(dodecahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * (0.1 + shapesState.chaosLevel * 0.1));
      
      // Set final position
      dodecahedronRef.current.position.set(
        dodecahedronAnim.position.x + moveX + moveToPlayer.x + noiseX,
        dodecahedronAnim.position.y + moveY + moveToPlayer.y + noiseY,
        dodecahedronAnim.position.z + moveZ + moveToPlayer.z + noiseZ
      );
      
      // Fading with player influence and chaos
      const chaosOpacity = 0.6 + Math.sin(time * 4 * (1 + shapesState.chaosLevel)) * shapesState.chaosLevel * 0.4;
      const baseOpacity = Math.sin(time * dodecahedronAnim.fadeSpeed + dodecahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5 + chaosOpacity);
      material.uniforms.intensity.value = Math.min(1.8, playerAdjustedOpacity);
      
      // Update colors in material based on animation state
      material.uniforms.baseColor.value.copy(dodecahedronAnim.baseColor);
      material.uniforms.glowColor.value.copy(dodecahedronAnim.glowColor);
      material.uniforms.reactColor.value.copy(dodecahedronAnim.reactColor);
    }
    
    // Animate icosahedron with similar but different chaotic behavior
    if (icosahedronRef.current) {
      const material = icosahedronRef.current.material as THREE.ShaderMaterial;
      
      // Update shader time and player position
      material.uniforms.time.value = time;
      material.uniforms.playerPosition.value.copy(playerPos);
      material.uniforms.chaosLevel.value = shapesState.chaosLevel;
      
      // Update distortion amount
      material.uniforms.distortionAmount.value = icosahedronAnim.chaos.distortionAmount;
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(icosahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Apply scale changes
      icosahedronRef.current.scale.set(
        icosahedronAnim.chaos.scale,
        icosahedronAnim.chaos.scale,
        icosahedronAnim.chaos.scale
      );
      
      // Adjust rotation speed based on player proximity and chaos
      const baseSpeed = icosahedronAnim.rotationSpeed;
      const speedMultiplier = (1 + reactionStrength * 2) * icosahedronAnim.chaos.rotationMultiplier;
      
      // Apply more varied rotation
      icosahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15;
      icosahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15 * (1 + Math.sin(time) * shapesState.chaosLevel * 0.5);
      icosahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15;
      
      // Chaotic rotation bursts
      if (shapesState.chaosLevel > 0.5 && Math.random() > 0.95) {
        const burstAmount = (Math.random() - 0.5) * shapesState.chaosLevel * 0.3;
        icosahedronRef.current.rotation.x += burstAmount;
        icosahedronRef.current.rotation.z += burstAmount;
      }
      
      // Enhanced chaotic movement with different frequency
      const chaosTime = time * (1 + shapesState.chaosLevel * 1.2);
      const chaosAmplitude = 0.5 + shapesState.chaosLevel;
      
      const moveX = Math.sin(chaosTime * 0.7 + icosahedronAnim.movementPhase) * 
                    icosahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveY = Math.cos(chaosTime * 0.4 + icosahedronAnim.movementPhase) * 
                    icosahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveZ = Math.sin(chaosTime * 0.5 + icosahedronAnim.movementPhase) * 
                    icosahedronAnim.moveRadius * chaosAmplitude;
      
      // Add chaotic noise movement
      const noiseAmount = shapesState.chaosLevel * 0.8;
      const noiseX = noise(time * 0.8 + icosahedronAnim.chaos.noiseOffset, time * 0.5, time * 0.7) * noiseAmount;
      const noiseY = noise(time * 0.5, time * 0.8 + icosahedronAnim.chaos.noiseOffset, time * 0.6) * noiseAmount;
      const noiseZ = noise(time * 0.6, time * 0.7, time * 0.8 + icosahedronAnim.chaos.noiseOffset) * noiseAmount;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(icosahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * (0.1 + shapesState.chaosLevel * 0.1));
      
      // Set final position
      icosahedronRef.current.position.set(
        icosahedronAnim.position.x + moveX + moveToPlayer.x + noiseX,
        icosahedronAnim.position.y + moveY + moveToPlayer.y + noiseY,
        icosahedronAnim.position.z + moveZ + moveToPlayer.z + noiseZ
      );
      
      // Fading with player influence and chaos
      const chaosOpacity = 0.6 + Math.sin(time * 5 * (1 + shapesState.chaosLevel)) * shapesState.chaosLevel * 0.4;
      const baseOpacity = Math.sin(time * icosahedronAnim.fadeSpeed + icosahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5 + chaosOpacity);
      material.uniforms.intensity.value = Math.min(1.8, playerAdjustedOpacity);
      
      // Update colors in material based on animation state
      material.uniforms.baseColor.value.copy(icosahedronAnim.baseColor);
      material.uniforms.glowColor.value.copy(icosahedronAnim.glowColor);
      material.uniforms.reactColor.value.copy(icosahedronAnim.reactColor);
    }
    
    // Animate tetrahedron with similar player-reactive and chaotic behavior
    if (tetrahedronRef.current) {
      const material = tetrahedronRef.current.material as THREE.ShaderMaterial;
      
      // Update shader time and player position
      material.uniforms.time.value = time;
      material.uniforms.playerPosition.value.copy(playerPos);
      material.uniforms.chaosLevel.value = shapesState.chaosLevel;
      
      // Update distortion amount
      material.uniforms.distortionAmount.value = tetrahedronAnim.chaos.distortionAmount;
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(tetrahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Apply scale changes
      tetrahedronRef.current.scale.set(
        tetrahedronAnim.chaos.scale,
        tetrahedronAnim.chaos.scale,
        tetrahedronAnim.chaos.scale
      );
      
      // Adjust rotation speed based on player proximity and chaos
      const baseSpeed = tetrahedronAnim.rotationSpeed;
      const speedMultiplier = (1 + reactionStrength * 2) * tetrahedronAnim.chaos.rotationMultiplier;
      
      // Apply more erratic rotation for tetrahedron
      tetrahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15 * (1 + Math.cos(time * 2) * shapesState.chaosLevel * 0.5);
      tetrahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15;
      tetrahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15 * (1 - Math.sin(time * 3) * shapesState.chaosLevel * 0.5);
      
      // Chaotic rotation bursts
      if (shapesState.chaosLevel > 0.4 && Math.random() > 0.93) {
        const burstAmount = (Math.random() - 0.5) * shapesState.chaosLevel * 0.4;
        tetrahedronRef.current.rotation.y += burstAmount;
        tetrahedronRef.current.rotation.z -= burstAmount * 0.7;
      }
      
      // Enhanced chaotic movement with unique pattern
      const chaosTime = time * (1 + shapesState.chaosLevel * 1.5);
      const chaosAmplitude = 0.5 + shapesState.chaosLevel * 1.2;
      
      const moveX = Math.sin(chaosTime * 0.6 + tetrahedronAnim.movementPhase) * 
                    tetrahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveY = Math.cos(chaosTime * 0.5 + tetrahedronAnim.movementPhase) * 
                    tetrahedronAnim.moveRadius * chaosAmplitude;
                    
      const moveZ = Math.sin(chaosTime * 0.7 + tetrahedronAnim.movementPhase) * 
                    tetrahedronAnim.moveRadius * chaosAmplitude;
      
      // Add more dramatic chaotic noise movement
      const noiseAmount = shapesState.chaosLevel * 0.9;
      const noiseX = noise(time * 0.6 + tetrahedronAnim.chaos.noiseOffset, time * 0.9, time * 0.4) * noiseAmount;
      const noiseY = noise(time * 0.4, time * 0.6 + tetrahedronAnim.chaos.noiseOffset, time * 0.9) * noiseAmount;
      const noiseZ = noise(time * 0.9, time * 0.4, time * 0.6 + tetrahedronAnim.chaos.noiseOffset) * noiseAmount;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(tetrahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * (0.1 + shapesState.chaosLevel * 0.15));
      
      // Set final position with more dramatic movement
      tetrahedronRef.current.position.set(
        tetrahedronAnim.position.x + moveX + moveToPlayer.x + noiseX,
        tetrahedronAnim.position.y + moveY + moveToPlayer.y + noiseY,
        tetrahedronAnim.position.z + moveZ + moveToPlayer.z + noiseZ
      );
      
      // Fading with player influence and more dramatic chaos effects
      const chaosOpacity = 0.6 + Math.cos(time * 6 * (1 + shapesState.chaosLevel)) * shapesState.chaosLevel * 0.5;
      const baseOpacity = Math.sin(time * tetrahedronAnim.fadeSpeed + tetrahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5 + chaosOpacity);
      material.uniforms.intensity.value = Math.min(2.0, playerAdjustedOpacity);
      
      // Update colors in material based on animation state
      material.uniforms.baseColor.value.copy(tetrahedronAnim.baseColor);
      material.uniforms.glowColor.value.copy(tetrahedronAnim.glowColor);
      material.uniforms.reactColor.value.copy(tetrahedronAnim.reactColor);
    }
  });

  return (
    <group>
      {/* Dodecahedron */}
      <lineSegments ref={dodecahedronRef}>
        <dodecahedronGeometry args={[1, 0]} />
        <primitive object={dodecaMaterial} attach="material" />
      </lineSegments>
      
      {/* Icosahedron */}
      <lineSegments ref={icosahedronRef}>
        <icosahedronGeometry args={[1, 0]} />
        <primitive object={icosaMaterial} attach="material" />
      </lineSegments>
      
      {/* Tetrahedron */}
      <lineSegments ref={tetrahedronRef}>
        <primitive object={createTetrahedron} attach="geometry" />
        <primitive object={tetraMaterial} attach="material" />
      </lineSegments>
    </group>
  );
} 