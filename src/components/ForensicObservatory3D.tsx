import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AnalysisResult } from '../types';
import { SAMPLE_ARTICLES } from '../data/samples';
import { soundFx } from '../utils/soundEffects';
import {
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Sliders,
  Camera,
  Sparkles,
  Layers,
  Code2,
  ArrowDownCircle,
} from 'lucide-react';

interface ForensicObservatory3DProps {
  result: AnalysisResult | null;
  activeSampleId: string;
  onQuickLoadSample: (sampleId: string) => void;
  onScrollToWorkbench: () => void;
  onOpenProjectCode: () => void;
}

export type CameraPreset = 'overview' | 'core' | 'lr' | 'nb' | 'pac' | 'top';
export type FinishPreset = 'titanium' | 'gold' | 'obsidian';

// Pre-allocated module-scope scratch objects (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

// Procedural CanvasTexture generator for precision azimuth dial & floor markings
function createPrecisionDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Concentric rings
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  [100, 150, 200, 238].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Degree ticks
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const rInner = isMajor ? 210 : 224;
    const rOuter = 236;
    ctx.strokeStyle = isMajor ? '#60A5FA' : '#334155';
    ctx.lineWidth = isMajor ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * rInner, cy + Math.sin(rad) * rInner);
    ctx.lineTo(cx + Math.cos(rad) * rOuter, cy + Math.sin(rad) * rOuter);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

