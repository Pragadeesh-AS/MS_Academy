import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';

export default function Scene() {
  return (
    <div className="absolute inset-0 z-0 bg-white">
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <color attach="background" args={['#ffffff']} />
        
        {/* Dynamic Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" />
        
        <Suspense fallback={null}>
          <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={20} blur={2.5} far={4.5} color="#000000" />
          <Environment preset="city" />
        </Suspense>

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.5} />
      </Canvas>
    </div>
  );
}
