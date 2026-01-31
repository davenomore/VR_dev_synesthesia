import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import usePostprocessing from './usePostprocessing'
import Background from './Background'
import Hero from './Hero'

function Scene() {
  usePostprocessing();

  return (
    <>
      <Hero />
      <Background />
      <OrbitControls />
    </>
  )
}

export default function App() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], near: 0.1, far: 30, fov: 75 }}
      gl={{
        powerPreference: "high-performance",
        antialias: false,
        stencil: false,
        alpha: false,
      }}
      shadows
    >
      <Scene />
    </Canvas>
  )
}
