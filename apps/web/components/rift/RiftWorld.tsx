"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { buildRealRiftTextures, type RealRiftTextures } from "./realRiftTextures";
import { useTargetPose, lerpPose, type Pose } from "./riftStore";
import type { PerfTier } from "./usePerfTier";
import type { RiftPalette } from "../theme/themes";

/**
 * The persistent Rift world. A real, displaced 3D terrain of an original stylized
 * Summoner's Rift, lit by warm Hextech light with a cool river at depth, drifting
 * fog and gold motes, selective bloom for the glow, and a camera that damps toward
 * each route's pose with a subtle pointer parallax. This IS the stage — every
 * surface of the app sits inside it.
 */
export function RiftWorld({ tier, palette }: { tier: Exclude<PerfTier, "static">; palette: RiftPalette }) {
  const full = tier === "full";
  const day = !!palette.daylight;
  const [tex, setTex] = useState<RealRiftTextures | null>(null);
  useEffect(() => {
    let active = true;
    buildRealRiftTextures()
      .then((t) => active && setTex(t))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <Canvas
      gl={{ antialias: full, powerPreference: "high-performance" }}
      dpr={full ? [1, 1.8] : [1, 1.4]}
      camera={{ position: [0, 13.5, 15.5], fov: 40, near: 0.1, far: 80 }}
      onCreated={({ scene, gl }) => {
        scene.fog = new THREE.Fog(new THREE.Color(palette.fog), day ? 30 : 26, day ? 66 : 60);
        gl.setClearColor(new THREE.Color(palette.clear), 1);
      }}
    >
      <CameraRig />
      <Lights palette={palette} day={day} />
      {/* Real SR minimap (Data Dragon) draped on gentle 3D relief, with structures. */}
      <group rotation={[0, Math.PI / 4, 0]}>
        {tex && <Terrain tex={tex} segments={full ? 256 : 140} day={day} />}
        {tex && <Structures palette={palette} />}
        <Objectives />
        <Pings count={full ? 9 : 6} />
      </group>
      <Motes count={full ? 200 : 80} color={palette.mote} />
      <Fog count={full ? 6 : 3} color={palette.fog} />
      <EffectComposer>
        <Bloom intensity={day ? 0.45 : full ? 0.8 : 0.7} luminanceThreshold={day ? 0.5 : 0.32} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.2} darkness={day ? 0.4 : 0.82} />
      </EffectComposer>
    </Canvas>
  );
}

/** Damps the camera toward the active route pose + a small pointer parallax. */
function CameraRig() {
  const target = useTargetPose();
  const { camera, pointer } = useThree();
  const cur = useRef<Pose>(target);
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 1.6); // damp factor
    cur.current = lerpPose(cur.current, target, k);
    const c = cur.current;
    // pointer parallax — a couple of degrees of offset toward the cursor
    const ox = pointer.x * 0.9;
    const oy = pointer.y * 0.5;
    camera.position.set(c.px + ox, c.py + oy, c.pz);
    lookAt.current.set(c.tx, c.ty, c.tz);
    camera.lookAt(lookAt.current);
    const persp = camera as THREE.PerspectiveCamera;
    if (Math.abs(persp.fov - c.fov) > 0.01) {
      persp.fov += (c.fov - persp.fov) * k;
      persp.updateProjectionMatrix();
    }
  });
  return null;
}

function Lights({ palette, day }: { palette: RiftPalette; day: boolean }) {
  return (
    <>
      <ambientLight intensity={day ? 0.8 : 0.85} color={palette.ambient} />
      {/* key light raking across the ridges → reveals the terrain + casts relief */}
      <directionalLight position={[12, day ? 13 : 11, 7]} intensity={day ? 1.7 : 2.8} color={palette.key} />
      {/* blue-side glow */}
      <pointLight position={[-9, 3.5, 9]} intensity={day ? 18 : 55} distance={40} color={palette.sideA} />
      {/* red-side glow from depth */}
      <pointLight position={[9, 3.5, -11]} intensity={day ? 16 : 50} distance={40} color={palette.sideB} />
    </>
  );
}

/** Terrain = Riot's official SR minimap, turned into real 3D terrain: the minimap
 * is the colour, with a NORMAL MAP + heightmap derived from it so the lighting
 * catches every wall/lane/structure (genuine relief) and the silhouette displaces. */
function Terrain({ tex, segments, day }: { tex: RealRiftTextures; segments: number; day: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[26, 26, segments, segments]} />
      <meshStandardMaterial
        map={tex.color}
        emissiveMap={tex.color}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={day ? 0.16 : 0.42}
        normalMap={tex.normal}
        normalScale={new THREE.Vector2(1.4, 1.4)}
        displacementMap={tex.height}
        displacementScale={0.5}
        displacementBias={0}
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  );
}

