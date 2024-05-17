## Scripts

This is based on [UE4Parse](https://github.com/MinshuG/pyUE4Parse.git) json output format.
Current version is pyUE4Parse commit 90e309b.

### Transforms

SIU introduces areas, each area has its own world matrix. you have to transform objects accordingly.
Properties for all STU areas (i.e. names/transforms) are stored in the base area, DLC2_Complete.

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

Pipe teleports use `PipesystemNew_C` and PipesystemNewDLC_C classes.
Example (PipeCap11 and Secret_TeleportPipe1 are the ends of the pipe):

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
      "Pipe": {
        "Outer": "PipeCap11"
        ...
      }
	}
```

"OtherPipe" may be substituted with "otherPipeInOtherLevel", e.g.

```json
    "Type": "PipesystemNewDLC_C",
    "Name": "Area1_FastTravelPipe",
    "Outer": "PersistentLevel",
    "Properties": {
      "otherPipeInOtherLevel": {
        "AssetPathName": "/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete",
        "SubPathString": "PersistentLevel.PipeToArea1"
      },
    }
```

Some pipes (e.g. "NODE_AddChildActorComponent-1_PipesystemNewDLC_C_CAT_3" do not have "other pipe")
They are initialized in pipe system builders, `PipeSystemBuilder_C` (not supported yet).

