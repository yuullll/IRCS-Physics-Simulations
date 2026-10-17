import * as THREE from 'three';
import { SourceCharge, calculateElectricPotential } from './coulomb';

export type SlicePlaneOrientation = 'xz' | 'xy' | 'yz';

/**
 * Generates an equipotential canvas texture with scalar voltage color coding
 * and discrete contour lines (iso-potential rings).
 */
export function generateEquipotentialTexture(
  charges: SourceCharge[],
  orientation: SlicePlaneOrientation,
  planeOffset: number,
  size: number = 256,
  extent: number = 24
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const halfExtent = extent / 2;
  const step = extent / size;

  // Precompute potentials across grid
  const potentials = new Float32Array(size * size);
  let minV = Infinity;
  let maxV = -Infinity;

  const p = new THREE.Vector3();

  for (let py = 0; py < size; py++) {
    const vCoord = (py * step) - halfExtent;
    for (let px = 0; px < size; px++) {
      const uCoord = (px * step) - halfExtent;

      if (orientation === 'xz') {
        p.set(uCoord, planeOffset, vCoord);
      } else if (orientation === 'xy') {
        p.set(uCoord, -vCoord, planeOffset);
      } else {
        // yz
        p.set(planeOffset, -vCoord, uCoord);
      }

      const V = calculateElectricPotential(p, charges);
      potentials[py * size + px] = V;
      if (V < minV) minV = V;
      if (V > maxV) maxV = V;
    }
  }

  // Draw smooth potential field with distinct equipotential contour rings
  const contourInterval = 15000; // 15 kV per contour band

  for (let i = 0; i < potentials.length; i++) {
    const V = potentials[i];
    const pixelIndex = i * 4;

    // Normalization mapping with log scale compression
    const sign = Math.sign(V);
    const absLog = Math.log10(1 + Math.abs(V) * 0.0001);
    const norm = Math.min(Math.max(absLog / 3.0, 0), 1.0);

    // Equipotential contour detection: check if V is near a multiple of contourInterval
    const phase = Math.abs(V) / contourInterval;
    const distToContour = Math.abs(phase - Math.round(phase));
    const isContourLine = distToContour < 0.06;

    let r = 10, g = 18, b = 35;
    let alpha = 140;

    if (sign > 0) {
      // Positive potential: warm coral / red
      r = Math.floor(20 + 220 * norm);
      g = Math.floor(30 + 60 * norm);
      b = Math.floor(60 + 40 * (1 - norm));
    } else if (sign < 0) {
      // Negative potential: cool cyan / deep blue
      r = Math.floor(20 + 30 * (1 - norm));
      g = Math.floor(50 + 150 * norm);
      b = Math.floor(80 + 175 * norm);
    }

    if (isContourLine) {
      // Highlight iso-potential contour line in bright amber or white
      r = 255;
      g = 255;
      b = 255;
      alpha = 240;
    }

    data[pixelIndex] = r;
    data[pixelIndex + 1] = g;
    data[pixelIndex + 2] = b;
    data[pixelIndex + 3] = alpha;
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
