## Scripts

Note that local area transforms for SIU are originally stored in the base area, DLC2_Complete.

### Misc

* Jumppad_C - has Velocity/RelativeVelocity but no "target", angles seem inaccurate (uses spline path?)
* PipeCap_C - (pipe teleports) can't find any connection between them
* TeleportObjectVolume_C - looks like it's mostly used for destroying objects
* TriggerVolume_C - many of them, multi-purpose
* MinecraftBrick_C - exports HitsToBreak, bObsidian. Need to export/support BrickType.
* Lift1_C - vertical lifts
* Coin_C - note there's no such entity as "coin stash", only small/big coins and chest spawns

### Jumppads

Could not figure out how they work just yet. Rotation doesn't seem to match the direction.

### Pipes

Pipe teleports use PipesystemNew_C and PipesystemNewDLC_C classes. Example:

```json
  {
    "Type": "PipesystemNew_C",
    "Name": "PipesystemNew39",
    "Outer": "PersistentLevel",
    "Properties": {
      "OtherPipe": {
        "ObjectName": "Secret_TeleportPipe1"
        ...
          }
        }
      "PipeCap": {
        "ObjectName": "PipeCap11"
        ...
      }
	}
```

PipeCap11 and Secret_TeleportPipe1 are the ends of the pipe.

