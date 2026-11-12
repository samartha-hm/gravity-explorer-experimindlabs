import * as THREE from 'three';
import { PLANETS } from './data.js';

// Physical astronomical orbits around the Sun (Mercury to Neptune)
// Significantly enlarged planets and expanded orbital scale for maximum visual drama
const PLANET_INDICES = [3, 4, 0, 5, 6, 7, 8, 9]; // indices in PLANETS array
const ORBITS = [1.45, 2.15, 2.95, 3.85, 5.35, 6.95, 8.45, 9.85];
const RADII = [0.12, 0.19, 0.23, 0.16, 0.54, 0.44, 0.32, 0.31];
const ANGLES = [2.1, 4.6, 0.4, 3.25, 5.5, 2.5, 0.9, 4.3];

export class SolarSystem {
  constructor(maps, container) {
    this.group = new THREE.Group();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
    // Dramatic low-tilt cinematic angle
    this.camera.position.set(0, 7.2, 14.8);
    this.camera.lookAt(0, 0, 0);
    this.elapsed = 0;

    this.labels = document.createElement('div');
    this.labels.className = 'system-labels';
    this.labels.setAttribute('aria-hidden', 'true');
    container.appendChild(this.labels);

    const geometry = new THREE.SphereGeometry(1, 48, 36);

    // Deep Space 3D Starfield
    const starCount = 3500;
    const starCoords = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [
      [1.0, 1.0, 1.0],       // White
      [0.75, 0.88, 1.0],     // Blue-white
      [1.0, 0.95, 0.8],      // Warm yellow
      [1.0, 0.75, 0.6]       // Orange-red
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 45 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starCoords[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starCoords[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starCoords[i * 3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = c[0];
      starColors[i * 3 + 1] = c[1];
      starColors[i * 3 + 2] = c[2];
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.group.add(this.stars);

    // Cosmic Nebula Dust
    const nebulaCount = 600;
    const nebCoords = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const r = 25 + Math.random() * 35;
      const a = Math.random() * Math.PI * 2;
      nebCoords[i * 3] = Math.cos(a) * r;
      nebCoords[i * 3 + 1] = (Math.random() - 0.5) * 8;
      nebCoords[i * 3 + 2] = Math.sin(a) * r;
    }
    const nebGeo = new THREE.BufferGeometry();
    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebCoords, 3));
    const nebMat = new THREE.PointsMaterial({
      size: 0.55,
      color: 0x3d6e9e,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    this.group.add(new THREE.Points(nebGeo, nebMat));

    // Majestic Blazing Central Sun (Enlarged)
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: maps[2], // Sun map
      color: 0xffe6a0
    });
    this.sunMesh = new THREE.Mesh(geometry, sunMaterial);
    this.sunMesh.scale.setScalar(0.78);
    this.group.add(this.sunMesh);

    // Multi-Layered Solar Corona Halo
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 512;
    const ctx = glowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 16, 256, 256, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.15, 'rgba(255, 230, 130, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 150, 40, 0.45)');
    grad.addColorStop(0.65, 'rgba(255, 80, 15, 0.15)');
    grad.addColorStop(0.95, 'rgba(255, 40, 0, 0.02)');
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
    this.glow.scale.set(6.2, 6.2, 1);
    this.group.add(this.glow);

    // Radiant Sunlight
    const sunlight = new THREE.PointLight(0xfff5e6, 4.5, 0, 0.08);
    this.group.add(sunlight);

    // Planets and Orbit Rings
    this.worlds = PLANET_INDICES.map((pIndex, i) => {
      const planet = PLANETS[pIndex];
      const orbitR = ORBITS[i];

      // Subtle Glowing Orbit Line
      const points = Array.from({ length: 256 }, (_, n) => {
        const a = (n / 256) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
      });
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: planet.color,
          transparent: true,
          opacity: pIndex === 0 ? 0.4 : 0.16
        })
      );
      this.group.add(orbitLine);

      // High-Detail Planet Mesh with Bump & Emissive highlights
      const pMat = new THREE.MeshStandardMaterial({
        map: maps[pIndex],
        bumpMap: maps[pIndex],
        bumpScale: 0.02,
        roughness: pIndex === 0 ? 0.6 : 0.85,
        metalness: pIndex === 0 ? 0.1 : 0.02,
        emissive: planet.color,
        emissiveIntensity: 0.04
      });
      const mesh = new THREE.Mesh(geometry, pMat);
      mesh.scale.setScalar(RADII[i] * 1.6);
      this.group.add(mesh);

