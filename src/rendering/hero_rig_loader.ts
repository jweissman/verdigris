import { HeroRig } from "./hero_rig";
import heroRigData from "../../data/hero_rig.json";

/**
 * Loads hero rig configuration from JSON data
 */
export class HeroRigLoader {
  static loadFromJSON(): HeroRig {
    const rig = new HeroRig();

    // Load default pose
    if (heroRigData.defaultPose) {
      Object.entries(heroRigData.defaultPose).forEach(
        ([partName, partData]: [string, any]) => {
          rig.setPart(partName as any, {
            name: partName as any,
            sprite: partData.sprite,
            offset: partData.offset,
            rotation: partData.rotation || 0,
            scale: partData.scale || 1,
            frame: partData.frame || 0,
            zIndex: partData.zIndex || 0,
          });
        },
      );
    }

    // Load anchors
    if (heroRigData.anchors) {
      Object.entries(heroRigData.anchors).forEach(
        ([anchorName, anchorData]: [string, any]) => {
          rig.setAnchor(anchorName as any, {
            name: anchorName as any,
            position: { x: 0, y: 0 }, // Will be calculated
            rotation: 0,
            partName: anchorData.partName,
            localOffset: anchorData.localOffset,
          });
        },
      );
    }

    // Load weapons
    if (heroRigData.weapons) {
      Object.entries(heroRigData.weapons).forEach(
        ([weaponType, weaponData]: [string, any]) => {
          rig.setWeaponConfig(weaponType as any, {
            type: weaponType as any,
            sprite: weaponData.sprite,
            offset: weaponData.offset,
            rotation: weaponData.rotation || 0,
            scale: weaponData.scale || 1,
          });
        },
      );
    }

    // Load animations
    if (heroRigData.animations) {
      Object.entries(heroRigData.animations).forEach(
        ([animName, animData]: [string, any]) => {
          rig.addAnimation({
            name: animName,
            loop: animData.loop || false,
            duration: animData.duration || 10,
            frames: animData.frames || [],
          });
        },
      );
    }

    return rig;
  }

  static async loadFromFile(path: string): Promise<HeroRig> {
    try {
      const response = await fetch(path);
      const data = await response.json();
      return this.loadFromJSONData(data);
    } catch (error) {
      console.error("Failed to load hero rig from file:", error);
      // Return default rig
      return new HeroRig();
    }
  }

  static loadFromJSONData(data: any): HeroRig {
    const rig = new HeroRig();

    // Similar loading logic as above but using provided data
    if (data.defaultPose) {
      Object.entries(data.defaultPose).forEach(
        ([partName, partData]: [string, any]) => {
          rig.setPart(partName as any, partData);
        },
      );
    }

    if (data.anchors) {
      Object.entries(data.anchors).forEach(
        ([anchorName, anchorData]: [string, any]) => {
          rig.setAnchor(anchorName as any, anchorData);
        },
      );
    }

    if (data.weapons) {
      Object.entries(data.weapons).forEach(
        ([weaponType, weaponData]: [string, any]) => {
          rig.setWeaponConfig(weaponType as any, weaponData);
        },
      );
    }

    if (data.animations) {
      Object.entries(data.animations).forEach(
        ([animName, animData]: [string, any]) => {
          rig.addAnimation(animData);
        },
      );
    }

    return rig;
  }
}
