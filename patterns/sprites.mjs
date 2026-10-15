import { patterns } from './index.mjs';
import { timeline } from './motion.mjs';

export function spriteIDs(list = patterns) {
  const ids = new Set();
  for (const pattern of list) {
    const example = pattern.example();
    for (const object of example.objects) ids.add(object.sprite);
    for (const tile of example.beltTiles ?? []) ids.add(tile.sprite ?? 'transport-belt');
    for (const arm of example.arms ?? []) ids.add(arm.sprite);
    for (const flow of timeline(example)) for (const leg of flow.legs) {
      if (leg.icon && !(leg.fly && leg.empty)) ids.add(leg.icon);
      if (leg.fly) ids.add(leg.robot ?? 'logistic-robot');
    }
  }
  return [...ids].sort();
}
