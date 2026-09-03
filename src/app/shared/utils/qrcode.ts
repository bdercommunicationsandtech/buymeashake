import qrcodeFactory from './qrcode-generator';

export type QrVariant = 'light' | 'dark';

interface QrFactory {
  (typeNumber: number, errorCorrectionLevel: string): QrInstance;
  stringToBytesFuncs: Record<string, (s: string) => number[]>;
  stringToBytes: (s: string) => number[];
}

interface QrInstance {
  addData(data: string, mode?: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

const qrcode = qrcodeFactory as unknown as QrFactory;
if (qrcode.stringToBytesFuncs?.['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

/**
 * Builds a QR matrix for the given text (auto version, ECC M, byte mode).
 */
export function generateQrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    matrix.push(row);
  }
  return matrix;
}

export function qrMatrixToDataUrl(
  matrix: boolean[][],
  opts: { moduleSize?: number; margin?: number; dark?: string; light?: string } = {},
): string {
  const modulePx = opts.moduleSize ?? 8;
  const margin = opts.margin ?? 2;
  const dark = opts.dark ?? '#000000';
  const light = opts.light ?? '#ffffff';
  const size = (matrix.length + margin * 2) * modulePx;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          (c + margin) * modulePx,
          (r + margin) * modulePx,
          modulePx,
          modulePx,
        );
      }
    }
  }
  return canvas.toDataURL('image/png');
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawShakerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  // Lime rounded square
  ctx.fillStyle = '#c9ff3d';
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fill();

  // Black shaker silhouette
  const s = size;
  const ox = x + s * 0.28;
  const oy = y + s * 0.18;
  ctx.fillStyle = '#0a0a0a';
  // Cap
  roundRect(ctx, ox + s * 0.12, oy, s * 0.2, s * 0.1, 2);
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.06, oy + s * 0.12);
  ctx.lineTo(ox + s * 0.38, oy + s * 0.12);
  ctx.lineTo(ox + s * 0.34, oy + s * 0.55);
  ctx.quadraticCurveTo(ox + s * 0.22, oy + s * 0.64, ox + s * 0.1, oy + s * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawPhoneIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineJoin = 'round';
  roundRect(ctx, x, y, size * 0.62, size, size * 0.12);
  ctx.stroke();
  // speaker notch
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.14);
  ctx.lineTo(x + size * 0.42, y + size * 0.14);
  ctx.stroke();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const len = size * 0.16;
  const thick = Math.max(5, size * 0.04);
  const gap = size * 0.045;
  ctx.strokeStyle = color;
  ctx.lineWidth = thick;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  const drawL = (cx: number, cy: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * len, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * len);
    ctx.stroke();
  };

  drawL(x - gap, y - gap, 1, 1); // top-left
  drawL(x + size + gap, y - gap, -1, 1); // top-right
  drawL(x - gap, y + size + gap, 1, -1); // bottom-left
  drawL(x + size + gap, y + size + gap, -1, -1); // bottom-right
}

/**
 * Renders the share card (light or dark) as a PNG data URL.
 */
export function renderShareCardPng(params: {
  profileUrl: string;
  displayPath: string;
  variant: QrVariant;
  width?: number;
}): string {
  const width = params.width ?? 900;
  const height = Math.round(width * 1.28);
  const matrix = generateQrMatrix(params.profileUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const isLight = params.variant === 'light';
  const lime = '#c9ff3d';
  const pad = width * 0.09;

  // Card background with rounded corners (clip)
  roundRect(ctx, 0, 0, width, height, width * 0.08);
  ctx.clip();

  if (isLight) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    // Subtle X / radial geometric pattern
    ctx.save();
    ctx.translate(width / 2, height * 0.48);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = width * 0.08;
    const span = width * 0.9;
    for (let i = -3; i <= 3; i++) {
      const o = i * width * 0.12;
      ctx.beginPath();
      ctx.moveTo(-span + o, -span);
      ctx.lineTo(span + o, span);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(span + o, -span);
      ctx.lineTo(-span + o, span);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Header: logo + brand
  const logoSize = width * 0.07;
  const headerY = pad * 0.95;
  drawShakerIcon(ctx, pad, headerY, logoSize);

  ctx.fillStyle = isLight ? '#0a0a0a' : '#ffffff';
  ctx.font = `800 ${Math.round(width * 0.048)}px Montserrat, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('buymeashake.fit', pad + logoSize + width * 0.03, headerY + logoSize / 2);

  // QR area
  const qrOuter = width * 0.58;
  const qrX = (width - qrOuter) / 2;
  const qrY = height * 0.28;

  if (isLight) {
    // draw QR with quiet zone then brackets
    const qrImgSize = qrOuter * 0.88;
    const qrImgX = qrX + (qrOuter - qrImgSize) / 2;
    const qrImgY = qrY + (qrOuter - qrImgSize) / 2;
    drawQrOnCanvas(ctx, matrix, qrImgX, qrImgY, qrImgSize);
    drawCornerBrackets(ctx, qrX, qrY, qrOuter, lime);
  } else {
    // white square behind QR
    const boxPad = qrOuter * 0.08;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrX, qrY, qrOuter, qrOuter, width * 0.02);
    ctx.fill();
    drawQrOnCanvas(ctx, matrix, qrX + boxPad, qrY + boxPad, qrOuter - boxPad * 2);
  }

  // CTA
  const ctaY = qrY + qrOuter + height * 0.06;
  const phoneSize = width * 0.045;
  const ctaText = 'Escanéame';
  ctx.font = `800 ${Math.round(width * 0.042)}px Montserrat, system-ui, sans-serif`;
  const textW = ctx.measureText(ctaText).width;
  const gap = width * 0.02;
  const contentW = phoneSize * 0.62 + gap + textW;

  if (isLight) {
    const pillH = width * 0.09;
    const pillW = contentW + width * 0.1;
    const pillX = (width - pillW) / 2;
    ctx.fillStyle = lime;
    roundRect(ctx, pillX, ctaY, pillW, pillH, pillH / 2);
    ctx.fill();
    const innerY = ctaY + pillH / 2;
    const startX = pillX + (pillW - contentW) / 2;
    drawPhoneIcon(ctx, startX, innerY - phoneSize / 2, phoneSize, '#0a0a0a');
    ctx.fillStyle = '#0a0a0a';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, startX + phoneSize * 0.62 + gap, innerY);
  } else {
    const startX = (width - contentW) / 2;
    drawPhoneIcon(ctx, startX, ctaY, phoneSize, lime);
    ctx.fillStyle = lime;
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, startX + phoneSize * 0.62 + gap, ctaY + phoneSize / 2);
  }

  // Footer URL
  ctx.fillStyle = isLight ? '#0a0a0a' : '#ffffff';
  ctx.font = `600 ${Math.round(width * 0.032)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const footerY = isLight ? ctaY + width * 0.14 : ctaY + width * 0.1;
  ctx.fillText(params.displayPath, width / 2, footerY);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

function drawQrOnCanvas(
  ctx: CanvasRenderingContext2D,
  matrix: boolean[][],
  x: number,
  y: number,
  size: number,
): void {
  const n = matrix.length;
  const cell = size / n;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(x + c * cell, y + r * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
