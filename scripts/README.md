## Scripts

This is based on [UE4Parse](https://github.com/MinshuG/pyUE4Parse.git) json output format.
Current version is pyUE4Parse commit 90e309b.

### Images

You can just export everything in FModel, right click on Materials, "Save Folder's Packages Textures".

* SupralandSIU/Content/Materials/HUDItems.
* SupralandSIU/Content/Blueprints/PlayerMap/Textures
* SupralandSIU/Content/Blueprints/Levelobjects

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

Looks like there's no target point. Properties are:

```json
  {
    "Type": "Jumppad_C",
    "Name": "Jumppad96",
    "Outer": "PersistentLevel",
    "Properties": {
      "Velocity": {
        "X": 4800.0,
        "Y": 250.0,
        "Z": 3500.0
      },
      "RelativeVelocity": 8700.0,
      "AllowTranslocator": false,
      "PreviewPathTime": 15.0,
      "CenterActor": true,
      "Is Activated?": true,
      "DisableMovementInAir": false,
    }
  }
```

If you take direction from matrix (column 3) you instantly get proper launcher orientation.
I'm not sure how to account for velocity, it doesn't seem to affect direction.
Some jumppads don't have compound velocity, oddly Jumppad63/Supraland doesn't have any velocity at all.

Not sure how red and blue launchers are different, it's not about controls.
The first Supraland launchpad right after the village gates is blue but doesn't allow strafing.

This is red one and blue one accordingly:

```json
   "name": "Jumppad79",
      "Velocity": {
        "X": 0.0,
        "Y": 0.0,
        "Z": 1650.0
      },
      "RelativeVelocity": 1000.0,
      "Material": {
        "ObjectName": "MaterialInstanceDynamic_0",
      }

   "name": "Jumppad266",
      "Velocity": {
        "X": -2400.0,
        "Y": -5200.0,
        "Z": 2100.0
      },
      "RelativeVelocity": 5600.0,
      "AllowStomp": true,
      "PreviewPath": true,
      "PreviewPathTime": 6.0,
      "Material": {
        "ObjectName": "MaterialInstanceDynamic_0",
        }

```


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



