# Supraland

Live map: https://joric.github.io/supraland

I did not do much, all credit goes to David Münnich and Supraland Games Community.

## Assets

Use FModel (https://fmodel.app) to extract assets (Settings - Game's Archive Directory - Paks).
Export map to json: open pak, select Content/FirstPersonBP/Maps/mapname.umap, context menu - Save Properies.
Same with textures (game maps are in Content/Blueprints/PlayerMap).

FModel may not work for large maps, so I ended using a wonderful UE4Parse Python library (see scripts directory).

The base map for DLC2 is DLC2_Complete.umap, it includes all other maps internally (look for "LevelTransform" keys).
The base map size is also included in this umap (look for "MapWorldSize").

Supraland Crash doesn't have a map in resources so it was captured in the game engine (not by me) in 2048x2048
([raw_image](https://github.com/SupraGamesCommunity/map-slc/blob/11dc702ece83254fe1de1a567c3c3b890147f95d/img/map.jpg)) 
and then upscaled to 8192x8192. It's probably possible to upscale other maps as well, say to 32768x32768 (4x) with something
like [Upscayl](https://upscayl.github.io) but it's quite slow and the size will be 16x (~256 megs for 3 maps).

## References

* https://github.com/supragamescommunity
* https://github.com/MinshuG/pyUE4Parse
