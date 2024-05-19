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

I've checked the map around some of the notable landing points, there's nothing indicating target points at all.
My guess is jump pads show a parabola curve in editor so you can adjust the landing point visually
(varying velocity parameters of the pad) but there's no explicit target.

Properties are:

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

You can get proper launcher direction from its matrix (column 3).
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

There are two types: _DavidM: the legacy stuff uses a 3d velocity, the newer ones a direction and velocity._ ([discord](https://discord.com/channels/411867412045103104/569634940329787452/1241407899436322876))

Here are some examples, the choice of vector and scalar is looked up in the Supraland community map (it shows jump targets).

Jumppad2_49 (uses vector velocity):

```json
      "RelativeVelocity?": false,
      "Velocity": {
        "X": 2550.0,
        "Y": 5200.0,
        "Z": 2100.0
      },
      "RelativeVelocity": 6000.0,
      "AllowStomp": true,
      "PreviewPath": true,
      "PreviewPathTime": 6.0,
```

Jumppad97 (uses scalar velocity):

```json
      "Velocity": {
        "X": 4800.0,
        "Y": 250.0,
        "Z": 3500.0
      },
      "RelativeVelocity": 8700.0,
      "AllowTranslocator": false,
      "PreviewPath": true,
      "PreviewPathTime": 15.0,
```

Jumppad_266 (uses vector velocity):

```json
      "Velocity": {
        "X": -2400.0,
        "Y": -5200.0,
        "Z": 2100.0
      },
      "RelativeVelocity": 5600.0,
      "AllowStomp": true,
      "PreviewPath": true,
      "PreviewPathTime": 6.0,
```

The `RelativeVelocity?` flag doesn't seem to matter (there are pads that use vector without that, e.g. Jumppad_266).

Need investigating, why Jumppad97 uses scalar, but Jumppad_266 uses vector, there must be a version flag or something.

For now it seems that the only property indicating legacy pad is `AllowStomp`.

The underscore in the name is not it (e.g. `Jumppad8` is vector, `Jumppad90` is scalar).

I mark legacy with cyan (3d velocity), newer ones with magenta (scalar velocity).

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