/** Stylized turret — stone base + shaft + cap + a glowing team-coloured crystal. */
function Turret({ color }: { color: string }) {
  const stone = "#2a2a32";
  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.46, 0.56, 0.36, 8]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.24, 0.36, 1.5, 8]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.12, 8]} />
        <meshStandardMaterial color={"#11131a"} emissive={new THREE.Color(color)} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 2.08, 0]}>
        <coneGeometry args={[0.32, 0.34, 8]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.2]} />
        <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Inhibitor — a medium glowing crystal on a low plinth. */
function Inhibitor({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.24, 6]} />
        <meshStandardMaterial color={"#2a2a32"} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Nexus — a tall structure with a big crystal that blooms hard. */
function Nexus({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 0.36, 6]} />
        <meshStandardMaterial color={"#23232b"} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.42, 0.6, 0.36, 6]} />
        <meshStandardMaterial color={"#2c2c36"} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.62]} />
        <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Minimap pixel (512px map11) → terrain XZ on the 26-wide plane.
function toMap(px: number, py: number): [number, number] {
  return [(px / 512 - 0.5) * 26, (py / 512 - 0.5) * 26];
}
const mirror = ([x, y]: [number, number]): [number, number] => [512 - x, 512 - y];

// Blue-side structures from the canonical Summoner's Rift game coordinates, mapped
// onto map11's 512px space: px = gx/14870*512, py = 512 - gy/14980*512. Red side is
// the 180° mirror. These are the real turret/inhib/nexus positions, not eyeballed.
const BLUE_TURRETS: [number, number][] = [
  [34, 155], [52, 283], [40, 366], // top lane: outer, inner, inhib
  [201, 293], [174, 348], [126, 386], // mid lane: outer, inner, inhib
  [362, 477], [238, 461], [147, 469], // bot lane: outer, inner, inhib
  [60, 434], [75, 450], // nexus turrets (flank the nexus)
];
const BLUE_INHIBS: [number, number][] = [
  [40, 390], // top
  [110, 402], // mid
  [119, 470], // bot
];
const BLUE_NEXUS: [number, number] = [60, 450];

function Structures({ palette }: { palette: RiftPalette }) {
  const blue = palette.sideA, red = palette.sideB;
  const toS = (p: [number, number]): [number, number] => toMap(p[0], p[1]);
  const turrets = [
    ...BLUE_TURRETS.map((p) => ({ p, c: blue })),
    ...BLUE_TURRETS.map((p) => ({ p: mirror(p), c: red })),
  ];
  const inhibs = [
    ...BLUE_INHIBS.map((p) => ({ p, c: blue })),
    ...BLUE_INHIBS.map((p) => ({ p: mirror(p), c: red })),
  ];
  const nexuses = [{ p: BLUE_NEXUS, c: blue }, { p: mirror(BLUE_NEXUS), c: red }];
  return (
    <group>
      {turrets.map(({ p, c }, i) => {
        const [x, z] = toS(p);
        return (
          <group key={`t${i}`} position={[x, -0.08, z]} scale={0.42}>
            <Turret color={c} />
          </group>
        );
      })}
      {inhibs.map(({ p, c }, i) => {
        const [x, z] = toS(p);
        return (
          <group key={`i${i}`} position={[x, -0.04, z]} scale={0.46}>
            <Inhibitor color={c} />
          </group>
        );
      })}
      {nexuses.map(({ p, c }, i) => {
        const [x, z] = toS(p);
        return (
          <group key={`n${i}`} position={[x, 0, z]} scale={0.62}>
            <Nexus color={c} />
          </group>
        );
      })}
    </group>
  );
}

/** Baron (top river) and Drake (bottom river) pits, each marked with a shining light shaft
 * shooting up out of the Rift — purple for Baron, white/grey for Drake. Positions are the
 * real SR game coordinates mapped onto map11's 512px space. */
const PITS: { p: [number, number]; beam: string; core: string }[] = [
  { p: [172, 154], beam: "#8a3dff", core: "#c79bff" }, // Baron — purple
  { p: [340, 361], beam: "#c8d4e2", core: "#ffffff" }, // Drake — white/grey
];

function Objectives() {
  return (
    <group>
      {PITS.map((pit, i) => {
        const [x, z] = toMap(pit.p[0], pit.p[1]);
        return <Beacon key={i} position={[x, 0, z]} beam={pit.beam} core={pit.core} seed={i * 3.1} />;
      })}
    </group>
  );
}

/** A glowing vertical light shaft (two additive cylinders + a ground glow) that pulses and
 * slowly rotates — the "shining light shooting out" of an objective pit. */
function Beacon({ position, beam, core, seed }: { position: [number, number, number]; beam: string; core: string; seed: number }) {
  const tex = useMemo(() => beamTexture(), []);
  const glowTex = useMemo(() => softSprite(core), [core]);
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const H = 11;
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    const pulse = 0.7 + Math.sin(t * 1.8) * 0.3;
    if (outerRef.current) {
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.42 * pulse;
      outerRef.current.rotation.y = t * 0.35;
    }
    if (coreRef.current) {
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * pulse;
      coreRef.current.rotation.y = -t * 0.5;
    }
    if (glowRef.current) {
      const s = 2.2 + Math.sin(t * 1.8) * 0.35;
      glowRef.current.scale.set(s, s, s);
      (glowRef.current.material as THREE.SpriteMaterial).opacity = 0.85 * pulse;
    }
  });
  return (
    <group position={position}>
      {/* ground glow at the pit */}
      <sprite ref={glowRef} position={[0, 0.18, 0]} scale={2.2}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* outer halo shaft */}
      <mesh ref={outerRef} position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.62, 0.36, H, 26, 1, true]} />
        <meshBasicMaterial map={tex} color={beam} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* bright inner core shaft */}
      <mesh ref={coreRef} position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.13, H, 18, 1, true]} />
        <meshBasicMaterial map={tex} color={core} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Vertical beam gradient — bright at the base, fading to nothing at the top. */
