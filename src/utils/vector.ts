import type { Vector3 } from "@minecraft/server";
import type { Bounds } from "../types";

export function cloneVector3(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function floorVector3(vector: Vector3): Vector3 {
  return { x: Math.floor(vector.x), y: Math.floor(vector.y), z: Math.floor(vector.z) };
}

export function vectorKey(vector: Vector3): string {
  return `${vector.x},${vector.y},${vector.z}`;
}

export function addVector3(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVector3(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function boundsFromPositions(dimensionId: string, a: Vector3, b: Vector3): Bounds {
  const min = {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
  const max = {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
  const volume = (max.x - min.x + 1) * (max.y - min.y + 1) * (max.z - min.z + 1);
  return { dimensionId, min, max, volume };
}

export function boundsContains(bounds: Bounds, location: Vector3): boolean {
  return (
    location.x >= bounds.min.x &&
    location.x <= bounds.max.x &&
    location.y >= bounds.min.y &&
    location.y <= bounds.max.y &&
    location.z >= bounds.min.z &&
    location.z <= bounds.max.z
  );
}

export function boundsCenter(bounds: Bounds): Vector3 {
  return {
    x: Math.floor((bounds.min.x + bounds.max.x) / 2),
    y: Math.floor((bounds.min.y + bounds.max.y) / 2),
    z: Math.floor((bounds.min.z + bounds.max.z) / 2),
  };
}

export function makeBoundsFromPoints(dimensionId: string, points: Vector3[]): Bounds {
  if (points.length === 0) {
    return { dimensionId, min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, volume: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let minZ = points[0].z;
  let maxX = points[0].x;
  let maxY = points[0].y;
  let maxZ = points[0].z;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }

  return {
    dimensionId,
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    volume: points.length,
  };
}

export function rotateRelative(vector: Vector3, rotation: 0 | 90 | 180 | 270): Vector3 {
  switch (rotation) {
    case 90:
      return { x: -vector.z, y: vector.y, z: vector.x };
    case 180:
      return { x: -vector.x, y: vector.y, z: -vector.z };
    case 270:
      return { x: vector.z, y: vector.y, z: -vector.x };
    default:
      return cloneVector3(vector);
  }
}

export function flipRelative(vector: Vector3, flipX: boolean, flipZ: boolean): Vector3 {
  return {
    x: flipX ? -vector.x : vector.x,
    y: vector.y,
    z: flipZ ? -vector.z : vector.z,
  };
}

export function* cuboidEdgePoints(bounds: Bounds, step = 2): Iterable<Vector3> {
  const pushed = new Set<string>();
  const maybePush = (point: Vector3) => {
    const key = vectorKey(point);
    if (!pushed.has(key)) {
      pushed.add(key);
      return point;
    }
    return undefined;
  };

  for (let x = bounds.min.x; x <= bounds.max.x; x += step) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }

  for (let y = bounds.min.y; y <= bounds.max.y; y += step) {
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }

  for (let z = bounds.min.z; z <= bounds.max.z; z += step) {
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }
}
