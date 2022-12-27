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

## References

* https://github.com/supragamescommunity
* https://github.com/MinshuG/pyUE4Parse
