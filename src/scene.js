import * as THREE from 'three';
import { SolarSystem } from './solar-system.js';
import { PLANETS } from './data.js';

// Procedural high-resolution fallback textures for all 10 celestial worlds
function texture(index) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = 1409 + index * 901;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (index === 0) {
    // 0: Earth — oceans, continents, polar caps
    ctx.fillStyle = '#143460';
    ctx.fillRect(0, 0, 1024, 512);
    const continents = [
      [[100, 120], [160, 65], [290, 75], [325, 125], [265, 175], [225, 180], [210, 245], [170, 215], [152, 165]],
      [[255, 250], [326, 260], [354, 310], [325, 360], [300, 433], [275, 379], [265, 326]],
      [[460, 150], [500, 130], [520, 163], [560, 168], [590, 240], [553, 331], [517, 355], [490, 285], [463, 225]],
      [[530, 110], [620, 65], [769, 80], [868, 150], [825, 211], [740, 205], [697, 270], [661, 217], [598, 177]],
      [[782, 329], [851, 312], [888, 361], [830, 390], [782, 368]],
      [[315, 24], [379, 16], [390, 80], [340, 108]]
    ];
    for (const points of continents) {
      const land = ctx.createLinearGradient(0, 60, 0, 420);
      land.addColorStop(0, '#759e61');
      land.addColorStop(0.5, '#447a51');
      land.addColorStop(1, '#94885c');
      ctx.fillStyle = land;
      ctx.beginPath();
      const last = points[points.length - 1];
      ctx.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
      points.forEach(([x, y], n) => {
        const next = points[(n + 1) % points.length];
        ctx.quadraticCurveTo(x, y, (x + next[0]) / 2, (y + next[1]) / 2);
      });
      ctx.closePath();
      ctx.fill();
    }
    // Polar ice caps
    ctx.fillStyle = '#ebf5f7';
    ctx.fillRect(0, 0, 1024, 25);
    ctx.fillRect(0, 485, 1024, 27);
  } else if (index === 1) {
    // 1: The Moon — cratered lunar highlands, dark basaltic maria
    ctx.fillStyle = '#8a8e94';
    ctx.fillRect(0, 0, 1024, 512);

    const maria = [
      [320, 180, 130, 85],
      [420, 240, 95, 75],
      [240, 210, 105, 95],
      [680, 220, 85, 65],
      [360, 300, 75, 55]
    ];
    for (const [mx, my, mrx, mry] of maria) {
      const grad = ctx.createRadialGradient(mx, my, mrx * 0.1, mx, my, mrx);
      grad.addColorStop(0, '#3e4146');
      grad.addColorStop(0.7, '#54585e');
      grad.addColorStop(1, '#8a8e94');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(mx, my, mrx, mry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 450; i++) {
      const cx = random() * 1024, cy = random() * 512, cr = 2 + random() * 18;
      ctx.fillStyle = '#2d3035';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d2d7de';
      ctx.lineWidth = Math.max(1, cr * 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, cr, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
    }
  } else if (index === 2) {
    // 2: The Sun — radiant photosphere, convection granules
    const sunGrad = ctx.createLinearGradient(0, 0, 0, 512);
    sunGrad.addColorStop(0, '#ff9618');
    sunGrad.addColorStop(0.5, '#ffd24d');
    sunGrad.addColorStop(1, '#ff8008');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 9000; i++) {
      const gx = random() * 1024, gy = random() * 512;
      ctx.fillStyle = random() > 0.5 ? '#fff4b8' : '#e66000';
      ctx.globalAlpha = 0.14 + random() * 0.2;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 4 + random() * 8, 2 + random() * 6, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.8;
    for (const [sx, sy, sr] of [[450, 220, 16], [475, 235, 10], [720, 280, 20], [755, 295, 12]]) {
      const spotGrad = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr);
      spotGrad.addColorStop(0, '#2d1100');
      spotGrad.addColorStop(0.6, '#7a3100');
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Planets (Mercury=3, Venus=4, Mars=5, Jupiter=6, Saturn=7, Uranus=8, Neptune=9)
    const palettes = {
      3: ['#696460', '#9e9690', '#c2bab2'],
      4: ['#a67844', '#d6b37a', '#eddab2'],
      5: ['#783626', '#b8583c', '#d68e69'],
      6: ['#9c6f58', '#d6be9f', '#eddac0', '#915a46'],
      7: ['#a18e66', '#d6c498', '#ebdcb5'],
      8: ['#58929e', '#84bebf', '#a7d5d6'],
      9: ['#163782', '#2c54a8', '#4b75c4']
    };
    const colors = palettes[index] || ['#444', '#888', '#ccc'];
    ctx.fillStyle = colors[1];
    ctx.fillRect(0, 0, 1024, 512);

    for (let y = 0; y < 512; y += 2) {
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
      ctx.globalAlpha = index === 6 || index === 7 ? 0.65 : 0.2;
      ctx.fillRect(0, y, 1024, 2 + random() * (index === 6 ? 16 : 5));
    }
    ctx.globalAlpha = 1;

    // Jupiter Great Red Spot
    if (index === 6) {
      ctx.fillStyle = '#a84e36';
      ctx.beginPath();
      ctx.ellipse(670, 325, 62, 24, 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d6be9f';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    // Mars craters
    if (index === 5) {
      for (let n = 0; n < 140; n++) {
        const x = random() * 1024, y = random() * 512, r = 2 + random() * 14;
        ctx.strokeStyle = '#4a2016';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Surface micro-noise
  ctx.globalAlpha = 0.045;
  for (let n = 0; n < 9000; n++) {
    const x = random() * 1024, y = random() * 512;
    ctx.fillStyle = random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function cloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = 421;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let n = 0; n < 190; n++) {
    const x = random() * 1024, y = 40 + random() * 430, length = 20 + random() * 120;
    ctx.globalAlpha = 0.09 + random() * 0.28;
    ctx.lineWidth = 0.5 + random() * 4.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + length * 0.3, y - 16, x + length * 0.7, y + 14, x + length, y - 5);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export class PlanetScene {
  constructor(container, onFailure) {
    this.container = container;
    this.reduced = false;
    this.paused = false;
    this.index = 0; // Default to Earth
    this.group = new THREE.Group();
    this.planetCenterX = 1.45;
    this.planetCenterY = 0.16;
    this.group.position.set(this.planetCenterX, this.planetCenterY, 0);
    this.targetScale = 1.14;
    this.clock = new THREE.Clock();
    this.resources = [];
    this.onFailure = onFailure;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(this.renderer.domElement);
      this.renderer.domElement.setAttribute('aria-hidden', 'true');

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
      this.camera.position.set(0, 0, 6.2);

      // Deep space lighting
      this.ambientLight = new THREE.AmbientLight(0x7590b8, 0.18);
      this.scene.add(this.ambientLight);

      // Primary harsh space sunbeam (creates crisp crater/mountain shadows)
      this.sunlight = new THREE.DirectionalLight(0xfff6eb, 3.6);
      this.sunlight.position.set(-3.5, 2.0, 3.2);
      this.scene.add(this.sunlight);

      // Subtle atmospheric/cosmic rim light
      this.rimLight = new THREE.DirectionalLight(0x386899, 0.5);
      this.rimLight.position.set(3.2, -1.2, -2.8);
      this.scene.add(this.rimLight);

      // Background Starfield for Journey mode
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1800;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 50 + Math.random() * 30;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      this.journeyStars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xcfe2f7, size: 0.14, transparent: true, opacity: 0.8, depthWrite: false })
      );
      this.scene.add(this.journeyStars);
      this.resources.push(starGeo);

      this.scene.add(this.group);

      // High-poly sphere geometry for silky smooth curvature
      this.geometry = new THREE.SphereGeometry(1, 96, 64);
      this.resources.push(this.geometry);

      this.maps = PLANETS.map((_, i) => texture(i));
      this.resources.push(...this.maps);

      // Primary Celestial Mesh with Bump Mapping
      this.material = new THREE.MeshStandardMaterial({
        map: this.maps[0], // Earth map
        bumpMap: this.maps[0],
        bumpScale: 0.025,
        roughness: 0.65,
        metalness: 0.08
      });

      // Destination 2: The Sun is an unlit, self-luminous star (no fake specular bulb reflections)
      this.sunMaterial = new THREE.MeshBasicMaterial({
        map: this.maps[2],
        color: 0xffffff
      });
      this.resources.push(this.material, this.sunMaterial);

      this.sphere = new THREE.Mesh(this.geometry, this.material);
      this.group.add(this.sphere);
      this.sphere.rotation.y = 2.4;

      // Earth Cloud Layer
      const cloudsMap = cloudTexture();
      const cloudsMaterial = new THREE.MeshStandardMaterial({
        map: cloudsMap,
        transparent: true,
        opacity: 0.88,
        roughness: 1,
        depthWrite: false
      });
      this.clouds = new THREE.Mesh(this.geometry, cloudsMaterial);
      this.clouds.scale.setScalar(1.015);
      this.group.add(this.clouds);

      // Earth Atmospheric Rayleigh Blue Glow
      const atmosphereMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          varying vec3 vWorldNormal; varying vec3 vWorldPosition;
          void main(){
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldPosition = world.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: `
          varying vec3 vWorldNormal; varying vec3 vWorldPosition;
          void main(){
            float rim = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPosition)), 0.0), 2.8);
            float daylight = smoothstep(-0.25, 0.65, dot(normalize(vWorldNormal), normalize(vec3(-3.5, 2.0, 3.2))));
            gl_FragColor = vec4(0.22, 0.62, 1.0, rim * (0.2 + daylight * 0.65));
          }`
      });
      this.atmosphere = new THREE.Mesh(this.geometry, atmosphereMaterial);
      this.atmosphere.scale.setScalar(1.028);
      this.group.add(this.atmosphere);
      this.resources.push(cloudsMap, cloudsMaterial, atmosphereMaterial);

      // Multi-Layered Sun Corona Halo Sprite (fades cleanly to 0 opacity before edges)
      const sunGlowCanvas = document.createElement('canvas');
      sunGlowCanvas.width = sunGlowCanvas.height = 512;
      const sctx = sunGlowCanvas.getContext('2d');
      const sgrad = sctx.createRadialGradient(256, 256, 120, 256, 256, 256);
      sgrad.addColorStop(0, 'rgba(255, 235, 160, 0.95)');
      sgrad.addColorStop(0.2, 'rgba(255, 180, 50, 0.65)');
      sgrad.addColorStop(0.5, 'rgba(255, 100, 15, 0.25)');
      sgrad.addColorStop(0.8, 'rgba(255, 45, 0, 0.05)');
      sgrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = sgrad;
      sctx.fillRect(0, 0, 512, 512);

      const sunGlowMap = new THREE.CanvasTexture(sunGlowCanvas);
      this.sunGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sunGlowMap,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      this.sunGlow.scale.set(3.8, 3.8, 1);
      this.sunGlow.visible = false;
      this.group.add(this.sunGlow);
      this.resources.push(sunGlowMap, this.sunGlow.material);

      // Saturn Rings (Destination 7: Saturn) with High-Res Texture
      const ringGeometry = new THREE.RingGeometry(1.35, 2.45, 180, 1);
      const rc = document.createElement('canvas');
      rc.width = 512;
      rc.height = 1;
      const rx = rc.getContext('2d');
      for (let x = 0; x < 512; x++) {
        // Cassini division at ~x=270-290
        const isCassini = x > 268 && x < 290;
        const a = isCassini ? 0.02 : 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(x * 2.8));
        rx.fillStyle = `rgba(220, 200, 160, ${a})`;
        rx.fillRect(x, 0, 1, 1);
      }
      const pos = ringGeometry.attributes.position, uv = ringGeometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 1.35) / 1.1, 0.5);
      }
      const ringMap = new THREE.CanvasTexture(rc);
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringMap,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.95,
        depthWrite: false,
        emissive: 0xc7ae84,
        emissiveIntensity: 0.35
      });
      this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
      this.rings.visible = false;
      this.rings.rotation.x = 1.12;
      this.rings.rotation.y = 0.24;
      this.rings.rotation.z = -0.22;
      this.group.add(this.rings);
      this.resources.push(ringGeometry, ringMap, ringMaterial);

      this.group.rotation.z = -0.12;

      // Full-screen solar system overview
      this.system = new SolarSystem(this.maps, container);
      this.scene.add(this.system.group);

      this.loadMaps();

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
      this.resize();

      let previous = 0;
      this.renderer.setAnimationLoop(time => {
        if (time - previous < 1000 / 32) return;
        previous = time;
        const dt = Math.min(this.clock.getDelta(), 0.08);

        if (!this.reduced && !this.paused) {
          this.sphere.rotation.y += dt * (this.index === 2 ? 0.015 : 0.045);
          this.clouds.rotation.y += dt * 0.055;
          this.group.position.y = this.planetCenterY + Math.sin(time * 0.00025) * 0.02;
          if (this.journeyStars) this.journeyStars.rotation.y = time * 0.00004;

          // Sun pulsing corona
          if (this.index === 2 && this.sunGlow) {
            const p = 1.0 + Math.sin(time * 0.002) * 0.035;
            this.sunGlow.scale.set(3.8 * p, 3.8 * p, 1);
          }
        }

        if (this.night) this.night.rotation.copy(this.sphere.rotation);

        const scale = this.reduced
          ? this.targetScale
          : THREE.MathUtils.damp(this.group.scale.x, this.targetScale, 5, dt);
        this.group.scale.setScalar(scale);

        if (this.overview) this.system.update(dt, !this.reduced && !this.paused);
        this.renderer.render(this.scene, this.overview ? this.system.camera : this.camera);
      });
    } catch {
      onFailure();
    }
  }

  loadMaps() {
    const loader = new THREE.TextureLoader();
    this.loadedMaps = new Set();

    PLANETS.forEach((planet, index) => {
      loader.load(
        `./textures/${planet.texture}.jpg`,
        map => {
          map.colorSpace = THREE.SRGBColorSpace;
          map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
          const old = this.maps[index];
          this.maps[index] = map;
          this.resources.push(map);
          old?.dispose();
          this.loadedMaps.add(index);
          this.system?.setMap(index, map);
          if (index === 2 && this.sunMaterial) {
            this.sunMaterial.map = map;
            this.sunMaterial.needsUpdate = true;
          }
          if (this.index === index) {
            if (index === 2 && this.sunMaterial) {
              this.sphere.material = this.sunMaterial;
            } else {
              this.material.map = map;
              this.material.bumpMap = map;
              this.material.needsUpdate = true;
            }
            this.container.dataset.surface = 'mapped';
          }
        },
        undefined,
        () => {}
      );
    });

    // Earth cloud layer
    loader.load('./textures/earth_clouds.jpg', map => {
      this.clouds.material.map = null;
      this.clouds.material.alphaMap = map;
      this.clouds.material.opacity = 0.92;
      this.clouds.material.needsUpdate = true;
      this.resources.push(map);
    }, undefined, () => {});

    // Earth night lights
    loader.load('./textures/earth_nightmap.jpg', map => {
      const material = new THREE.ShaderMaterial({
        uniforms: { nightMap: { value: map } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          varying vec2 vUv; varying vec3 vNormal;
          void main(){
            vUv = uv;
            vNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform sampler2D nightMap; varying vec2 vUv; varying vec3 vNormal;
          void main(){
            float darkness = 1.0 - smoothstep(-0.25, 0.4, dot(normalize(vNormal), normalize(vec3(-3.5, 2.0, 3.2))));
            vec3 city = texture2D(nightMap, vUv).rgb;
            gl_FragColor = vec4(city * 1.45, darkness * 0.92);
          }`
      });
      this.night = new THREE.Mesh(this.geometry, material);
      this.night.scale.setScalar(1.003);
      this.night.visible = this.index === 0;
      this.group.add(this.night);
      this.resources.push(map, material);
    }, undefined, () => {});
  }

  resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.system?.resize(w, h);

    // Responsive horizontal positioning for widescreen vs narrow aspect
    if (this.camera.aspect >= 1.3) {
      this.planetCenterX = Math.min(1.65, 1.30 + (this.camera.aspect - 1.3) * 0.35);
      this.planetCenterY = 0.16;
    } else {
      this.planetCenterX = 0;
      this.planetCenterY = 0.55;
    }
    this.group.position.x = this.planetCenterX;
  }

  setOverview(active) {
    this.overview = active;
    this.group.visible = !active;
    if (this.journeyStars) this.journeyStars.visible = !active;
    this.system?.setVisible(active);
    this.container.dataset.view = active ? 'system' : 'planet';
    this.resize();
  }

  select(index) {
    this.index = index;
    if (!this.material) return;

    const isSun = index === 2;
    const isEarth = index === 0;
    const isSaturn = index === 7;

    // Apply materials and lighting
    if (isSun) {
      // The Sun is a self-luminous star: unlit, no external specular hotspots
      this.sphere.material = this.sunMaterial;
      if (this.maps[2]) {
        this.sunMaterial.map = this.maps[2];
        this.sunMaterial.needsUpdate = true;
      }
      this.sunlight.intensity = 0.0;
      this.rimLight.intensity = 0.0;
      this.sunGlow.visible = true;
    } else {
      this.sphere.material = this.material;
      this.material.map = this.maps[index];
      this.material.bumpMap = this.maps[index];
      this.sunlight.intensity = 3.6;
      this.rimLight.intensity = 0.5;
      this.sunGlow.visible = false;
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;

      // Surface relief bump scale (creates stark crater/mountain terminator shadows)
      if (index === 1) {
        // The Moon: High crater relief
        this.material.bumpScale = 0.055;
        this.material.roughness = 0.98;
        this.material.metalness = 0.0;
      } else if (index === 3 || index === 5) {
        // Mercury, Mars: Rocky terrain relief
        this.material.bumpScale = 0.04;
        this.material.roughness = 0.92;
        this.material.metalness = 0.02;
      } else if (index === 0) {
        // Earth: Continental mountain bump + shiny specular oceans
        this.material.bumpScale = 0.022;
        this.material.roughness = 0.55;
        this.material.metalness = 0.12;
      } else {
        // Gas/Ice Giants
        this.material.bumpScale = 0.008;
        this.material.roughness = 0.85;
        this.material.metalness = 0.0;
      }
      this.material.needsUpdate = true;
    }

    this.container.dataset.surface = this.loadedMaps?.has(index) ? 'mapped' : 'illustrated';

    // Earth Atmosphere and Clouds
    this.clouds.visible = isEarth;
    this.atmosphere.visible = isEarth;
    if (this.night) this.night.visible = isEarth;

    // Saturn Rings
    this.rings.visible = isSaturn;

    // Proportional, cinematic celestial scales that fit seamlessly on screen without clipping
    const scales = {
      0: 1.14, // Earth: lush blue marble
      1: 0.88, // The Moon: cratered rocky satellite
      2: 1.35, // The Sun: giant radiant yellow dwarf star
      3: 0.82, // Mercury: dense, sun-baked world
      4: 1.08, // Venus: thick golden cloud cover
      5: 0.94, // Mars: rust-colored planet
      6: 1.32, // Jupiter: immense gas giant with Great Red Spot
      7: 0.95, // Saturn: globe (rings sweep outward to radius 2.33)
      8: 1.10, // Uranus: cyan ice giant
      9: 1.10  // Neptune: cobalt ice giant
    };

    this.targetScale = scales[index] ?? 1.10;

    if (!this.reduced) {
      this.group.scale.setScalar(this.targetScale * 0.92);
    }

    // Uranus tilted axis (98 degrees)
    this.sphere.rotation.z = index === 8 ? 1.35 : 0;
  }

  settings({ reduced, quality, paused }) {
    this.reduced = reduced;
    this.paused = paused;
    if (this.renderer) {
      this.renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.5));
      this.resize();
    }
  }
}
