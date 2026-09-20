/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates high-resolution procedural textures for Earth, clouds, solar cells, and antenna
 */
export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean background with subtle gradients
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0c2340');
  oceanGrad.addColorStop(0.5, '#07162c');
  oceanGrad.addColorStop(1, '#0c2340');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw procedural continental landmasses
  ctx.fillStyle = '#1e3d2f';
  // North America
  drawLandBlob(ctx, 450, 320, 240, 160, '#2d5a3f', '#1b3b2b');
  // South America
  drawLandBlob(ctx, 620, 680, 160, 250, '#386641', '#24442b');
  // Eurasia
  drawLandBlob(ctx, 1300, 300, 480, 220, '#325d43', '#1e3d2c');
  // Africa
  drawLandBlob(ctx, 1100, 560, 220, 260, '#59693c', '#3c4728');
  // Australia
  drawLandBlob(ctx, 1650, 720, 180, 140, '#60583b', '#423d29');
  // Greenland
  drawLandBlob(ctx, 720, 150, 110, 90, '#c2d4d8', '#9cb0b5');
  // Antarctica
  ctx.fillStyle = '#dbe9ee';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height - 40, 900, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw shallow coastal waters around continents
  ctx.fillStyle = '#0f3b56';
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 4 + Math.random() * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates roughness map for specular ocean reflections
 * Oceans are low roughness (high specular reflection), land is high roughness
 */