      // Saturn Rings (planet index 7)
      if (pIndex === 7) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.35, 2.35, 96),
          new THREE.MeshStandardMaterial({
            color: 0xe0cd9e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            roughness: 0.9
          })
        );
        ring.rotation.x = -Math.PI / 2 + 0.42;
        mesh.add(ring);
      }

      // Earth's Orbiting Moon (planet index 0)
      let moonMesh = null;
      if (pIndex === 0) {
        moonMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            map: maps[1], // Moon map
            bumpMap: maps[1],
            bumpScale: 0.03,
            roughness: 0.95,
            color: 0xdddddd
          })
        );
        moonMesh.scale.setScalar(0.28);
        mesh.add(moonMesh);
      }

      // World Label
      const label = document.createElement('span');
      label.className = `system-label${pIndex === 0 ? ' home-world' : ''}`;
      label.innerHTML = `<i style="--label-color:${planet.color}"></i>${planet.name}`;
      this.labels.appendChild(label);

      return { mesh, label, pIndex, orbitIndex: i, moonMesh };
    });

    // Sun Label
    this.sunLabel = document.createElement('span');
    this.sunLabel.className = 'system-label sun-label';
    this.sunLabel.innerHTML = `<i style="--label-color:#ffb338"></i>THE SUN`;
    this.labels.appendChild(this.sunLabel);

    // Dense Asteroid Belt between Mars (orbit 3.85) and Jupiter (orbit 5.35)
    const dustCount = 2000;
    const dust = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    for (let n = 0; n < dustCount; n++) {
      const angle = n * 2.39996323;
      const radius = 4.4 + (Math.sin(n * 31.7) * 0.5 + 0.5) * 0.55;
      dust[n * 3] = Math.cos(angle) * radius;
      dust[n * 3 + 1] = Math.sin(n * 7.1) * 0.06;
      dust[n * 3 + 2] = Math.sin(angle) * radius;

      const shade = 0.55 + Math.random() * 0.35;
      dustColors[n * 3] = shade * 0.9;
      dustColors[n * 3 + 1] = shade * 0.95;
      dustColors[n * 3 + 2] = shade * 1.05;
    }
    const beltGeometry = new THREE.BufferGeometry();
    beltGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    beltGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    this.group.add(
      new THREE.Points(
        beltGeometry,
        new THREE.PointsMaterial({
          size: 0.022,
          vertexColors: true,
          transparent: true,
          opacity: 0.65,
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
    const distance = Math.max(0.9, 1.48 / this.camera.aspect);
    this.camera.position.set(0, 6.8 * distance, 14.5 * distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  update(dt, moving) {
    if (moving) this.elapsed += dt;

    // Slow orbital rotation of deep stars
    if (this.stars) {
      this.stars.rotation.y = this.elapsed * 0.004;
    }

    // Planets orbit the Sun
    for (const { mesh, label, orbitIndex, moonMesh } of this.worlds) {
      const orbitR = ORBITS[orbitIndex];
      const angle = ANGLES[orbitIndex] + (this.elapsed * 0.075) / Math.sqrt(orbitR);
      mesh.position.set(Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR);
      if (moving) mesh.rotation.y += dt * 0.18;

      // Realistic Moon orbit around Earth
      if (moonMesh && moving) {
        const moonAngle = this.elapsed * 1.4;
        moonMesh.position.set(Math.cos(moonAngle) * 0.42, 0.06, Math.sin(moonAngle) * 0.42);
        moonMesh.rotation.y += dt * 0.35;
      }

      this.placeLabel(label, mesh.position, RADII[orbitIndex]);
    }

    // Sun spin & breathing glow
    if (moving) {
      this.sunMesh.rotation.y += dt * 0.03;
      const pulse = 1.0 + Math.sin(this.elapsed * 1.5) * 0.05;
      this.glow.scale.set(6.2 * pulse, 6.2 * pulse, 1);
    }

    this.placeLabel(this.sunLabel, this.sunMesh.position, 1.5);

    // Collision-free floating world labels
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