function beamTexture(): THREE.Texture {
  const w = 8, h = 160;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, h, 0, 0); // bottom → top
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(0.75, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** League's "?" ping, for fun: Riot's OFFICIAL ping art — the gold "?" icon from the
 * off-screen ping atlas and the official yellow pulse-ring — popping in at random spots
 * around the Rift, bobbing, pulsing the ring, then fading and relocating. Both assets are
 * bundled in /public/rift (CommunityDragon → Riot game assets), nothing hand-drawn. */
function Pings({ count }: { count: number }) {
  const qTex = useMemo(() => {
    const t = new THREE.TextureLoader().load("/rift/ping-question.png");
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const ringTex = useMemo(() => {
    const t = new THREE.TextureLoader().load("/rift/ping-ring.png");
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const groupRefs = useRef<THREE.Group[]>([]);
  const markRefs = useRef<THREE.Sprite[]>([]);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const rndSpot = (): [number, number] => toMap(60 + Math.random() * 392, 60 + Math.random() * 392);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const [x, z] = rndSpot();
        return { x, z, phase: Math.random() * 6, period: 2.6 + Math.random() * 1.8, prev: 0 };
      }),
    [count],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    data.forEach((d, i) => {
      const cyc = ((t + d.phase) % d.period) / d.period; // 0..1 ping lifecycle
      if (cyc < d.prev) {
        // wrapped → relocate to a fresh random spot
        const [x, z] = rndSpot();
        d.x = x; d.z = z;
        groupRefs.current[i]?.position.set(x, 0, z);
      }
      d.prev = cyc;
      const pop = cyc < 0.16 ? 1 - (1 - cyc / 0.16) ** 2 : 1; // spring in (ease-out)
      const fade = cyc > 0.85 ? (1 - cyc) / 0.15 : 1;
      const bob = Math.sin((t + d.phase) * 3.4) * 0.1;
      const m = markRefs.current[i];
      if (m) {
        m.position.y = 1.1 + bob;
        const h = 1.6 * pop; // keep the icon's 41:56 aspect ratio
        m.scale.set(h * (41 / 56), h, 1);
        (m.material as THREE.SpriteMaterial).opacity = fade;
      }
      const r = ringRefs.current[i];
      if (r) {
        // the official pulse-ring snaps in, then expands outward and fades
        const e = Math.min(1, cyc / 0.6);
        const sc = 0.8 + e * 1.3;
        r.scale.set(sc, sc, sc);
        (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - e) * pop);
      }
    });
  });

  return (
    <group>
      {data.map((d, i) => (
        <group key={i} ref={(el) => { if (el) groupRefs.current[i] = el; }} position={[d.x, 0, d.z]}>
          <sprite ref={(el) => { if (el) markRefs.current[i] = el; }} position={[0, 1.1, 0]} scale={[1.17, 1.6, 1]} renderOrder={12}>
            <spriteMaterial map={qTex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </sprite>
          <mesh ref={(el) => { if (el) ringRefs.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} renderOrder={10}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshBasicMaterial map={ringTex} transparent opacity={0.9} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Gold fireflies / motes drifting up over the Rift — additive points, the bloom sparkle. */
function Motes({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => softSprite(color), [color]);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 6 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 26;
      speeds[i] = 0.15 + Math.random() * 0.4;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i]! * dt;
      arr[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.08;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = 0.1;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} map={sprite} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

/** Cool low-lying haze drifting across the Rift floor. */
function Fog({ count, color }: { count: number; color: string }) {
  const sprite = useMemo(() => softSprite(color), [color]);
  const refs = useRef<THREE.Sprite[]>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 22,
        z: (Math.random() - 0.5) * 22,
        y: 0.6 + Math.random() * 1.4,
        scale: 9 + Math.random() * 7,
        speed: 0.04 + Math.random() * 0.06,
        phase: i,
      })),
    [count],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((s, i) => {
      if (!s) return;
      s.position.x = seeds[i]!.x + Math.sin(t * seeds[i]!.speed + seeds[i]!.phase) * 3;
    });
  });
  return (
    <>
      {seeds.map((s, i) => (
        <sprite
          key={i}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
          position={[s.x, s.y, s.z]}
          scale={[s.scale, s.scale * 0.6, 1]}
        >
          <spriteMaterial map={sprite} color={color} transparent opacity={0.14} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

function softSprite(color: string): THREE.Texture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}
