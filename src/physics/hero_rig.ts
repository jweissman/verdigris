import { Vec2 } from "../types/Vec2";
import { KinematicSolver } from "./kinematics";

export interface Bone {
  name: string;
  start: Vec2;
  end: Vec2;
  length: number;
  angle: number; // Relative to parent or absolute for root
  parent?: Bone;
  children: Bone[];
  constraints?: {
    minAngle: number;
    maxAngle: number;
  };
}

export interface AnimationFrame {
  bones: Map<string, BoneTransform>;
  duration: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface BoneTransform {
  angle: number;
  scale?: number;
  offset?: Vec2;
}

export interface Weapon {
  type: string;
  sprite?: string;
  length: number;
  damage: number;
  socketOffset: Vec2;
  angleOffset: number;

  swingAnimation?: AnimationFrame[];
  idleAngle?: number;
}

export class HeroRig {
  public position: Vec2;
  public facing: "left" | "right" = "right";
  public skeleton: Map<string, Bone> = new Map();
  public animations: Map<string, AnimationFrame[]> = new Map();

  private currentAnimation?: string;
  private animationTime: number = 0;
  private animationFrame: number = 0;
  private blendTarget?: string;
  private blendTime: number = 0;
  private blendDuration: number = 0;

  public weapon?: Weapon;
  public weaponSocket: string = "right_hand";

  constructor(position: Vec2) {
    this.position = position;
    this.createDefaultSkeleton();
    this.createDefaultAnimations();
  }

  private createDefaultSkeleton() {
    const torso = this.createBone("torso", null, 3, -Math.PI / 2);
    const head = this.createBone("head", torso, 1.5, 0);

    const rightShoulder = this.createBone("right_shoulder", torso, 0.5, 0);
    const rightArm = this.createBone(
      "right_arm",
      rightShoulder,
      2,
      Math.PI / 4,
    );
    const rightForearm = this.createBone(
      "right_forearm",
      rightArm,
      1.5,
      Math.PI / 8,
    );
    const rightHand = this.createBone("right_hand", rightForearm, 0.5, 0);

    const leftShoulder = this.createBone("left_shoulder", torso, 0.5, Math.PI);
    const leftArm = this.createBone(
      "left_arm",
      leftShoulder,
      2,
      (3 * Math.PI) / 4,
    );
    const leftForearm = this.createBone(
      "left_forearm",
      leftArm,
      1.5,
      -Math.PI / 8,
    );
    const leftHand = this.createBone("left_hand", leftForearm, 0.5, 0);

    const hips = this.createBone("hips", null, 0.5, Math.PI / 2);
    const rightThigh = this.createBone(
      "right_thigh",
      hips,
      2,
      Math.PI / 2 + Math.PI / 8,
    );
    const rightShin = this.createBone("right_shin", rightThigh, 2, 0);
    const rightFoot = this.createBone(
      "right_foot",
      rightShin,
      0.8,
      Math.PI / 2,
    );

    const leftThigh = this.createBone(
      "left_thigh",
      hips,
      2,
      Math.PI / 2 - Math.PI / 8,
    );
    const leftShin = this.createBone("left_shin", leftThigh, 2, 0);
    const leftFoot = this.createBone("left_foot", leftShin, 0.8, Math.PI / 2);

    rightArm.constraints = { minAngle: -Math.PI / 2, maxAngle: Math.PI };
    rightForearm.constraints = { minAngle: 0, maxAngle: Math.PI * 0.8 };
    leftArm.constraints = { minAngle: 0, maxAngle: Math.PI * 1.5 };
    leftForearm.constraints = { minAngle: -Math.PI * 0.8, maxAngle: 0 };

    this.skeleton.get("torso")!.parent = this.skeleton.get("hips");
    this.skeleton.get("hips")!.children.push(this.skeleton.get("torso")!);

    this.updateSkeleton();
  }

  private createBone(
    name: string,
    parent: Bone | null,
    length: number,
    angle: number,
  ): Bone {
    const bone: Bone = {
      name,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      length,
      angle,
      parent: parent || undefined,
      children: [],
    };

    if (parent) {
      parent.children.push(bone);
    }

    this.skeleton.set(name, bone);
    return bone;
  }

  private createDefaultAnimations() {
    this.animations.set("idle", [
      {
        bones: new Map([
          ["torso", { angle: -Math.PI / 2 }],
          ["right_arm", { angle: Math.PI / 4 }],
          ["left_arm", { angle: (3 * Math.PI) / 4 }],
        ]),
        duration: 30,
        easing: "easeInOut",
      },
      {
        bones: new Map([
          ["torso", { angle: -Math.PI / 2 - 0.05 }],
          ["right_arm", { angle: Math.PI / 4 + 0.05 }],
          ["left_arm", { angle: (3 * Math.PI) / 4 - 0.05 }],
        ]),
        duration: 30,
        easing: "easeInOut",
      },
    ]);

    this.animations.set("walk", [
      {
        bones: new Map([
          ["right_thigh", { angle: Math.PI / 2 + Math.PI / 6 }],
          ["left_thigh", { angle: Math.PI / 2 - Math.PI / 6 }],
          ["right_arm", { angle: Math.PI / 4 - Math.PI / 8 }],
          ["left_arm", { angle: (3 * Math.PI) / 4 + Math.PI / 8 }],
        ]),
        duration: 15,
      },
      {
        bones: new Map([
          ["right_thigh", { angle: Math.PI / 2 - Math.PI / 6 }],
          ["left_thigh", { angle: Math.PI / 2 + Math.PI / 6 }],
          ["right_arm", { angle: Math.PI / 4 + Math.PI / 8 }],
          ["left_arm", { angle: (3 * Math.PI) / 4 - Math.PI / 8 }],
        ]),
        duration: 15,
      },
    ]);

    this.animations.set("swing", [
      {
        bones: new Map([
          ["right_arm", { angle: Math.PI / 2 }],
          ["right_forearm", { angle: Math.PI / 4 }],
          ["torso", { angle: -Math.PI / 2 + Math.PI / 8 }],
        ]),
        duration: 5,
        easing: "easeIn",
      },
      {
        bones: new Map([
          ["right_arm", { angle: -Math.PI / 4 }],
          ["right_forearm", { angle: Math.PI / 2 }],
          ["torso", { angle: -Math.PI / 2 - Math.PI / 8 }],
        ]),
        duration: 3,
        easing: "easeOut",
      },
      {
        bones: new Map([
          ["right_arm", { angle: Math.PI / 4 }],
          ["right_forearm", { angle: Math.PI / 8 }],
          ["torso", { angle: -Math.PI / 2 }],
        ]),
        duration: 10,
        easing: "easeOut",
      },
    ]);
  }