// Procedural grayscale micro-relief bump/roughness map
function createBrushedBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 600; i++) {
    const y = Math.random() * 256;
    const shade = 110 + Math.floor(Math.random() * 36);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// Procedural radial contact shadow texture
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ForensicObservatory3D: React.FC<ForensicObservatory3DProps> = ({
  result,
  activeSampleId,
  onQuickLoadSample,
  onScrollToWorkbench,
  onOpenProjectCode,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Interactive HUD state
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [explodedPct, setExplodedPct] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [finishPreset, setFinishPreset] = useState<FinishPreset>('titanium');
  const [selectedPartLabel, setSelectedPartLabel] = useState<string>('Central Truth Gyroscope');
  const [isMuted, setIsMuted] = useState(false);
  const [simClickbaitOverride, setSimClickbaitOverride] = useState<number | null>(null);

  // Refs synced into the zero-allocation WebGL animation loop
  const resultRef = useRef<AnalysisResult | null>(result);
  const explodedRef = useRef<number>(0);
  const camPresetRef = useRef<CameraPreset>('overview');
  const finishRef = useRef<FinishPreset>('titanium');
  const simClickbaitRef = useRef<number | null>(null);
  const userOrbitingRef = useRef<boolean>(false);

  useEffect(() => {
    resultRef.current = result;
    setSimClickbaitOverride(null);
    simClickbaitRef.current = null;
  }, [result]);

  useEffect(() => {
    explodedRef.current = explodedPct / 100;
  }, [explodedPct]);

  useEffect(() => {
    camPresetRef.current = cameraPreset;
    userOrbitingRef.current = false;
  }, [cameraPreset]);

  useEffect(() => {
    finishRef.current = finishPreset;
  }, [finishPreset]);

  useEffect(() => {
    simClickbaitRef.current = simClickbaitOverride;
  }, [simClickbaitOverride]);

  // Keyboard shortcut 'H' to collapse/expand bottom dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Initialize Three.js Scene Once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 2. Scene, Fog & RoomEnvironment
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x080c14);
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(0x080c14, 0.024);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(0, 6.2, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 4.2;
    controls.maxDistance = 26;
    controls.target.set(0, 2.2, 0);

    controls.addEventListener('start', () => {
      userOrbitingRef.current = true;
    });

    // 4. Balanced 3-Point Studio Lighting Rig (warm key + cool hemisphere fill + rim)
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.4);
    keyLight.position.set(8, 14, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 35;
    const d = 10;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.3);
    rimLight.position.set(-9, 8, -10);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0x10b981, 3.0, 14);
    corePointLight.position.set(0, 2.8, 0);
    scene.add(corePointLight);

    // 5. Procedural Textures & Shared Materials
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const dialTex = createPrecisionDialTexture(maxAniso);
    const bumpTex = createBrushedBumpTexture();
    const shadowTex = createContactShadowTexture();

    const primaryMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.88,
      roughness: 0.24,
      bumpMap: bumpTex,
      bumpScale: 0.015,
    });

    const secondaryAccentMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.16,
    });

    const matteSlateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.35,
      roughness: 0.68,
    });

    const dialMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: dialTex,
      metalness: 0.5,
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
      metalness: 0.1,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.88 : 1.0,
      ior: 1.65,
      thickness: 1.2,
    });

    const thermalRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.25,
    });

    // 6. Laboratory Floor & Contact Shadows (disjoint Y offsets >= 0.02 to prevent Z-fighting)
    const floorGeo = new THREE.CircleGeometry(28, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b111e,
      roughness: 0.82,
      metalness: 0.2,
      bumpMap: bumpTex,
      bumpScale: 0.01,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const gridHelper = new THREE.PolarGridHelper(16, 16, 8, 64, 0x1e293b, 0x1e293b);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    const contactShadowGeo = new THREE.CircleGeometry(2.6, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const centerShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    centerShadow.rotation.x = -Math.PI / 2;
    centerShadow.position.y = 0.025;
    scene.add(centerShadow);

    // 7. HERO SUBJECT: 10-Part Composite Central Truth Gyroscope (THREE.Group pivoted at y = 0)
    const centralGroup = new THREE.Group();
    centralGroup.position.set(0, 0, 0);
    scene.add(centralGroup);

    const interactables: THREE.Object3D[] = [];

    // Part 1: Stepped Lathe Pedestal Base
    const lathePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(2.1, 0),
      new THREE.Vector2(1.95, 0.22),
      new THREE.Vector2(1.65, 0.28),
      new THREE.Vector2(1.5, 0.55),
      new THREE.Vector2(1.2, 0.65),
      new THREE.Vector2(1.15, 0.85),
      new THREE.Vector2(0, 0.85),
    ];
    const pedestalGeo = new THREE.LatheGeometry(lathePoints, 32);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, primaryMetalMat);
    pedestalMesh.castShadow = !isSoftwareGl;
    pedestalMesh.receiveShadow = !isSoftwareGl;
    pedestalMesh.userData = { partName: 'Central Truth Gyroscope — Pedestal Base', preset: 'core' };
    centralGroup.add(pedestalMesh);
    interactables.push(pedestalMesh);

    // Part 2: Azimuth Calibration Dial Plate
    const dialGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.08, 36);
    const dialMesh = new THREE.Mesh(dialGeo, [primaryMetalMat, dialMat, primaryMetalMat]);
    dialMesh.position.y = 0.9;
    dialMesh.userData = { partName: 'Azimuth Calibration Dial Ring', preset: 'core' };
    centralGroup.add(dialMesh);

    // Part 3: Beveled Support Yoke Arms (ExtrudeGeometry)
    const yokeShape = new THREE.Shape();
    yokeShape.moveTo(-1.85, 0);
    yokeShape.lineTo(-1.55, 0);
    yokeShape.lineTo(-1.55, 1.9);
    yokeShape.lineTo(1.55, 1.9);
    yokeShape.lineTo(1.55, 0);
    yokeShape.lineTo(1.85, 0);
    yokeShape.lineTo(1.85, 2.2);
    yokeShape.lineTo(-1.85, 2.2);
    yokeShape.closePath();

    const yokeGeo = new THREE.ExtrudeGeometry(yokeShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    yokeGeo.center();
    const yokeMesh = new THREE.Mesh(yokeGeo, matteSlateMat);
    yokeMesh.position.y = 1.95;
    yokeMesh.castShadow = !isSoftwareGl;
    yokeMesh.userData = { partName: 'Gimbal Support Yoke Assembly', preset: 'core' };
    centralGroup.add(yokeMesh);
    interactables.push(yokeMesh);

    // Part 4: Outer Credibility Gimbal Ring
    const outerGimbalGeo = new THREE.TorusGeometry(1.52, 0.085, 16, 48);
    const outerGimbalMesh = new THREE.Mesh(outerGimbalGeo, secondaryAccentMat);
    outerGimbalMesh.position.y = 2.85;
    outerGimbalMesh.castShadow = !isSoftwareGl;
    outerGimbalMesh.userData = { partName: 'Outer Credibility Gimbal Ring', preset: 'core' };
    centralGroup.add(outerGimbalMesh);

    // Part 5: Middle Subjectivity Gimbal Ring
    const midGimbalGeo = new THREE.TorusGeometry(1.22, 0.07, 16, 48);
    const midGimbalMesh = new THREE.Mesh(midGimbalGeo, primaryMetalMat);
    midGimbalMesh.position.y = 2.85;
    midGimbalMesh.userData = { partName: 'Subjectivity & Polarity Gimbal', preset: 'core' };
    centralGroup.add(midGimbalMesh);

    // Part 6: Inner Clickbait Thermal Ring
    const innerRingGeo = new THREE.TorusGeometry(0.94, 0.055, 16, 40);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, thermalRingMat);
    innerRingMesh.position.y = 2.85;
    innerRingMesh.userData = { partName: 'Clickbait Thermal Risk Ring', preset: 'core' };
    centralGroup.add(innerRingMesh);

    // Part 7: Lower Optical Collimator Cone
    const lowerConeGeo = new THREE.ConeGeometry(0.58, 0.55, 24);
    const lowerConeMesh = new THREE.Mesh(lowerConeGeo, matteSlateMat);
    lowerConeMesh.position.y = 1.45;
    centralGroup.add(lowerConeMesh);

    // Part 8: Upper Crown Housing
    const upperCrownGeo = new THREE.ConeGeometry(0.58, 0.55, 24);
    upperCrownGeo.rotateX(Math.PI);
    const upperCrownMesh = new THREE.Mesh(upperCrownGeo, secondaryAccentMat);
    upperCrownMesh.position.y = 4.25;
    centralGroup.add(upperCrownMesh);

    // Part 9: Central Faceted Truth Crystal Core + Outer Wire Cage
    const crystalCoreGeo = new THREE.IcosahedronGeometry(0.56, 1);
    const crystalCoreMesh = new THREE.Mesh(crystalCoreGeo, coreCrystalMat);
    crystalCoreMesh.position.y = 2.85;
    crystalCoreMesh.userData = { partName: 'Central Forensic Truth Crystal Core', preset: 'core' };
    centralGroup.add(crystalCoreMesh);
    interactables.push(crystalCoreMesh);

    const cageGeo = new THREE.OctahedronGeometry(0.72, 0);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
      wireframe: true,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    cageMesh.position.y = 2.85;
    centralGroup.add(cageMesh);

    // Part 10: Crown Telemetry Spire
    const spireGeo = new THREE.CylinderGeometry(0.06, 0.18, 0.9, 16);
    const spireMesh = new THREE.Mesh(spireGeo, secondaryAccentMat);
    spireMesh.position.y = 4.85;
    centralGroup.add(spireMesh);

    // 8. THREE ENSEMBLE CLASSIFIER SATELLITE TOWERS (Symmetrical triptych framing the core)
    const towerSpecs: Array<{
      name: string;
      preset: CameraPreset;
      angle: number;
    }> = [
      { name: 'Logistic Regression (TF-IDF) Classifier Tower', preset: 'lr', angle: Math.PI * 0.12 },
      { name: 'Multinomial Naive Bayes Classifier Tower', preset: 'nb', angle: Math.PI * 0.88 },
      { name: 'Passive Aggressive Classifier Tower', preset: 'pac', angle: -Math.PI * 0.5 },
    ];

    const towerRadius = 5.4;
    const towerRefs: Array<{
      group: THREE.Group;
      beaconMat: THREE.MeshStandardMaterial;
      conduitMat: THREE.MeshStandardMaterial;
      haloMesh: THREE.Mesh;
      sleeveMesh: THREE.Mesh;
      baseAngle: number;
    }> = [];

    const plinthGeo = new THREE.CylinderGeometry(0.95, 1.15, 0.4, 6);
    const colGeo = new THREE.CylinderGeometry(0.42, 0.5, 2.2, 16);
    const sleeveGeo = new THREE.CylinderGeometry(0.52, 0.52, 1.4, 16);
    const haloGeo = new THREE.TorusGeometry(0.78, 0.05, 12, 32);
    const beaconGeo = new THREE.OctahedronGeometry(0.36, 0);

    towerSpecs.forEach((spec) => {
      const tx = Math.cos(spec.angle) * towerRadius;
      const tz = Math.sin(spec.angle) * towerRadius;

      const tGroup = new THREE.Group();
      tGroup.position.set(tx, 0, tz);
      scene.add(tGroup);

      // Contact shadow beneath each tower
      const tShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
      tShadow.scale.setScalar(0.65);
      tShadow.rotation.x = -Math.PI / 2;
      tShadow.position.set(tx, 0.025, tz);
      scene.add(tShadow);

      // 1. Hexagonal Plinth
      const plinth = new THREE.Mesh(plinthGeo, matteSlateMat);
      plinth.position.y = 0.2;
      plinth.castShadow = !isSoftwareGl;
      plinth.receiveShadow = !isSoftwareGl;
      plinth.userData = { partName: spec.name, preset: spec.preset };
      tGroup.add(plinth);
      interactables.push(plinth);

      // 2. Column
      const col = new THREE.Mesh(colGeo, primaryMetalMat);
      col.position.y = 1.5;
      col.castShadow = !isSoftwareGl;
      col.userData = { partName: spec.name, preset: spec.preset };
      tGroup.add(col);
      interactables.push(col);

      // 3. Probability Level Sleeve
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.2,
      });

      const sleeve = new THREE.Mesh(sleeveGeo, beaconMat);
      sleeve.position.y = 1.5;
      sleeve.userData = { partName: spec.name, preset: spec.preset };
      tGroup.add(sleeve);

      // 4. Rotating Telemetry Halo
      const halo = new THREE.Mesh(haloGeo, secondaryAccentMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 2.75;
      tGroup.add(halo);

      // 5. Verdict Beacon Emitter
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 3.15;
      beacon.userData = { partName: spec.name, preset: spec.preset };
      tGroup.add(beacon);
      interactables.push(beacon);

      // 6. TubeGeometry Energy Conduit connecting tower to Central Gyroscope
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(tx, 2.7, tz),
        new THREE.Vector3(tx * 0.55, 1.4, tz * 0.55),
        new THREE.Vector3(0, 2.5, 0),
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.055, 8, false);
      const conduitMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.5,
      });
      const conduitMesh = new THREE.Mesh(tubeGeo, conduitMat);
      scene.add(conduitMesh);

      towerRefs.push({
        group: tGroup,
        beaconMat,
        conduitMat,
        haloMesh: halo,
        sleeveMesh: sleeve,
        baseAngle: spec.angle,
      });
    });

    // 9. INSTANCED MESHES (> 20 items):
    // 9A. 48 Orbiting Linguistic Token Nodes
    const TOKEN_COUNT = 48;
    const tokenNodeGeo = new THREE.OctahedronGeometry(0.15, 0);
    const tokenNodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.75,
    });
    const tokenInstanced = new THREE.InstancedMesh(tokenNodeGeo, tokenNodeMat, TOKEN_COUNT);
    tokenInstanced.frustumCulled = false;

    const tokenOrbits = Array.from({ length: TOKEN_COUNT }, (_, i) => ({
      radius: 2.3 + (i % 5) * 0.65,
      speed: (0.35 + (i % 7) * 0.08) * (i % 2 === 0 ? 1 : -1),
      phase: (i / TOKEN_COUNT) * Math.PI * 2,
      yBase: 1.4 + (i % 6) * 0.52,
      scale: 0.85 + ((i * 13) % 30) / 100, // ±15% scale variation
    }));

    for (let i = 0; i < TOKEN_COUNT; i++) {
      const o = tokenOrbits[i];
      _vec3A.set(Math.cos(o.phase) * o.radius, o.yBase, Math.sin(o.phase) * o.radius);
      _quat.identity();
      _scale.setScalar(o.scale);
      _mat4.compose(_vec3A, _quat, _scale);
      tokenInstanced.setMatrixAt(i, _mat4);
      tokenInstanced.setColorAt(i, _color.setHex(0x38bdf8));
    }
    tokenInstanced.instanceMatrix.needsUpdate = true;
    if (tokenInstanced.instanceColor) tokenInstanced.instanceColor.needsUpdate = true;
    tokenInstanced.computeBoundingSphere();
    scene.add(tokenInstanced);

    // 9B. 24 Perimeter Forensic Arena Stanchions
    const STANCHION_COUNT = 24;
    const stanchionGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8);
    const stanchionInstanced = new THREE.InstancedMesh(
      stanchionGeo,
      matteSlateMat,
      STANCHION_COUNT
    );
    for (let i = 0; i < STANCHION_COUNT; i++) {
      const ang = (i / STANCHION_COUNT) * Math.PI * 2;
      const r = 9.5;
      const sc = 0.9 + (i % 3) * 0.1;
      _vec3A.set(Math.cos(ang) * r, 0.45 * sc, Math.sin(ang) * r);
      _quat.identity();
      _scale.set(1, sc, 1);
      _mat4.compose(_vec3A, _quat, _scale);
      stanchionInstanced.setMatrixAt(i, _mat4);
      stanchionInstanced.setColorAt(i, _color.setHex(i % 2 === 0 ? 0x334155 : 0x475569));
    }
    stanchionInstanced.instanceMatrix.needsUpdate = true;
    if (stanchionInstanced.instanceColor) stanchionInstanced.instanceColor.needsUpdate = true;
    stanchionInstanced.computeBoundingSphere();
    scene.add(stanchionInstanced);

    // Pre-warm shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. High-Performance Raycasting (throttled pointermove + click inspection)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverTime = 0;

    const getCanvasRelativePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 60) return;
      lastHoverTime = now;

      getCanvasRelativePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerDown = (e: PointerEvent) => {
      getCanvasRelativePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (hitObj.userData?.partName) {
          setSelectedPartLabel(hitObj.userData.partName);
          soundFx.playClick(740);
        }
        if (hitObj.userData?.preset) {
          setCameraPreset(hitObj.userData.preset as CameraPreset);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 11. Resize Handler
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 12. Animation & Software-WebGL Paced Render Loop
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();
    let currentExploded = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const curResult = resultRef.current;
      const isReal = curResult?.verdict === 'LIKELY REAL NEWS';
      const isFake = curResult?.verdict === 'LIKELY FAKE NEWS';
      const effectiveCb =
        simClickbaitRef.current !== null
          ? simClickbaitRef.current
          : curResult?.metrics.clickbaitScore ?? 50;
      const subjectivity = curResult?.metrics.subjectivity ?? 50;

      // Update finish preset colors smoothly
      const finish = finishRef.current;
      if (finish === 'gold') {
        primaryMetalMat.color.lerp(_color.setHex(0xd4af37), 0.08);
        secondaryAccentMat.color.lerp(_color.setHex(0xfef08a), 0.08);
      } else if (finish === 'obsidian') {
        primaryMetalMat.color.lerp(_color.setHex(0x0f172a), 0.08);
        secondaryAccentMat.color.lerp(_color.setHex(0x38bdf8), 0.08);
      } else {
        primaryMetalMat.color.lerp(_color.setHex(0x334155), 0.08);
        secondaryAccentMat.color.lerp(_color.setHex(0x94a3b8), 0.08);
      }

      // Update Central Crystal Core Color based on Verdict & Clickbait override
      const targetCoreHex =
        effectiveCb >= 65 || (simClickbaitRef.current === null && isFake)
          ? 0xef4444
          : effectiveCb <= 35 && isReal
          ? 0x10b981
          : 0xf59e0b;

      coreCrystalMat.color.lerp(_color.setHex(targetCoreHex), 0.1);
      coreCrystalMat.emissive.lerp(_color.setHex(targetCoreHex), 0.1);
      corePointLight.color.lerp(_color.setHex(targetCoreHex), 0.1);

      // Update Clickbait Thermal Ring color
      const cbHex = effectiveCb >= 60 ? 0xef4444 : effectiveCb >= 30 ? 0xf59e0b : 0x10b981;
      thermalRingMat.color.lerp(_color.setHex(cbHex), 0.1);
      thermalRingMat.emissive.lerp(_color.setHex(cbHex), 0.1);

      // Smooth Exponential Damping for Exploded View Slider
      currentExploded = THREE.MathUtils.damp(currentExploded, explodedRef.current, 6, dt);

      dialMesh.position.y = 0.9 + currentExploded * 0.45;
      yokeMesh.position.y = 1.95 + currentExploded * 0.9;
      lowerConeMesh.position.y = 1.45 - currentExploded * 0.35;
      outerGimbalMesh.position.y = 2.85 + currentExploded * 1.3;
      midGimbalMesh.position.y = 2.85 + currentExploded * 1.3;
      innerRingMesh.position.y = 2.85 + currentExploded * 1.3;
      crystalCoreMesh.position.y = 2.85 + currentExploded * 1.85;
      cageMesh.position.y = 2.85 + currentExploded * 2.35;
      upperCrownMesh.position.y = 4.25 + currentExploded * 2.9;
      spireMesh.position.y = 4.85 + currentExploded * 3.5;

      // Rotate Gimbals & Crystal Core based on telemetry
      const spinMult = 0.4 + (effectiveCb / 100) * 2.2;
      outerGimbalMesh.rotation.y += dt * 0.45 * spinMult;
      outerGimbalMesh.rotation.x = Math.sin(elapsed * 0.7) * 0.25;

      midGimbalMesh.rotation.x += dt * 0.65 * spinMult;
      midGimbalMesh.rotation.z = ((subjectivity - 50) / 50) * 0.6;

      innerRingMesh.rotation.z -= dt * 1.1 * spinMult;
      innerRingMesh.rotation.y = Math.cos(elapsed * 1.1) * 0.4;

      crystalCoreMesh.rotation.y += dt * 0.8;
      crystalCoreMesh.rotation.x += dt * 0.5;
      const pulseScale = 1 + Math.sin(elapsed * 3) * 0.05 + currentExploded * 0.2;
      crystalCoreMesh.scale.setScalar(pulseScale);
      cageMesh.rotation.y -= dt * 0.4;

      // Update 3 Ensemble Classifier Towers
      const votes = curResult?.ensembleVotes || [];
      towerRefs.forEach((tRef, idx) => {
        const vote = votes[idx];
        const voteReal = vote ? vote.prediction === 'REAL' && effectiveCb < 65 : true;
        const prob = vote
          ? voteReal
            ? vote.probabilityReal
            : vote.probabilityFake
          : 85;
        const tColorHex = voteReal ? 0x10b981 : 0xef4444;

        tRef.beaconMat.color.lerp(_color.setHex(tColorHex), 0.1);
        tRef.beaconMat.emissive.lerp(_color.setHex(tColorHex), 0.1);
        tRef.conduitMat.color.lerp(_color.setHex(tColorHex), 0.1);
        tRef.conduitMat.emissive.lerp(_color.setHex(tColorHex), 0.1);

        tRef.haloMesh.rotation.z += dt * (voteReal ? 0.8 : 2.1);
        const targetSleeveScaleY = Math.max(0.25, prob / 100);
        tRef.sleeveMesh.scale.y = THREE.MathUtils.damp(
          tRef.sleeveMesh.scale.y,
          targetSleeveScaleY,
          5,
          dt
        );

        // Radial exploded offset on towers
        const rExplode = towerRadius + currentExploded * 1.6;
        tRef.group.position.x = Math.cos(tRef.baseAngle) * rExplode;
        tRef.group.position.z = Math.sin(tRef.baseAngle) * rExplode;
      });

      // Update 48 Orbiting Linguistic Token Nodes (InstancedMesh)
      const triggerCount = curResult?.metrics.clickbaitTriggers.length ?? 0;
      const capsCount = curResult?.metrics.capsCount ?? 0;
      for (let i = 0; i < TOKEN_COUNT; i++) {
        const o = tokenOrbits[i];
        const ang = o.phase + elapsed * o.speed;
        const rad = o.radius + currentExploded * 1.1;
        _vec3A.set(
          Math.cos(ang) * rad,
          o.yBase + Math.sin(elapsed * 1.5 + i) * 0.18,
          Math.sin(ang) * rad
        );
        _euler.set(elapsed + i, elapsed * 0.7, 0);
        _quat.setFromEuler(_euler);
        _scale.setScalar(o.scale);
        _mat4.compose(_vec3A, _quat, _scale);
        tokenInstanced.setMatrixAt(i, _mat4);

        // Color coding by token type ratio
        if (i < triggerCount * 3 || (effectiveCb > 60 && i % 3 === 0)) {
          tokenInstanced.setColorAt(i, _color.setHex(0xef4444)); // Red Clickbait
        } else if (i < (triggerCount + capsCount) * 2) {
          tokenInstanced.setColorAt(i, _color.setHex(0xf59e0b)); // Amber ALL-CAPS
        } else if (isReal && i % 2 === 0) {
          tokenInstanced.setColorAt(i, _color.setHex(0x10b981)); // Emerald Institutional
        } else {
          tokenInstanced.setColorAt(i, _color.setHex(0x38bdf8)); // Neutral
        }
      }
      tokenInstanced.instanceMatrix.needsUpdate = true;
      if (tokenInstanced.instanceColor) tokenInstanced.instanceColor.needsUpdate = true;

      // Damped Camera Preset Choreography (yields immediately when user orbits manually)
      if (!userOrbitingRef.current) {
        const preset = camPresetRef.current;
        if (preset === 'overview') {
          _vec3A.set(0, 6.2, 13.5);
          _vec3B.set(0, 2.3, 0);
        } else if (preset === 'core') {
          _vec3A.set(0, 3.3, 5.2);
          _vec3B.set(0, 2.85, 0);
        } else if (preset === 'lr') {
          _vec3A.set(8.2, 4.2, 4.8);
          _vec3B.set(5.4, 2.0, 0);
        } else if (preset === 'nb') {
          _vec3A.set(-5.5, 4.2, 7.8);
          _vec3B.set(
            Math.cos((Math.PI * 2) / 3) * 5.4,
            2.0,
            Math.sin((Math.PI * 2) / 3) * 5.4
          );
        } else if (preset === 'pac') {
          _vec3A.set(-5.5, 4.2, -7.8);
          _vec3B.set(
            Math.cos((Math.PI * 4) / 3) * 5.4,
            2.0,
            Math.sin((Math.PI * 4) / 3) * 5.4
          );
        } else {
          // 'top'
          _vec3A.set(0, 16.5, 2.5);
          _vec3B.set(0, 1.5, 0);
        }

        const dampFactor = 1 - Math.exp(-4.5 * dt);
        camera.position.lerp(_vec3A, dampFactor);
        controls.target.lerp(_vec3B, dampFactor);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const isReal = result?.verdict === 'LIKELY REAL NEWS';
  const isFake = result?.verdict === 'LIKELY FAKE NEWS';
  const displayedCbScore =
    simClickbaitOverride !== null ? simClickbaitOverride : result?.metrics.clickbaitScore ?? 0;

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.muted = next;
    if (!next) soundFx.playClick(680);
  };

  return (
    <section
      aria-label="3D Forensic Truth Observatory"
      className="relative w-full h-screen min-h-[640px] overflow-hidden bg-[#080C14] select-none border-b border-slate-800"
    >
      {/* Dedicated Isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        data-testid="forensic-3d-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* Minimal Top Bar Overlay (Solid RGBA surface, zero backdrop-filter over WebGL) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 pointer-events-none">
        {/* Zone 1: Brand & Live Spec Readout */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0B0F19]/95 border border-slate-800 pointer-events-auto shadow-lg">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                fake<span className="text-indigo-400">AI</span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] font-mono text-slate-300">
                Forensic Truth Gyroscope
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Inspecting: <span className="text-indigo-300">{selectedPartLabel}</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Quick Navigation Actions */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute forensic audio' : 'Mute forensic audio'}
            className="p-2.5 rounded-xl bg-[#0B0F19]/95 hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute synthesized audio' : 'Mute synthesized audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={() => {
              soundFx.playClick(540);
              onScrollToWorkbench();
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Interactive XAI Workbench</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick(600);
              onOpenProjectCode();
            }}
            className="px-3.5 py-2 rounded-xl bg-[#0B0F19]/95 hover:bg-slate-900 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Project Files &amp; API</span>
          </button>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (<= 15% viewport height, solid RGBA, zero backdrop-filter) */}
      <div
        style={{
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(940px, 95vw)',
        }}
        className="absolute z-20 w-full pointer-events-auto transition-transform duration-300"
      >
        {/* Collapse / Expand Tab Handle */}
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => {
              soundFx.playClick(500);
              setDockCollapsed((prev) => !prev);
            }}
            className="px-3.5 py-1 rounded-full bg-[#0B0F19]/95 hover:bg-slate-900 border border-slate-700/90 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>▴ Show 3D Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>▾ Hide Controls / Cinema Mode (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Body */}
        {!dockCollapsed && (
          <div className="bg-[#0B0F19]/95 border border-slate-800 rounded-2xl p-3.5 md:p-4 shadow-2xl text-xs space-y-3">
            {/* Row 1: Live Telemetry Summary + Quick-Load Sample Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/90">
              {/* Verdict Readout */}
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                    displayedCbScore >= 65 || (simClickbaitOverride === null && isFake)
                      ? 'bg-rose-950/90 text-rose-400 border-rose-800'
                      : isReal
                      ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
                      : 'bg-amber-950/90 text-amber-400 border-amber-800'
                  }`}
                >
                  {simClickbaitOverride !== null && simClickbaitOverride >= 65
                    ? 'SIMULATED: FAKE RISK'
                    : result?.verdict || 'READY'}
                </span>
                <div className="font-mono text-[11px] text-slate-300 tabular-nums">
                  <span>Conf: </span>
                  <strong className="text-white">{result?.confidence ?? 0}%</strong>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span>Clickbait: </span>
                  <strong className="text-amber-400">{displayedCbScore}/100</strong>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span>Subj: </span>
                  <strong className="text-violet-400">{result?.metrics.subjectivity ?? 0}%</strong>
                </div>
              </div>

              {/* 4 Benchmark Sample Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Samples:
                </span>
                {SAMPLE_ARTICLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      soundFx.playVerdict(s.expectedVerdict === 'REAL');
                      onQuickLoadSample(s.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      activeSampleId === s.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {s.typeBadge}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Interactive Sliders (Exploded View + Live Clickbait Stress-Test) & Camera/Finish Presets */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Exploded View Slider */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                  <label htmlFor="exploded-slider" className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>Exploded View</span>
                  </label>
                  <span className="text-indigo-400 font-bold">{explodedPct}%</span>
                </div>
                <input
                  id="exploded-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={explodedPct}
                  onChange={(e) => setExplodedPct(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Live Clickbait Risk Stress-Test Slider */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                  <label htmlFor="stress-slider" className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>Stress-Test Risk</span>
                  </label>
                  <span className="text-amber-400 font-bold">{displayedCbScore}/100</span>
                </div>
                <input
                  id="stress-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={displayedCbScore}
                  onChange={(e) => setSimClickbaitOverride(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Camera View Presets */}
              <div className="md:col-span-4 flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-blue-400" />
                  Cam:
                </span>
                {(
                  [
                    { id: 'overview', label: 'Orbit' },
                    { id: 'core', label: 'Core' },
                    { id: 'lr', label: 'LogReg' },
                    { id: 'nb', label: 'NaiveBayes' },
                    { id: 'pac', label: 'PAC' },
                    { id: 'top', label: 'Top' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      soundFx.playClick(700);
                      setCameraPreset(cam.id);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Material Finish Swatches */}
              <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                {(
                  [
                    { id: 'titanium', label: 'Ti', color: 'bg-slate-500' },
                    { id: 'gold', label: 'Au', color: 'bg-amber-400' },
                    { id: 'obsidian', label: 'Ob', color: 'bg-indigo-950' },
                  ] as const
                ).map((fin) => (
                  <button
                    key={fin.id}
                    onClick={() => {
                      soundFx.playClick(820);
                      setFinishPreset(fin.id);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border cursor-pointer ${
                      finishPreset === fin.id
                        ? 'border-indigo-400 bg-slate-800 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    title={`Switch PBR finish to ${fin.id}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${fin.color}`} />
                    <span>{fin.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