export function createEarthRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Oceans: very low roughness (#080808) gives sharp specular sun glint
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Continents: high roughness (#e5e5e5) gives diffuse reflection
  ctx.fillStyle = '#e5e5e5';
  drawLandBlob(ctx, 450, 320, 240, 160, '#e5e5e5', '#d4d4d4');
  drawLandBlob(ctx, 620, 680, 160, 250, '#e5e5e5', '#d4d4d4');
  drawLandBlob(ctx, 1300, 300, 480, 220, '#e5e5e5', '#d4d4d4');
  drawLandBlob(ctx, 1100, 560, 220, 260, '#e5e5e5', '#d4d4d4');
  drawLandBlob(ctx, 1650, 720, 180, 140, '#e5e5e5', '#d4d4d4');
  drawLandBlob(ctx, 720, 150, 110, 90, '#f0f0f0', '#e5e5e5');

  // Antarctica
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height - 40, 900, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function drawLandBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color1: string,
  color2: string
) {
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;

  ctx.beginPath();
  const points = 16;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const noise = 0.75 + Math.sin(angle * 4) * 0.15 + Math.cos(angle * 7) * 0.1;
    const x = cx + Math.cos(angle) * rx * noise;
    const y = cy + Math.sin(angle) * ry * noise;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle interior mountain ridges
  ctx.fillStyle = '#4a5335';
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.1, cy - ry * 0.1, rx * 0.35, ry * 0.45, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

/**
 * Procedural Earth night lights texture
 */
export function createNightLightsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clusters of golden / amber city lights on land regions
  const clusters = [
    { x: 230, y: 160, r: 80, count: 180 }, // US East & Midwest
    { x: 160, y: 180, r: 60, count: 90 },  // US West
    { x: 530, y: 140, r: 70, count: 200 }, // Western Europe
    { x: 670, y: 190, r: 70, count: 160 }, // India
    { x: 780, y: 170, r: 85, count: 250 }, // East Asia / Japan
    { x: 310, y: 350, r: 50, count: 80 },  // Brazil coast
    { x: 840, y: 370, r: 40, count: 50 },  // Australia East
    { x: 560, y: 320, r: 35, count: 40 },  // South Africa
  ];

  clusters.forEach((cluster) => {
    for (let i = 0; i < cluster.count; i++) {
      const dist = Math.pow(Math.random(), 0.6) * cluster.r;
      const angle = Math.random() * Math.PI * 2;
      const x = cluster.x + Math.cos(angle) * dist;
      const y = cluster.y + Math.sin(angle) * dist;
      const radius = 0.6 + Math.random() * 1.6;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
      grad.addColorStop(0, 'rgba(255, 230, 160, 0.95)');
      grad.addColorStop(0.5, 'rgba(255, 180, 80, 0.6)');
      grad.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/**
 * Procedural swirling atmospheric clouds
 */
export function createCloudsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft atmospheric cloud ribbons
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * canvas.width;
    const y = 80 + Math.random() * (canvas.height - 160);
    const rw = 20 + Math.random() * 90;
    const rh = 6 + Math.random() * 22;
    const angle = (Math.random() - 0.5) * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/**
 * Solar panel high-tech silicon cell texture
 */
export function createSolarPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark metallic navy/cyan silicon
  ctx.fillStyle = '#071529';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = 8;
  const rows = 32;
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;

      // Cell border
      ctx.fillStyle = '#0b2647';
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

      // Micro grid lines
      ctx.strokeStyle = '#275d8e';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + cellW / 2, y + 1);
      ctx.lineTo(x + cellW / 2, y + cellH - 1);
      ctx.stroke();

      // Busbar conductive silver lines
      ctx.strokeStyle = '#7ca9d6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + cellH / 2);
      ctx.lineTo(x + cellW - 1, y + cellH / 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Phased array antenna microstrip patch texture
 */
export function createPhasedArrayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111822';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hexagonal array of dielectric resonator / micro-antenna elements
  const size = 16;
  ctx.fillStyle = '#1a324b';
  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 0.8;

  for (let y = 8; y < canvas.height; y += size) {
    const row = Math.floor(y / size);
    const offsetX = (row % 2) * (size / 2);
    for (let x = 8 + offsetX; x < canvas.width; x += size) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center feed point
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a324b';
    }
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Creates Earth topographic normal bump map (Tangent-space normal map: R=Nx, G=Ny, B=Nz)
 * Encodes continental relief, Rocky Mountains, Andes, Alps, and Himalayas.
 */
export function createEarthNormalTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = width;
  heightCanvas.height = height;
  const hCtx = heightCanvas.getContext('2d')!;

  // 0 = ocean baseline
  hCtx.fillStyle = '#000000';
  hCtx.fillRect(0, 0, width, height);

  // Helper to draw height blobs
  const drawHeightArea = (cx: number, cy: number, rx: number, ry: number, baseH: number, peakH: number) => {
    const grad = hCtx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, `rgb(${peakH}, ${peakH}, ${peakH})`);
    grad.addColorStop(0.7, `rgb(${baseH}, ${baseH}, ${baseH})`);
    grad.addColorStop(1, 'rgb(0, 0, 0)');
    hCtx.fillStyle = grad;
    hCtx.beginPath();
    hCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    hCtx.fill();
  };

  // North America & Rocky Mountains
  drawHeightArea(230, 160, 110, 80, 50, 140);
  drawHeightArea(190, 150, 35, 75, 90, 220); // Rocky Mountains ridge

  // South America & Andes Mountains
  drawHeightArea(310, 340, 75, 120, 60, 150);
  drawHeightArea(270, 340, 22, 110, 100, 230); // Andes mountain range

  // Europe & Alps
  drawHeightArea(530, 140, 90, 60, 50, 120);
  drawHeightArea(525, 155, 30, 18, 90, 200); // Alps

  // Asia & Himalayas / Tibetan Plateau
  drawHeightArea(680, 160, 180, 90, 60, 160);
  drawHeightArea(690, 185, 80, 35, 140, 255); // Himalayas & Tibetan Plateau

  // Africa (Atlas & Rift Valley)
  drawHeightArea(530, 270, 95, 110, 55, 120);
  drawHeightArea(580, 290, 25, 80, 70, 170); // East African Rift

  // Australia
  drawHeightArea(830, 355, 75, 55, 45, 110);

  // Compute Sobel normals
  const heightData = hCtx.getImageData(0, 0, width, height);
  const hPixels = heightData.data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const nCtx = normalCanvas.getContext('2d')!;
  const normalData = nCtx.createImageData(width, height);
  const nPixels = normalData.data;

  const strength = 1.8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const xLeft = (x > 0 ? x - 1 : width - 1);
      const xRight = (x < width - 1 ? x + 1 : 0);
      const yTop = (y > 0 ? y - 1 : 0);
      const yBottom = (y < height - 1 ? y + 1 : height - 1);

      const hL = hPixels[(y * width + xLeft) * 4];
      const hR = hPixels[(y * width + xRight) * 4];
      const hU = hPixels[(yTop * width + x) * 4];
      const hD = hPixels[(yBottom * width + x) * 4];

      const dx = (hR - hL) / 255.0 * strength;
      const dy = (hD - hU) / 255.0 * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = (dx / len) * 0.5 + 0.5;
      const ny = (-dy / len) * 0.5 + 0.5;
      const nz = (dz / len) * 0.5 + 0.5;

      nPixels[idx] = Math.floor(nx * 255);
      nPixels[idx + 1] = Math.floor(ny * 255);
      nPixels[idx + 2] = Math.floor(nz * 255);
      nPixels[idx + 3] = 255;
    }
  }

  nCtx.putImageData(normalData, 0, 0);
  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.ClampToEdgeWrapping;
  return normalTex;
}

/**
 * Creates hexagonal beam service cell footprint texture
 */
export function createHexCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  // Draw hexagonal cell grid
  const r = 24;
  const h = r * Math.sqrt(3);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
  ctx.lineWidth = 1.2;

  const drawHex = (cx: number, cy: number, rad: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + rad * Math.cos(angle);
      const y = cy + rad * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };

  for (let y = -h; y < 256 + h; y += h) {
    const row = Math.round(y / h);
    const offsetX = (row % 2) * (r * 1.5);
    for (let x = -r * 2; x < 256 + r * 2; x += r * 3) {
      drawHex(x + offsetX, y, r * 0.92);
    }
  }

  // Soft circular vignette mask
  const grad = ctx.createRadialGradient(128, 128, 60, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
