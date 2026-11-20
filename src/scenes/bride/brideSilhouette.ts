import type { DrawSilhouette } from '../../shared/CutoutFigure';

/** Width / height of the bride canvas. */
export const BRIDE_ASPECT = 0.46;

/**
 * Placeholder bride: a standing woman in a draped sari, a lotus bud raised in one hand, the
 * pallu lifting in the wind. Drawn in white on transparent; the figure shader colours it.
 * Coordinates are in figure units: x from -0.23 to 0.23 (centre 0), y from 0 (head) to 1 (feet).
 * Replace with a real cut-out image when the family's photos arrive.
 */
export const drawBrideSilhouette: DrawSilhouette = (ctx, width, height) => {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, 0);
  ctx.scale(height, height); // 1 unit = figure height
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Hair bun and head.
  ctx.beginPath();
  ctx.ellipse(0.012, 0.062, 0.03, 0.026, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0.118, 0.043, 0.054, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck.
  ctx.fillRect(-0.017, 0.16, 0.034, 0.05);

  // Torso and skirt in one outline: shoulders, waist, hips, then the sari flaring to the floor.
  ctx.beginPath();
  ctx.moveTo(-0.075, 0.215);
  ctx.quadraticCurveTo(0, 0.195, 0.075, 0.215); // shoulders
  ctx.quadraticCurveTo(0.082, 0.3, 0.06, 0.4); // right side to the waist
  ctx.quadraticCurveTo(0.088, 0.5, 0.115, 0.66); // hip, then the skirt opens
  ctx.quadraticCurveTo(0.15, 0.84, 0.17, 1.0); // right hem
  ctx.quadraticCurveTo(0.05, 0.985, -0.06, 1.0); // hem, with a small swell
  ctx.quadraticCurveTo(-0.15, 0.99, -0.17, 1.0); // left hem
  ctx.quadraticCurveTo(-0.14, 0.82, -0.11, 0.66);
  ctx.quadraticCurveTo(-0.085, 0.5, -0.058, 0.4); // left hip to the waist
  ctx.quadraticCurveTo(-0.082, 0.3, -0.075, 0.215);
  ctx.closePath();
  ctx.fill();

  // Pallu: the sari's end, swept out and up on the right by the breeze.
  ctx.beginPath();
  ctx.moveTo(0.05, 0.225);
  ctx.quadraticCurveTo(0.17, 0.26, 0.205, 0.4);
  ctx.quadraticCurveTo(0.235, 0.52, 0.2, 0.64);
  ctx.quadraticCurveTo(0.17, 0.56, 0.135, 0.5);
  ctx.quadraticCurveTo(0.1, 0.42, 0.068, 0.36);
  ctx.closePath();
  ctx.fill();

  // Right arm hangs along the pallu; left arm lifts a lotus bud.
  ctx.lineWidth = 0.026;
  ctx.beginPath();
  ctx.moveTo(-0.07, 0.235);
  ctx.quadraticCurveTo(-0.15, 0.27, -0.145, 0.34);
  ctx.quadraticCurveTo(-0.14, 0.4, -0.17, 0.355);
  ctx.stroke();

  // Lotus bud, held up.
  ctx.beginPath();
  ctx.moveTo(-0.17, 0.355);
  ctx.quadraticCurveTo(-0.205, 0.31, -0.17, 0.25);
  ctx.quadraticCurveTo(-0.135, 0.31, -0.17, 0.355);
  ctx.fill();
  for (const dx of [-0.032, 0.032]) {
    ctx.beginPath();
    ctx.moveTo(-0.17, 0.35);
    ctx.quadraticCurveTo(-0.17 + dx * 1.6, 0.3, -0.17 + dx, 0.262);
    ctx.quadraticCurveTo(-0.17 + dx * 0.4, 0.3, -0.17, 0.35);
    ctx.fill();
  }

  ctx.restore();
};
