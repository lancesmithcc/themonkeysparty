import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export default function GeometricShapes() {
  // References for the shapes
  const dodecahedronRef = useRef<THREE.LineSegments>(null);
  const icosahedronRef = useRef<THREE.LineSegments>(null);
  const tetrahedronRef = useRef<THREE.LineSegments>(null);
  
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
  }), []);
  
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
      reactionStrength: { value: 0.0 }
    },
    vertexShader: `
      uniform float time;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        
        // Pass world position for distance calculations
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Slight pulsing effect
        vec3 pos = position;
        float pulseAmount = sin(time * 3.0) * 0.02;
        pos *= 1.0 + pulseAmount;
        
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
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        // Basic edge glow - stronger at edges
        float viewAngle = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float edgeGlow = pow(viewAngle, 1.5); // Less falloff for more visible lines
        
        // Enhanced pulsing effect
        float pulse = sin(time * 2.0) * 0.2 + 0.8;
        
        // Calculate distance to player
        float distToPlayer = length(vWorldPosition - playerPosition);
        float playerProximity = 1.0 - smoothstep(0.0, reactionRadius, distToPlayer);
        float playerEffect = playerProximity * reactionStrength;
        
        // Mix colors based on player proximity
        vec3 finalColor = mix(baseColor, glowColor, edgeGlow);
        finalColor = mix(finalColor, reactColor, playerEffect * pulse);
        
        // Increase base brightness and add time-varying effect
        float baseIntensity = intensity * (1.0 + playerEffect);
        float finalIntensity = baseIntensity * (0.7 + pulse * 0.5);
        
        // Add sparkle effect
        float sparkle = pow(sin(vPosition.x * 10.0 + time) * 
                           cos(vPosition.y * 10.0 + time) * 
                           sin(vPosition.z * 10.0 + time), 8.0) * playerEffect;
        
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
        reactionStrength: { value: 0.0 }
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
        reactionStrength: { value: 0.0 }
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
        reactionStrength: { value: 0.0 }
      },
      vertexShader: enhancedGlowShader.vertexShader,
      fragmentShader: enhancedGlowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return material;
  }, []);
  
  // Animation frame
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
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
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(dodecahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Adjust rotation speed based on player proximity
      const baseSpeed = dodecahedronAnim.rotationSpeed;
      const speedMultiplier = 1 + reactionStrength * 2;
      
      dodecahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15;
      dodecahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15;
      dodecahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15;
      
      // Floating movement
      const moveX = Math.sin(time * 0.5 + dodecahedronAnim.movementPhase) * dodecahedronAnim.moveRadius;
      const moveY = Math.cos(time * 0.3 + dodecahedronAnim.movementPhase) * dodecahedronAnim.moveRadius;
      const moveZ = Math.sin(time * 0.4 + dodecahedronAnim.movementPhase) * dodecahedronAnim.moveRadius;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(dodecahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * 0.1);
      
      dodecahedronRef.current.position.set(
        dodecahedronAnim.position.x + moveX + moveToPlayer.x,
        dodecahedronAnim.position.y + moveY + moveToPlayer.y,
        dodecahedronAnim.position.z + moveZ + moveToPlayer.z
      );
      
      // Fading with player influence
      const baseOpacity = Math.sin(time * dodecahedronAnim.fadeSpeed + dodecahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5);
      material.uniforms.intensity.value = Math.min(1.5, playerAdjustedOpacity);
    }
    
    // Animate icosahedron with similar player-reactive behavior
    if (icosahedronRef.current) {
      const material = icosahedronRef.current.material as THREE.ShaderMaterial;
      
      // Update shader time and player position
      material.uniforms.time.value = time;
      material.uniforms.playerPosition.value.copy(playerPos);
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(icosahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Adjust rotation speed based on player proximity
      const baseSpeed = icosahedronAnim.rotationSpeed;
      const speedMultiplier = 1 + reactionStrength * 2;
      
      icosahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15;
      icosahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15;
      icosahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15;
      
      // Floating movement
      const moveX = Math.sin(time * 0.4 + icosahedronAnim.movementPhase) * icosahedronAnim.moveRadius;
      const moveY = Math.cos(time * 0.5 + icosahedronAnim.movementPhase) * icosahedronAnim.moveRadius;
      const moveZ = Math.sin(time * 0.3 + icosahedronAnim.movementPhase) * icosahedronAnim.moveRadius;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(icosahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * 0.1);
      
      icosahedronRef.current.position.set(
        icosahedronAnim.position.x + moveX + moveToPlayer.x,
        icosahedronAnim.position.y + moveY + moveToPlayer.y,
        icosahedronAnim.position.z + moveZ + moveToPlayer.z
      );
      
      // Fading with player influence
      const baseOpacity = Math.sin(time * icosahedronAnim.fadeSpeed + icosahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5);
      material.uniforms.intensity.value = Math.min(1.5, playerAdjustedOpacity);
    }
    
    // Animate tetrahedron with similar player-reactive behavior
    if (tetrahedronRef.current) {
      const material = tetrahedronRef.current.material as THREE.ShaderMaterial;
      
      // Update shader time and player position
      material.uniforms.time.value = time;
      material.uniforms.playerPosition.value.copy(playerPos);
      
      // Calculate distance to player and reaction strength
      const distToPlayer = playerPos.distanceTo(tetrahedronRef.current.position);
      const reactionStrength = Math.max(0, 1 - distToPlayer / 3.5);
      material.uniforms.reactionStrength.value = reactionStrength;
      
      // Adjust rotation speed based on player proximity
      const baseSpeed = tetrahedronAnim.rotationSpeed;
      const speedMultiplier = 1 + reactionStrength * 2;
      
      tetrahedronRef.current.rotation.x += baseSpeed[0] * speedMultiplier * delta * 15;
      tetrahedronRef.current.rotation.y += baseSpeed[1] * speedMultiplier * delta * 15;
      tetrahedronRef.current.rotation.z += baseSpeed[2] * speedMultiplier * delta * 15;
      
      // Floating movement
      const moveX = Math.sin(time * 0.3 + tetrahedronAnim.movementPhase) * tetrahedronAnim.moveRadius;
      const moveY = Math.cos(time * 0.4 + tetrahedronAnim.movementPhase) * tetrahedronAnim.moveRadius;
      const moveZ = Math.sin(time * 0.5 + tetrahedronAnim.movementPhase) * tetrahedronAnim.moveRadius;
      
      // Add slight attraction toward player
      const toPlayer = new THREE.Vector3().copy(playerPos).sub(tetrahedronRef.current.position);
      const moveToPlayer = toPlayer.normalize().multiplyScalar(reactionStrength * 0.1);
      
      tetrahedronRef.current.position.set(
        tetrahedronAnim.position.x + moveX + moveToPlayer.x,
        tetrahedronAnim.position.y + moveY + moveToPlayer.y,
        tetrahedronAnim.position.z + moveZ + moveToPlayer.z
      );
      
      // Fading with player influence
      const baseOpacity = Math.sin(time * tetrahedronAnim.fadeSpeed + tetrahedronAnim.fadePhase) * 0.4 + 0.6;
      const playerAdjustedOpacity = baseOpacity * (1 + reactionStrength * 0.5);
      material.uniforms.intensity.value = Math.min(1.5, playerAdjustedOpacity);
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