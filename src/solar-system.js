import * as THREE from 'three';
import { PLANETS } from './data.js';

// Physical astronomical orbits around the Sun (Mercury to Neptune)
// Enlarged planet scales and dramatic spacing for maximum fair-exhibit impact
const PLANET_INDICES = [3, 4, 0, 5, 6, 7, 8, 9]; // Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
const ORBITS = [1.45, 2.15, 2.95, 3.85, 5.35, 6.95, 8.45, 9.85];
const RADII = [0.12, 0.19, 0.23, 0.16, 0.54, 0.44, 0.32, 0.31];
const ANGLES = [2.1, 4.6, 0.4, 3.25, 5.5, 2.5, 0.9, 4.3];

// Helper: Generates a soft, glowing radial gradient texture for nebula clouds & stars
function createPuffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Helper: Generates Saturn's iconic ring texture with Cassini division & concentric ringlets
function createSaturnRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  for (let x = 0; x < 1024; x++) {
    const t = x / 1024; // 0 = inner edge (1.35), 1 = outer edge (2.45)
    let alpha = 0;
    let r = 215, g = 195, b = 155;

    if (t < 0.18) {
      // C Ring (Crepe Ring) - faint, translucent
      alpha = 0.12 + 0.18 * Math.sin(t * 40);
      r = 175; g = 160; b = 140;
    } else if (t >= 0.18 && t < 0.58) {
      // B Ring - brightest, most opaque, rich golden bands
      const band = 0.5 + 0.5 * Math.sin(t * 120);
      alpha = 0.82 + 0.15 * band;
      r = 235; g = 210; b = 165;
    } else if (t >= 0.58 && t < 0.66) {
      // Cassini Division - dark, distinct gap
      alpha = 0.04;
      r = 90; g = 80; b = 65;
    } else if (t >= 0.66 && t < 0.94) {
      // A Ring - structured outer ring with Encke gap
      const encke = t > 0.84 && t < 0.86 ? 0.1 : 0.68;
      alpha = encke + 0.15 * Math.sin(t * 90);
      r = 210; g = 190; b = 150;
    } else {
      // Outer faint edge
      alpha = 0.2 * (1 - (t - 0.94) / 0.06);
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
    ctx.fillRect(x, 0, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SolarSystem {
  constructor(maps, container) {
    this.group = new THREE.Group();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 7.2, 14.8);
    this.camera.lookAt(0, 0, 0);
    this.elapsed = 0;
    this.baseDistance = 1;

    this.labels = document.createElement('div');
    this.labels.className = 'system-labels';
    this.labels.setAttribute('aria-hidden', 'true');
    container.appendChild(this.labels);

    const sphereGeo = new THREE.SphereGeometry(1, 48, 36);
    const puffTex = createPuffTexture();

    // =========================================================================
    // 1. Photorealistic Deep Space Multi-Magnitude Starfield
    // =========================================================================
    const starCount = 4200;
    const starCoords = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [
      [0.65, 0.82, 1.0],  // Blue supergiant (O/B type)
      [1.0, 1.0, 1.0],   // Bright white (A type)
      [1.0, 0.95, 0.82], // Solar yellow (G type)
      [1.0, 0.78, 0.55], // Orange giant (K type)
      [1.0, 0.52, 0.42]  // Crimson red dwarf (M type)
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starCoords[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starCoords[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starCoords[i * 3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.55 + Math.random() * 0.45;
      starColors[i * 3] = c[0] * brightness;
      starColors[i * 3 + 1] = c[1] * brightness;
      starColors[i * 3 + 2] = c[2] * brightness;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: puffTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.group.add(this.stars);

    // =========================================================================
    // 2. Majestic Volumetric Deep Space Nebulae (Luminous Stardust Clouds)
    // =========================================================================
    // Multi-cloud interstellar dust system that banishes the empty black void
    const nebulaClouds = [
      { count: 900, radius: 36, ySpread: 12, size: 4.8, color: 0x1f4b82, opacity: 0.42 }, // Indigo/Cyan veil
      { count: 700, radius: 42, ySpread: 15, size: 5.5, color: 0x5a1e6e, opacity: 0.35 }, // Magenta/Orion nebula
      { count: 650, radius: 30, ySpread: 9,  size: 3.8, color: 0x1a6278, opacity: 0.38 }, // Teal stellar nursery
      { count: 500, radius: 24, ySpread: 6,  size: 3.2, color: 0x7a4e18, opacity: 0.28 }  // Warm golden galactic core
    ];

    this.nebulaGroups = [];
    nebulaClouds.forEach(cfg => {
      const coords = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const r = cfg.radius * (0.6 + Math.random() * 0.8);
        const a = Math.random() * Math.PI * 2;
        coords[i * 3] = Math.cos(a) * r + (Math.random() - 0.5) * 6;
        coords[i * 3 + 1] = (Math.random() - 0.5) * cfg.ySpread;
        coords[i * 3 + 2] = Math.sin(a) * r + (Math.random() - 0.5) * 6;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
      const mat = new THREE.PointsMaterial({
        size: cfg.size,
        map: puffTex,
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const points = new THREE.Points(geo, mat);
      this.group.add(points);
      this.nebulaGroups.push(points);
    });

    // =========================================================================
    // 3. Cosmic Comets Streaking Across Deep Space
    // =========================================================================
    this.comets = [];
    for (let c = 0; c < 2; c++) {
      const cometHead = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: puffTex,
          color: 0x9be8ff,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
      );
      cometHead.scale.set(0.65, 0.65, 1);

      // Tail
      const tailPoints = [];
      for (let p = 0; p < 24; p++) {
        tailPoints.push(new THREE.Vector3(-p * 0.15, -p * 0.04, -p * 0.1));
      }
      const tailGeo = new THREE.BufferGeometry().setFromPoints(tailPoints);
      const tailMat = new THREE.LineBasicMaterial({
        color: 0x62c4ff,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const cometTail = new THREE.Line(tailGeo, tailMat);

      const cometGroup = new THREE.Group();
      cometGroup.add(cometHead);
      cometGroup.add(cometTail);
      this.group.add(cometGroup);

      this.comets.push({
        group: cometGroup,
        speed: 0.8 + c * 0.5,
        progress: c * 0.5,
        startX: -35 + c * 20,
        startY: 8 + c * 4,
        startZ: -25,
        endX: 35 + c * 10,
        endY: -6 - c * 3,
        endZ: 25
      });
    }

    // =========================================================================
    // 4. Majestic Central Blazing Sun & Multi-Layered Solar Corona
    // =========================================================================
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: maps[2],
      color: 0xfff0b8
    });
    this.sunMesh = new THREE.Mesh(sphereGeo, sunMaterial);
    this.sunMesh.scale.setScalar(0.86);
    this.group.add(this.sunMesh);

    // Dynamic Coronal Corona Layers
    // Layer A: Inner Brilliant White-Hot Plasma
    const innerCoronaCanvas = document.createElement('canvas');
    innerCoronaCanvas.width = innerCoronaCanvas.height = 256;
    const ictx = innerCoronaCanvas.getContext('2d');
    const igrad = ictx.createRadialGradient(128, 128, 10, 128, 128, 128);
    igrad.addColorStop(0, '#ffffff');
    igrad.addColorStop(0.3, 'rgba(255, 235, 140, 0.95)');
    igrad.addColorStop(0.6, 'rgba(255, 160, 40, 0.4)');
    igrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ictx.fillStyle = igrad;
    ictx.fillRect(0, 0, 256, 256);
    const innerTex = new THREE.CanvasTexture(innerCoronaCanvas);

    this.innerCorona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: innerTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.innerCorona.scale.set(4.2, 4.2, 1);
    this.group.add(this.innerCorona);

    // Layer B: Expansive Outer Solar Atmosphere Glow
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 512;
    const ctx = glowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 16, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
    grad.addColorStop(0.2, 'rgba(255, 190, 60, 0.65)');
    grad.addColorStop(0.45, 'rgba(255, 110, 20, 0.28)');
    grad.addColorStop(0.75, 'rgba(255, 45, 5, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const glowTex = new THREE.CanvasTexture(glowCanvas);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.glow.scale.set(7.5, 7.5, 1);
    this.group.add(this.glow);

    // Radiant Sunlight
    const sunlight = new THREE.PointLight(0xfff8ee, 5.2, 0, 0.08);
    this.group.add(sunlight);

    // =========================================================================
    // 5. Planetary System (8 Worlds + Earth Moon + Realistic Rings)
    // =========================================================================
    this.saturnRingTex = createSaturnRingTexture();

    this.worlds = PLANET_INDICES.map((pIndex, i) => {
      const planet = PLANETS[pIndex];
      const orbitR = ORBITS[i];

      // Smooth Antialiased Holographic Orbit Track
      const trackPoints = Array.from({ length: 360 }, (_, n) => {
        const a = (n / 360) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
      });
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(trackPoints),
        new THREE.LineBasicMaterial({
          color: planet.color,
          transparent: true,
          opacity: pIndex === 0 ? 0.45 : 0.22,
          blending: THREE.AdditiveBlending
        })
      );
      this.group.add(orbitLine);

      // Orbit Progress Energy Pulse (subtle glowing marker gliding along the track)
      const pulseSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: puffTex,
          color: planet.color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 0.6
        })
      );
      pulseSprite.scale.set(0.25, 0.25, 1);
      this.group.add(pulseSprite);

      // High-Detail Planet Mesh
      const pMat = new THREE.MeshStandardMaterial({
        map: maps[pIndex],
        bumpMap: maps[pIndex],
        bumpScale: 0.03,
        roughness: pIndex === 0 ? 0.5 : 0.82,
        metalness: pIndex === 0 ? 0.12 : 0.04,
        emissive: planet.color,
        emissiveIntensity: 0.08
      });
      const mesh = new THREE.Mesh(sphereGeo, pMat);
      mesh.scale.setScalar(RADII[i] * 1.65);
      this.group.add(mesh);

      // Special Features: Saturn Rings (Photorealistic Concentric Rings with Cassini Division)
      let saturnRings = null;
      if (pIndex === 7) {
        const ringGeo = new THREE.RingGeometry(1.35, 2.45, 180, 1);
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        for (let idx = 0; idx < pos.count; idx++) {
          uv.setXY(idx, (Math.hypot(pos.getX(idx), pos.getY(idx)) - 1.35) / 1.1, 0.5);
        }
        const ringMat = new THREE.MeshStandardMaterial({
          map: this.saturnRingTex,
          transparent: true,
          side: THREE.DoubleSide,
          roughness: 0.45,
          metalness: 0.05,
          depthWrite: false,
          emissive: 0xd6c095,
          emissiveIntensity: 0.32
        });
        saturnRings = new THREE.Mesh(ringGeo, ringMat);
        saturnRings.rotation.x = -Math.PI / 2 + 0.46; // 26.7° realistic Saturn axial tilt
        saturnRings.rotation.z = 0.15;
        mesh.add(saturnRings);
      }

      // Special Features: Uranus Ice Rings (Tilted 97°)
      if (pIndex === 8) {
        const uRingGeo = new THREE.RingGeometry(1.3, 1.65, 96, 1);
        const uRingMat = new THREE.MeshBasicMaterial({
          color: 0x8fe7f2,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const uranusRings = new THREE.Mesh(uRingGeo, uRingMat);
        uranusRings.rotation.x = Math.PI * 0.52; // Tilted on its side
        mesh.add(uranusRings);
      }

      // Special Features: Earth Atmosphere Halo & Orbiting Moon
      let moonMesh = null;
      let atmosphereMesh = null;
      if (pIndex === 0) {
        // Glowing cyan atmospheric scattering aura
        atmosphereMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.05, 32, 24),
          new THREE.MeshBasicMaterial({
            color: 0x62c4ff,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
          })
        );
        mesh.add(atmosphereMesh);

        // Orbiting Moon
        moonMesh = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshStandardMaterial({
            map: maps[1],
            bumpMap: maps[1],
            bumpScale: 0.035,
            roughness: 0.95,
            color: 0xdddddd
          })
        );
        moonMesh.scale.setScalar(0.28);
        mesh.add(moonMesh);
      }

      // Interactive World Label
      const label = document.createElement('span');
      label.className = `system-label${pIndex === 0 ? ' home-world' : ''}`;
      label.innerHTML = `<i style="--label-color:${planet.color}"></i>${planet.name}`;
      this.labels.appendChild(label);

      return { mesh, label, pIndex, orbitIndex: i, moonMesh, pulseSprite, saturnRings };
    });

    // Sun Label
    this.sunLabel = document.createElement('span');
    this.sunLabel.className = 'system-label sun-label';
    this.sunLabel.innerHTML = `<i style="--label-color:#ffb338"></i>THE SUN`;
    this.labels.appendChild(this.sunLabel);

    // =========================================================================
    // 6. Dense Asteroid Belt (Mars - Jupiter) with Keplerian Dynamics
    // =========================================================================
    const asteroidCount = 3600;
    const asteroidPositions = new Float32Array(asteroidCount * 3);
    const asteroidColors = new Float32Array(asteroidCount * 3);
    this.asteroidRadii = new Float32Array(asteroidCount);
    this.asteroidSpeeds = new Float32Array(asteroidCount);
    this.asteroidBaseAngles = new Float32Array(asteroidCount);
    this.asteroidYOffsets = new Float32Array(asteroidCount);

    for (let n = 0; n < asteroidCount; n++) {
      const r = 4.35 + Math.random() * 0.85;
      const angle = Math.random() * Math.PI * 2;
      const yOff = (Math.random() - 0.5) * 0.22;

      this.asteroidRadii[n] = r;
      this.asteroidBaseAngles[n] = angle;
      this.asteroidSpeeds[n] = 0.12 / Math.sqrt(r); // Keplerian orbital velocity
      this.asteroidYOffsets[n] = yOff;

      asteroidPositions[n * 3] = Math.cos(angle) * r;
      asteroidPositions[n * 3 + 1] = yOff;
      asteroidPositions[n * 3 + 2] = Math.sin(angle) * r;

      // Asteroid mineral tones: silicates, iron, carbonaceous
      const type = Math.random();
      if (type < 0.6) {
        // Silicate grey-brown
        asteroidColors[n * 3] = 0.65;
        asteroidColors[n * 3 + 1] = 0.60;
        asteroidColors[n * 3 + 2] = 0.55;
      } else if (type < 0.85) {
        // Metallic golden-iron
        asteroidColors[n * 3] = 0.75;
        asteroidColors[n * 3 + 1] = 0.68;
        asteroidColors[n * 3 + 2] = 0.52;
      } else {
        // Carbonaceous dark chondrite
        asteroidColors[n * 3] = 0.45;
        asteroidColors[n * 3 + 1] = 0.45;
        asteroidColors[n * 3 + 2] = 0.48;
      }
    }

    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
    beltGeo.setAttribute('color', new THREE.BufferAttribute(asteroidColors, 3));
    this.asteroidMesh = new THREE.Points(
      beltGeo,
      new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    );
    this.group.add(this.asteroidMesh);

    // =========================================================================
    // 7. Outer Kuiper Belt (Trans-Neptunian Icy Planetesimals)
    // =========================================================================
    const kuiperCount = 1800;
    const kuiperCoords = new Float32Array(kuiperCount * 3);
    const kuiperColors = new Float32Array(kuiperCount * 3);
    for (let k = 0; k < kuiperCount; k++) {
      const kr = 10.8 + Math.random() * 2.8;
      const ka = Math.random() * Math.PI * 2;
      kuiperCoords[k * 3] = Math.cos(ka) * kr;
      kuiperCoords[k * 3 + 1] = (Math.random() - 0.5) * 0.45;
      kuiperCoords[k * 3 + 2] = Math.sin(ka) * kr;

      // Icy bluish-white reflectance
      kuiperColors[k * 3] = 0.65 + Math.random() * 0.25;
      kuiperColors[k * 3 + 1] = 0.78 + Math.random() * 0.2;
      kuiperColors[k * 3 + 2] = 0.95 + Math.random() * 0.05;
    }
    const kuiperGeo = new THREE.BufferGeometry();
    kuiperGeo.setAttribute('position', new THREE.BufferAttribute(kuiperCoords, 3));
    kuiperGeo.setAttribute('color', new THREE.BufferAttribute(kuiperColors, 3));
    this.group.add(
      new THREE.Points(
        kuiperGeo,
        new THREE.PointsMaterial({
          size: 0.03,
          vertexColors: true,
          transparent: true,
          opacity: 0.55,
          depthWrite: false
        })
      )
    );

    this.projected = new THREE.Vector3();
    this.setVisible(false);
  }

  setVisible(visible) {
    this.group.visible = visible;
    this.labels.hidden = !visible;
  }

  setMap(index, map) {
    const world = this.worlds.find(w => w.pIndex === index);
    if (world) {
      world.mesh.material.map = map;
      world.mesh.material.bumpMap = map;
      world.mesh.material.needsUpdate = true;
    } else if (index === 1) {
      const earth = this.worlds.find(w => w.pIndex === 0);
      if (earth && earth.moonMesh) {
        earth.moonMesh.material.map = map;
        earth.moonMesh.material.bumpMap = map;
        earth.moonMesh.material.needsUpdate = true;
      }
    } else if (index === 2) {
      this.sunMesh.material.map = map;
      this.sunMesh.material.needsUpdate = true;
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;

    // Cinematic full-bleed framing: fits the entire wide solar system edge-to-edge
    this.baseDistance = Math.max(0.9, 1.48 / this.camera.aspect);
    this.camera.position.set(0, 6.8 * this.baseDistance, 14.5 * this.baseDistance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  update(dt, moving) {
    if (moving) this.elapsed += dt;

    // 1. Majestic slow cinematic camera orbit drift (gives living depth & 3D parallax)
    if (moving) {
      const dist = this.baseDistance;
      const camX = Math.sin(this.elapsed * 0.03) * 1.5;
      const camY = (6.8 + Math.cos(this.elapsed * 0.02) * 0.45) * dist;
      const camZ = (14.5 + Math.sin(this.elapsed * 0.025) * 0.8) * dist;
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(0, 0, 0);
    }

    // 2. Slow celestial rotation of deep stars & nebulae
    if (this.stars) {
      this.stars.rotation.y = this.elapsed * 0.003;
    }
    if (this.nebulaGroups) {
      this.nebulaGroups.forEach((neb, idx) => {
        neb.rotation.y = this.elapsed * (0.002 + idx * 0.001);
      });
    }

    // 3. Comets streaking across deep space
    if (this.comets && moving) {
      this.comets.forEach(c => {
        c.progress = (c.progress + dt * 0.035 * c.speed) % 1.0;
        const x = c.startX + (c.endX - c.startX) * c.progress;
        const y = c.startY + (c.endY - c.startY) * c.progress;
        const z = c.startZ + (c.endZ - c.startZ) * c.progress;
        c.group.position.set(x, y, z);
      });
    }

    // 4. Asteroid Belt Keplerian orbital propagation
    if (this.asteroidMesh && moving) {
      const pos = this.asteroidMesh.geometry.attributes.position.array;
      const count = this.asteroidRadii.length;
      for (let n = 0; n < count; n++) {
        const r = this.asteroidRadii[n];
        const angle = this.asteroidBaseAngles[n] + this.elapsed * this.asteroidSpeeds[n];
        pos[n * 3] = Math.cos(angle) * r;
        pos[n * 3 + 2] = Math.sin(angle) * r;
      }
      this.asteroidMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Planets orbiting the Sun & individual spin
    for (const { mesh, label, orbitIndex, moonMesh, pulseSprite } of this.worlds) {
      const orbitR = ORBITS[orbitIndex];
      const speed = 0.075 / Math.sqrt(orbitR);
      const angle = ANGLES[orbitIndex] + this.elapsed * speed;
      mesh.position.set(Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR);

      if (moving) {
        mesh.rotation.y += dt * 0.22;
      }

      // Energy pulse gliding along the orbit track
      if (pulseSprite) {
        const pulseAngle = angle + 0.35;
        pulseSprite.position.set(Math.cos(pulseAngle) * orbitR, 0, Math.sin(pulseAngle) * orbitR);
      }

      // Realistic Moon orbit around Earth
      if (moonMesh && moving) {
        const moonAngle = this.elapsed * 1.5;
        moonMesh.position.set(Math.cos(moonAngle) * 0.44, 0.06, Math.sin(moonAngle) * 0.44);
        moonMesh.rotation.y += dt * 0.4;
      }

      this.placeLabel(label, mesh.position, RADII[orbitIndex]);
    }

    // 6. Sun spin & breathing dynamic coronal aura
    if (moving) {
      this.sunMesh.rotation.y += dt * 0.03;
      const pulse = 1.0 + Math.sin(this.elapsed * 1.6) * 0.06;
      this.innerCorona.scale.set(4.2 * pulse, 4.2 * pulse, 1);
      this.glow.scale.set(7.5 * pulse, 7.5 * pulse, 1);
    }

    this.placeLabel(this.sunLabel, this.sunMesh.position, 1.5);

    // 7. Collision-free floating world labels
    const allLabels = [...this.worlds.map(w => w.label), this.sunLabel];
    const boxes = allLabels
      .map(label => ({
        label,
        x: (parseFloat(label.style.left) * this.width) / 100,
        y: (parseFloat(label.style.top) * this.height) / 100 + parseFloat(label.style.marginTop || 0),
        width: Math.max(72, label.textContent.length * 5.2),
        height: 28
      }))
      .sort((a, b) => a.y - b.y);

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      for (let j = 0; j < i; j++) {
        const prev = boxes[j];
        if (
          Math.abs(box.x - prev.x) < (box.width + prev.width) / 2 + 4 &&
          box.y < prev.y + prev.height + 3
        ) {
          box.y = prev.y + prev.height + 3;
        }
      }
      box.label.style.top = `${Math.min(box.y, this.height - box.height)}px`;
      box.label.style.marginTop = '0';
    }
  }

  placeLabel(label, position, radius) {
    this.projected.copy(position).project(this.camera);
    label.style.left = `${(this.projected.x * 0.5 + 0.5) * 100}%`;
    label.style.top = `${(-this.projected.y * 0.5 + 0.5) * 100}%`;
    label.style.marginTop = `${16 + radius * 14}px`;
  }
}
