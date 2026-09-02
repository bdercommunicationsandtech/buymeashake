import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { beforeRender, extend, NgtArgs } from 'angular-three';
import {
  AmbientLight,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { ShakerInteraction } from './shaker-interaction';

const LIME = '#c9ff3d';
const VOID = '#090c0a';
const PLATE = '#1a2744';
const BAR = '#c5cdd8';

extend({
  Group,
  Mesh,
  CylinderGeometry,
  CapsuleGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  AmbientLight,
  DirectionalLight,
  Color,
});

@Component({
  selector: 'app-shaker-scene',
  standalone: true,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngt-color *args="[voidBg]" attach="background" />

    <ngt-ambient-light [intensity]="0.85" />
    <ngt-directional-light [position]="[2.5, 4, 3]" [intensity]="0.9" />

    <!-- Contenedor común: rotación libre del usuario -->
    <ngt-group #stage [position]="[0, -0.05, 0]">
      <!-- ——— Shaker ——— -->
      <ngt-group #shaker [scale]="0.68" [visible]="figure() === 'shaker'">
        <ngt-mesh [position]="[0.12, 1.22, 0]" [rotation]="[0, 0, Math.PI / 2]">
          <ngt-cylinder-geometry *args="[0.055, 0.055, 0.22, 12]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0.05" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 1.08, 0]">
          <ngt-cylinder-geometry *args="[0.28, 0.3, 0.2, 28]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0.05" [opacity]="0.9" [transparent]="true" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 0.9, 0]">
          <ngt-cylinder-geometry *args="[0.4, 0.4, 0.16, 28]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.35" [metalness]="0.05" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 0.12, 0]">
          <ngt-cylinder-geometry *args="[0.36, 0.28, 1.35, 36]" />
          <ngt-mesh-standard-material
            [color]="lime"
            [roughness]="0.55"
            [metalness]="0"
            [transparent]="true"
            [opacity]="0.16"
            [depthWrite]="false"
          />
        </ngt-mesh>
        <ngt-mesh #liquid [position]="[0, -0.12, 0]" [scale]="[0.82, 0.55, 0.82]">
          <ngt-cylinder-geometry *args="[0.34, 0.27, 1.2, 32]" />
          <ngt-mesh-standard-material
            [color]="lime"
            [roughness]="0.35"
            [metalness]="0"
            [transparent]="true"
            [opacity]="0.45"
          />
        </ngt-mesh>
        <ngt-mesh #bubbleA [position]="[-0.08, -0.05, 0.14]">
          <ngt-sphere-geometry *args="[0.035, 12, 12]" />
          <ngt-mesh-standard-material color="#ffffff" [transparent]="true" [opacity]="0.5" [roughness]="0.2" />
        </ngt-mesh>
        <ngt-mesh #bubbleB [position]="[0.1, 0.05, -0.08]">
          <ngt-sphere-geometry *args="[0.025, 12, 12]" />
          <ngt-mesh-standard-material color="#ffffff" [transparent]="true" [opacity]="0.4" [roughness]="0.2" />
        </ngt-mesh>
      </ngt-group>

      <!--
        Brazo curl: una sola cadena hombro → codo → antebrazo → mancuerna.
        Todo el antebrazo cuelga del codo (sin huecos).
      -->
      <ngt-group
        #weights
        [visible]="figure() === 'weights'"
        [position]="[0, 0.05, 0]"
        [rotation]="[0.2, 0.65, 0.25]"
        [scale]="1.05"
      >
        <!-- Hombro / deltoides -->
        <ngt-mesh [position]="[-0.72, 0.02, 0]" [scale]="[1.15, 1, 1]">
          <ngt-sphere-geometry *args="[0.3, 24, 24]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.42" [metalness]="0" />
        </ngt-mesh>

        <!-- Brazo superior (une hombro con codo) -->
        <ngt-mesh [position]="[-0.34, 0.0, 0]" [rotation]="[0, 0, Math.PI / 2]">
          <ngt-capsule-geometry *args="[0.17, 0.38, 6, 16]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.42" [metalness]="0" />
        </ngt-mesh>

        <!-- Bíceps (pico sobre el brazo, como la ilustración) -->
        <ngt-mesh #bicep [position]="[-0.18, 0.32, 0.04]" [scale]="[1.25, 1.1, 1.05]">
          <ngt-sphere-geometry *args="[0.26, 24, 24]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.38" [metalness]="0" />
        </ngt-mesh>
        <ngt-mesh [position]="[0.0, 0.46, 0.02]" [scale]="[0.9, 0.75, 0.85]">
          <ngt-sphere-geometry *args="[0.14, 16, 16]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.35" [metalness]="0" />
        </ngt-mesh>

        <!-- Codo: rellena la articulación -->
        <ngt-mesh [position]="[0.12, -0.04, 0]">
          <ngt-sphere-geometry *args="[0.15, 18, 18]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.42" [metalness]="0" />
        </ngt-mesh>

        <!-- Antebrazo + puño + mancuerna (hijo del codo) — flexionado ~90° -->
        <ngt-group #forearm [position]="[0.12, -0.04, 0]" [rotation]="[0, 0, 1.15]">
          <!-- Antebrazo continuo desde el codo (+X local) -->
          <ngt-mesh [position]="[0.4, 0.06, 0]" [rotation]="[0, 0, Math.PI / 2]">
            <ngt-capsule-geometry *args="[0.145, 0.42, 6, 16]" />
            <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
          </ngt-mesh>

          <!-- Puño agarrando la barra -->
          <ngt-mesh [position]="[0.78, 0.08, 0]" [scale]="[1.2, 0.95, 1.05]">
            <ngt-sphere-geometry *args="[0.145, 16, 16]" />
            <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
          </ngt-mesh>
          <ngt-mesh [position]="[0.9, 0.16, 0.02]" [scale]="[0.75, 0.5, 1.05]">
            <ngt-sphere-geometry *args="[0.1, 12, 12]" />
            <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
          </ngt-mesh>

          <!-- Mancuerna atravesando el puño -->
          <ngt-group [position]="[0.82, 0.06, 0]" [rotation]="[0.12, 0.08, 0]">
            <ngt-mesh [rotation]="[Math.PI / 2, 0, 0]">
              <ngt-cylinder-geometry *args="[0.048, 0.048, 1.15, 14]" />
              <ngt-mesh-standard-material [color]="bar" [roughness]="0.3" [metalness]="0.6" />
            </ngt-mesh>

            <!-- Discos izq (doble) -->
            <ngt-mesh [position]="[0, 0, 0.46]" [rotation]="[Math.PI / 2, 0, 0]">
              <ngt-cylinder-geometry *args="[0.24, 0.24, 0.15, 24]" />
              <ngt-mesh-standard-material [color]="plate" [roughness]="0.4" [metalness]="0.2" />
            </ngt-mesh>
            <ngt-mesh [position]="[0, 0, 0.33]" [rotation]="[Math.PI / 2, 0, 0]">
              <ngt-cylinder-geometry *args="[0.18, 0.18, 0.1, 20]" />
              <ngt-mesh-standard-material [color]="plate" [roughness]="0.35" [metalness]="0.25" />
            </ngt-mesh>

            <!-- Discos der (doble) -->
            <ngt-mesh [position]="[0, 0, -0.46]" [rotation]="[Math.PI / 2, 0, 0]">
              <ngt-cylinder-geometry *args="[0.24, 0.24, 0.15, 24]" />
              <ngt-mesh-standard-material [color]="plate" [roughness]="0.4" [metalness]="0.2" />
            </ngt-mesh>
            <ngt-mesh [position]="[0, 0, -0.33]" [rotation]="[Math.PI / 2, 0, 0]">
              <ngt-cylinder-geometry *args="[0.18, 0.18, 0.1, 20]" />
              <ngt-mesh-standard-material [color]="plate" [roughness]="0.35" [metalness]="0.25" />
            </ngt-mesh>
          </ngt-group>
        </ngt-group>
      </ngt-group>

      <!-- ——— Persona en sentadilla ——— -->
      <ngt-group #squat [scale]="0.85" [visible]="figure() === 'squat'" [position]="[0, -0.35, 0]">
        <ngt-mesh [position]="[0, 1.55, 0]">
          <ngt-sphere-geometry *args="[0.18, 16, 16]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
        </ngt-mesh>
        <ngt-mesh #torso [position]="[0, 1.05, 0]">
          <ngt-cylinder-geometry *args="[0.12, 0.14, 0.7, 12]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.45" [metalness]="0" [transparent]="true" [opacity]="0.9" />
        </ngt-mesh>
        <!-- Brazos al frente -->
        <ngt-mesh [position]="[-0.35, 1.15, 0.15]" [rotation]="[0.4, 0, 0.9]">
          <ngt-cylinder-geometry *args="[0.05, 0.055, 0.55, 10]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
        </ngt-mesh>
        <ngt-mesh [position]="[0.35, 1.15, 0.15]" [rotation]="[0.4, 0, -0.9]">
          <ngt-cylinder-geometry *args="[0.05, 0.055, 0.55, 10]" />
          <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
        </ngt-mesh>
        <!-- Pierna izq -->
        <ngt-group #thighL [position]="[-0.1, 0.7, 0]">
          <ngt-mesh [position]="[-0.05, -0.2, 0]" [rotation]="[0, 0, 0.25]">
            <ngt-cylinder-geometry *args="[0.07, 0.08, 0.45, 10]" />
            <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
          </ngt-mesh>
          <ngt-group #shinL [position]="[-0.12, -0.42, 0]">
            <ngt-mesh [position]="[0, -0.22, 0]">
              <ngt-cylinder-geometry *args="[0.06, 0.065, 0.45, 10]" />
              <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
            </ngt-mesh>
          </ngt-group>
        </ngt-group>
        <!-- Pierna der -->
        <ngt-group #thighR [position]="[0.1, 0.7, 0]">
          <ngt-mesh [position]="[0.05, -0.2, 0]" [rotation]="[0, 0, -0.25]">
            <ngt-cylinder-geometry *args="[0.07, 0.08, 0.45, 10]" />
            <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
          </ngt-mesh>
          <ngt-group #shinR [position]="[0.12, -0.42, 0]">
            <ngt-mesh [position]="[0, -0.22, 0]">
              <ngt-cylinder-geometry *args="[0.06, 0.065, 0.45, 10]" />
              <ngt-mesh-standard-material [color]="lime" [roughness]="0.4" [metalness]="0" />
            </ngt-mesh>
          </ngt-group>
        </ngt-group>
      </ngt-group>
    </ngt-group>
  `,
})
export class ShakerScene {
  protected readonly Math = Math;
  protected readonly lime = LIME;
  protected readonly voidBg = VOID;
  protected readonly plate = PLATE;
  protected readonly bar = BAR;

  private readonly interaction = inject(ShakerInteraction);
  protected readonly figure = this.interaction.figure;

  private readonly stageRef = viewChild.required<ElementRef<Group>>('stage');
  private readonly liquidRef = viewChild<ElementRef<Mesh>>('liquid');
  private readonly bubbleARef = viewChild<ElementRef<Mesh>>('bubbleA');
  private readonly bubbleBRef = viewChild<ElementRef<Mesh>>('bubbleB');
  private readonly forearmRef = viewChild<ElementRef<Group>>('forearm');
  private readonly bicepRef = viewChild<ElementRef<Mesh>>('bicep');
  private readonly thighLRef = viewChild<ElementRef<Group>>('thighL');
  private readonly thighRRef = viewChild<ElementRef<Group>>('thighR');
  private readonly shinLRef = viewChild<ElementRef<Group>>('shinL');
  private readonly shinRRef = viewChild<ElementRef<Group>>('shinR');
  private readonly squatRef = viewChild<ElementRef<Group>>('squat');

  private time = 0;

  constructor() {
    beforeRender(({ delta }) => {
      this.time += delta;
      this.interaction.tick(delta);

      const stage = this.stageRef().nativeElement;
      const dragging = this.interaction.dragging();
      const intensity = this.interaction.intensity();
      const fig = this.interaction.figure();

      stage.rotation.x = this.interaction.rotX;
      stage.rotation.y = this.interaction.rotY;
      stage.rotation.z = this.interaction.rotZ;

      const nearlyStill = !dragging && intensity < 0.05;
      stage.position.y = -0.05 + (nearlyStill ? Math.sin(this.time * 1.4) * 0.015 : 0);

      if (fig === 'shaker') {
        this.animateShaker(intensity);
      } else if (fig === 'weights') {
        this.animateWeights(dragging, intensity);
      } else {
        this.animateSquat(dragging, intensity);
      }
    });
  }

  private animateShaker(intensity: number): void {
    const liquid = this.liquidRef()?.nativeElement;
    const bubbleA = this.bubbleARef()?.nativeElement;
    const bubbleB = this.bubbleBRef()?.nativeElement;
    if (!liquid || !bubbleA || !bubbleB) return;

    liquid.rotation.z = -this.interaction.angVelY * 0.04;
    liquid.rotation.x = -this.interaction.angVelX * 0.04;
    liquid.position.y = -0.12 + Math.sin(this.time * 8) * intensity * 0.03;

    this.floatBubble(bubbleA, -0.08, -0.05, 0.14, intensity, 0);
    this.floatBubble(bubbleB, 0.1, 0.05, -0.08, intensity, 1.4);
  }

  private animateWeights(dragging: boolean, intensity: number): void {
    const forearm = this.forearmRef()?.nativeElement;
    const bicep = this.bicepRef()?.nativeElement;
    if (!forearm) return;

    // Curl suave manteniendo la V flexionada (nunca se estira del todo)
    const speed = dragging || intensity > 0.2 ? 2.4 : 1.35;
    const wave = Math.sin(this.time * speed) * 0.5 + 0.5;
    forearm.rotation.z = 0.95 + wave * 0.4;
    forearm.rotation.y = Math.sin(this.time * speed * 0.5) * 0.04;

    if (bicep) {
      const flex = 1 + wave * 0.08;
      bicep.scale.set(1.25 * flex, 1.1 * flex, 1.05);
    }
  }

  private animateSquat(dragging: boolean, intensity: number): void {
    const thighL = this.thighLRef()?.nativeElement;
    const thighR = this.thighRRef()?.nativeElement;
    const shinL = this.shinLRef()?.nativeElement;
    const shinR = this.shinRRef()?.nativeElement;
    const squat = this.squatRef()?.nativeElement;
    if (!thighL || !thighR || !shinL || !shinR || !squat) return;

    const speed = dragging || intensity > 0.2 ? 2.6 : 1.35;
    const t = (Math.sin(this.time * speed) * 0.5 + 0.5); // 0 = up, 1 = down

    thighL.rotation.z = 0.15 + t * 0.55;
    thighR.rotation.z = -0.15 - t * 0.55;
    shinL.rotation.z = -t * 0.85;
    shinR.rotation.z = t * 0.85;
    squat.position.y = -0.35 - t * 0.22;
  }

  private floatBubble(
    mesh: Mesh,
    baseX: number,
    baseY: number,
    baseZ: number,
    intensity: number,
    phase: number
  ): void {
    const t = this.time * 4.5 + phase;
    mesh.position.set(
      baseX + Math.sin(t) * 0.015,
      baseY + (0.5 + 0.5 * Math.sin(t)) * (0.06 + intensity * 0.08),
      baseZ
    );
    mesh.scale.setScalar(0.85 + 0.2 * Math.abs(Math.sin(t)));
  }
}
