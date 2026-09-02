import { Injectable, signal } from '@angular/core';

export type FitnessFigureId = 'shaker' | 'weights' | 'squat';

export interface FitnessFigureOption {
  id: FitnessFigureId;
  label: string;
}

export const FITNESS_FIGURES: readonly FitnessFigureOption[] = [
  { id: 'shaker', label: 'Shaker' },
  { id: 'weights', label: 'Pesas' },
  { id: 'squat', label: 'Sentadilla' },
] as const;

/** Estado compartido: figura activa + rotación libre con inercia. */
@Injectable({ providedIn: 'root' })
export class ShakerInteraction {
  readonly dragging = signal(false);
  readonly figure = signal<FitnessFigureId>('shaker');

  rotX = 0;
  rotY = 0;
  rotZ = 0;

  angVelX = 0;
  angVelY = 0;
  angVelZ = 0;

  private lastX = 0;
  private lastY = 0;
  private readonly sensitivity = Math.PI / 360;

  setFigure(id: FitnessFigureId): void {
    if (this.figure() === id) return;
    this.figure.set(id);
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this.angVelX = 0;
    this.angVelY = 0;
    this.angVelZ = 0;
  }

  start(clientX: number, clientY: number): void {
    this.dragging.set(true);
    this.lastX = clientX;
    this.lastY = clientY;
    this.angVelX = 0;
    this.angVelY = 0;
    this.angVelZ = 0;
  }

  move(clientX: number, clientY: number): void {
    if (!this.dragging()) return;

    const dx = clientX - this.lastX;
    const dy = clientY - this.lastY;
    this.lastX = clientX;
    this.lastY = clientY;

    const dPitch = dy * this.sensitivity;
    const dYaw = dx * this.sensitivity;
    const dRoll = dx * this.sensitivity * 0.35;

    this.rotX += dPitch;
    this.rotY += dYaw;
    this.rotZ += dRoll;

    this.angVelX = dPitch * 18;
    this.angVelY = dYaw * 18;
    this.angVelZ = dRoll * 18;
  }

  end(): void {
    this.dragging.set(false);
  }

  tick(delta: number): void {
    if (this.dragging()) return;

    this.rotX += this.angVelX * delta;
    this.rotY += this.angVelY * delta;
    this.rotZ += this.angVelZ * delta;

    const decay = Math.pow(0.08, delta);
    this.angVelX *= decay;
    this.angVelY *= decay;
    this.angVelZ *= decay;

    if (Math.abs(this.angVelX) < 0.001) this.angVelX = 0;
    if (Math.abs(this.angVelY) < 0.001) this.angVelY = 0;
    if (Math.abs(this.angVelZ) < 0.001) this.angVelZ = 0;
  }

  intensity(): number {
    return Math.min(
      1.5,
      Math.hypot(this.angVelX, this.angVelY, this.angVelZ) * 0.35 + (this.dragging() ? 0.35 : 0)
    );
  }
}