  public updateSkeleton() {
    const hips = this.skeleton.get("hips");
    if (hips) {
      this.updateBoneFK(hips, this.position);
    }
  }

  private updateBoneFK(bone: Bone, parentEnd: Vec2) {
    bone.start = parentEnd;

    const angleMultiplier = this.facing === "left" ? -1 : 1;
    const adjustedAngle =
      this.facing === "left" && bone.name.includes("right")
        ? Math.PI - bone.angle
        : bone.angle;

    bone.end = {
      x: bone.start.x + Math.cos(adjustedAngle) * bone.length * angleMultiplier,
      y: bone.start.y + Math.sin(bone.angle) * bone.length,
    };

    for (const child of bone.children) {
      this.updateBoneFK(child, bone.end);
    }
  }

  public playAnimation(name: string) {
    if (this.animations.has(name)) {
      this.currentAnimation = name;
      this.animationTime = 0;
      this.animationFrame = 0;
    }
  }

  public update(deltaTime: number = 1) {
    if (!this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation || animation.length === 0) return;

    this.animationTime += deltaTime;

    let frameIndex = 0;
    let timeInFrame = this.animationTime;

    for (let i = 0; i < animation.length; i++) {
      if (timeInFrame <= animation[i].duration) {
        frameIndex = i;
        break;
      }
      timeInFrame -= animation[i].duration;
      if (i === animation.length - 1) {
        this.animationTime = 0;
        frameIndex = 0;
        timeInFrame = 0;
      }
    }

    const currentFrame = animation[frameIndex];
    const nextFrame = animation[(frameIndex + 1) % animation.length];
    const t = timeInFrame / currentFrame.duration;

    const easedT = this.applyEasing(t, currentFrame.easing || "linear");

    for (const [boneName, targetTransform] of currentFrame.bones) {
      const bone = this.skeleton.get(boneName);
      if (!bone) continue;

      const nextTransform = nextFrame.bones.get(boneName);
      if (nextTransform) {
        bone.angle = this.lerp(
          targetTransform.angle,
          nextTransform.angle,
          easedT,
        );
      } else {
        bone.angle = targetTransform.angle;
      }

      if (bone.constraints) {
        bone.angle = Math.max(
          bone.constraints.minAngle,
          Math.min(bone.constraints.maxAngle, bone.angle),
        );
      }
    }

    this.updateSkeleton();
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case "easeIn":
        return t * t;
      case "easeOut":
        return 1 - (1 - t) * (1 - t);
      case "easeInOut":
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public equipWeapon(weapon: Weapon) {
    this.weapon = weapon;
  }

  public getWeaponTransform(): { position: Vec2; angle: number } | null {
    if (!this.weapon) return null;

    const socket = this.skeleton.get(this.weaponSocket);
    if (!socket) return null;

    return {
      position: {
        x: socket.end.x + this.weapon.socketOffset.x,
        y: socket.end.y + this.weapon.socketOffset.y,
      },
      angle: socket.angle + this.weapon.angleOffset,
    };
  }

  public reachFor(boneName: string, target: Vec2): boolean {
    const bone = this.skeleton.get(boneName);
    if (!bone) return false;

    const chain: Bone[] = [];
    let current: Bone | undefined = bone;
    while (current) {
      chain.unshift(current);
      current = current.parent;
    }

    const points: Vec2[] = chain.map((b) => ({ ...b.start }));
    points.push({ ...chain[chain.length - 1].end });

    const lengths = chain.map((b) => b.length);

    const reached = KinematicSolver.solveFABRIK(points, lengths, target);

    if (reached) {
      for (let i = 0; i < chain.length; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        chain[i].angle = Math.atan2(dy, dx);

        if (chain[i].constraints) {
          chain[i].angle = Math.max(
            chain[i].constraints.minAngle,
            Math.min(chain[i].constraints.maxAngle, chain[i].angle),
          );
        }
      }

      this.updateSkeleton();
    }

    return reached;
  }

  public getRenderData(): any {
    const bones: any[] = [];

    for (const bone of this.skeleton.values()) {
      bones.push({
        start: { x: bone.start.x * 8, y: bone.start.y * 8 },
        end: { x: bone.end.x * 8, y: bone.end.y * 8 },
        name: bone.name,
      });
    }

    return { bones, weapon: this.getWeaponTransform() };
  }
}
