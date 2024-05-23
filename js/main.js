let map = null;
let mapId = '';
let localDataName = 'joricsSupraland1';
let localData = JSON.parse(localStorage.getItem(localDataName)) || {};
let layers = {};
let classes = {};
let icons = {};
let playerStart;
let playerMarker;
let reloading;
let settings;
let experimentalSearch = true;
let mapZoom = 4;
let mapBounds;

var maps = {
  // data taken from the MapWorld* nodes
  'sl':  { 
      title: 'Supraland',
      "MapWorldCenter": { "X": 13000.0, "Y": -2000.0, "Z": 0.0 },
      "MapWorldSize": 175000.0,
      "MapWorldUpperLeft": { "X": -74500.0, "Y": -89500.0, "Z": 0.0 },
      "MapWorldLowerRight": { "X": 100500.0, "Y": 85500.0, "Z": 0.0 },
   },

  'slc': {
    title: 'Supraland Crash',
      "MapWorldCenter": { "X": 25991.0, "Y": -16.0, "Z": 0.0  },
      "MapWorldSize": 90112.0,
      "MapWorldUpperLeft": { "X": -19065.0, "Y": -45040.0, "Z": 0.0 },
      "MapWorldLowerRight": { "X": 71047.0, "Y": 45072.0, "Z": 0.0 },
   },

  'siu': {
      title: 'Supraland Six Inches Under',
      "MapWorldCenter": { "X": 0.0, "Y": -19000.0, "Z": 10000.0 },
      "MapWorldSize": 147456.0,
      "MapWorldUpperLeft": { "X": -73728.0, "Y": -92728.0, "Z": 10000.0 },
      "MapWorldLowerRight": { "X": 73728.0, "Y": 54728.0, "Z": 10000.0 },
   },
};

function saveSettings() {
  localStorage.setItem(localDataName, JSON.stringify(localData));
}

function clearFilter() {
  settings.searchText = '';
  saveSettings();
  markItems();
}

function loadMap() {
  for (id in maps) {
    var title = maps[id].title;
    if (!localData[id]) {
      localData[id] = {};
    }
    if (!localData[id].markedItems) {
      localData[id].markedItems = {};
    }
    if (!localData[id].searchText) {
      localData[id].searchText = '';
    }
    if (!localData[id].activeLayers) {
      localData[id].activeLayers = {'closedChest':true, 'shop':true, 'collectable':true};
      if (id=='sl') {
        localData[id].activeLayers['pads']=true;
        localData[id].activeLayers['pipes']=true;
      }
    }
  }

  localData.mapId = mapId;
  saveSettings();

  settings = localData[mapId];

  //console.log(localData);

  var mapSize = {width: 8192, height: 8192}
  var tileSize   = {x: 512, y: 512};
  var tileMaxSet = 4;
  var mapMinResolution = Math.pow(2, tileMaxSet);

  document.querySelector('#map').style.backgroundColor = mapId=='siu' ? '#141414' : '#000';

  var w = maps[mapId];

  // fixes 404 errors
  w.MapWorldUpperLeft.X  += 1;
  w.MapWorldUpperLeft.Y += 1;
  w.MapWorldLowerRight.X -= 1;
  w.MapWorldLowerRight.Y -= 1;

  mapBounds = [
    [ w.MapWorldUpperLeft.Y, w.MapWorldUpperLeft.X ],
    [ w.MapWorldLowerRight.Y, w.MapWorldLowerRight.X ]
  ];

  var m = w.MapWorldSize / mapSize.width;
  var mapScale   = {x: 1.0/m, y: 1.0/m};
  var mapOrigin  = {x: -w.MapWorldUpperLeft.X * mapScale.x, y: -w.MapWorldUpperLeft.Y * mapScale.y};

  // Create a coordinate system for the map
  var crs = L.CRS.Simple;
  crs.transformation = new L.Transformation(mapScale.x, mapOrigin.x, mapScale.y, mapOrigin.y);
  crs.scale = function (zoom) { return Math.pow(2, zoom) / mapMinResolution; };
  crs.zoom = function (scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };
  let gap = w.MapWorldSize/2;

  //Create the map
  map = new L.Map('map', {
    crs: crs,
    fadeAnimation: false,
    maxBounds: [
      [ w.MapWorldUpperLeft.Y - gap, w.MapWorldUpperLeft.X - gap ],
      [ w.MapWorldLowerRight.Y + gap, w.MapWorldLowerRight.X + gap ]
    ],
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomright'}).addTo(map);
  L.control.fullscreen({ position: 'bottomright', forceSeparateButton: true}).addTo(map);

  layerOptions = {
      tileSize: L.point(tileSize.x, tileSize.y),
      noWrap: true,
      tms: false,
      updateInterval: -1,
      keepBuffer: 16,
      maxNativeZoom: 4,
      nativeZooms: [0, 1, 2, 3, 4],
      bounds: mapBounds,
      attribution: '<a href="https://github.com/joric/supraland" target="_blank">Joric\'s Supraland</a>',
  };

  let layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright',
  });

  map.on('moveend', function(e) {
    settings.center = map.getCenter();
    settings.zoom = map.getZoom();
    saveSettings();
  });

  map.on('baselayerchange', function(e) {
    id = e.layer.mapId;
    //localStorage.setItem(mapId, location.hash);
    location.hash = '';
    map.off();
    map.remove();
    map = null;
    playerMarker = null;
    mapId = id
    loadMap(id);
  });

  map.on('overlayadd', function(e) {
    settings.activeLayers[e.layer.id] = true;
    // set alt for polylines (attributes are not populated to paths)
    for (const m of Object.values(layers[e.layer.id]._layers)) {
      if (p = m._path) {
        p.setAttribute('alt', m.options.alt);
      }
    }
    markItems();
    saveSettings();
  });

  map.on('overlayremove', function(e) {
    delete settings.activeLayers[e.layer.id];
    markItems();
    saveSettings();
  });

  map.on('zoomend', function(e) {
    mapZoom = e.target._zoom;
  });

  tilesDir = 'tiles/'+mapId;

  // L.tileLayer.canvas() is much faster than L.tileLayer() but requires a L.TileLayer.Canvas plugin
  let baseLayer = L.tileLayer(tilesDir+'/base/{z}/{x}/{y}.jpg', layerOptions).addTo(map);

  for (id in maps) {
    var title = maps[id].title;
    var layer = id==mapId ? baseLayer : L.layerGroup();
    layer.mapId = id;
    layerControl.addBaseLayer(layer, title);
  }

  if (mapId == 'sl') {
    for (const [id, title] of Object.entries({'pipes':'Pipes', 'pads':'Pads'})) {
      var layer =  L.tileLayer.canvas(tilesDir+'/'+id+'/{z}/{x}/{y}.png', layerOptions);
      layer.id = id;
      if (settings.activeLayers[id]) {
        layer.addTo(map);
      }
      layerControl.addOverlay(layer, title);
    }
  }

  L.control.mousePosition().addTo(map);

  if (settings.center && settings.zoom) {
    map.setView(settings.center, settings.zoom);
  } else {
    map.fitBounds(mapBounds);
  }

  function newAction(conf) {
    var ImmediateSubAction = L.Toolbar2.Action.extend({
      initialize: function(map, myAction) {
          this.map = map;
          this.myAction = myAction;
          L.Toolbar2.Action.prototype.initialize.call(this);
      },
      addHooks: function() { this.myAction.disable(); }
    });

    var Cancel = ImmediateSubAction.extend({
        options: {
            toolbarIcon: {
                html: '&times;',
                tooltip: 'Cancel'
            }
        }
    });

    subActions = []

    for (const [title, className] of Object.entries(conf.actions)) {
          a = ImmediateSubAction.extend({
              options: {
                  toolbarIcon: {
                      html: title, //'<img src="img/'+title+'.png"/>',
                      tooltip: title,
                      className: className,
                  },
              },
              addHooks: function() {
                //typeof func === 'function' ? func() : function(){}
                //this.myAction.disable();
              }
          });
        subActions.push(a);
    }

    subActions.push(Cancel);

    return L.Toolbar2.Action.extend({
        options: {
            toolbarIcon: {
                html: conf.icon,
                tooltip: conf.tooltip,
            },
            subToolbar: new L.Toolbar2({ 
                actions: subActions
            })
        }
    });
  }

  actions = []
  actions.push(newAction({icon:'&#x1F4C1;', tooltip:'Upload Save File', actions:{'Instructions':'copy-path', 'Load Game':'upload-save', 'Unmark All': 'unmark-items' }}));
  let toolbar = new L.Toolbar2.Control({actions: actions, position: 'bottomleft'}).addTo(map);

  document.querySelector('.copy-path').onclick = function(e) {
    window.putSavefileLocationOnClipboard();
  }

  document.querySelector('#file').onchange = function(e) {
    window.loadSaveFile();
    document.querySelector('.leaflet-toolbar-1').style.display = 'none';
  }

  document.querySelector('.upload-save').onclick = function(e) {
    document.querySelector('#file').value = null;
    document.querySelector('#file').accept = '.sav';
    document.querySelector('#file').click();
  }

  document.querySelector('.unmark-items').onclick = function(e) {
    if (confirm('Are you sure to unmark all items?')) {
      unmarkItems();
      saveSettings();
    }
  }

  function loadMarkersLegacy() {
    chestIconBig = L.icon({iconUrl: 'img/chest.png', iconSize: [64,64], iconAnchor: [32,32]});
    filename = 'data/legacy/' + mapId + '/chests.csv';
    var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
      var chests = 0;
      for (o of results.data) {
        if (!o.x) {
          continue;
        }
        chests += 1;
        var layer = 'closedChest';
        m = L.marker([o.y, o.x], {icon: chestIconBig, title: o.type, zIndexOffset: -100 }).addTo(layers[layer])
        .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'));
      }
    }});
  }

  function onContextMenu(e) {
    let markerId = e.target.options.alt;
    let found = settings.markedItems[markerId]==true;
    markItemFound(markerId, !found);
    e.target.closePopup();
  }

  function onPopupOpen(e) {
    let x = e.popup._source._latlng.lng;
    let y = e.popup._source._latlng.lat;
    let markerId = e.popup._source.options.alt;

    let dist = Infinity;
    let res = null;

    let text = JSON.stringify(e.popup._source.options.o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;');
    let found = settings.markedItems[markerId]==true
    let value = found ? 'checked' : '';

    // it's not "found" but rather "removed" (e.g. BuySword2_2 in the beginning of Crash DLC)
    text += '<br><br><input type="checkbox" id="'+markerId+'" '+value+' onclick=markItemFound("'+markerId+'",this.checked)><label for="'+markerId+'">Found</label>';
    e.popup.setContent(text);

    for (const lookup of ['chests.csv', 'collectables.csv', 'shops.csv']) {
      filename = 'data/legacy/' + mapId + '/'+lookup;
      var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
        var chests = 0;
        for (o of results.data) {
          if (!o.x) {
            continue;
          }
          let d = Math.pow(  Math.pow(o.x-x, 2) + Math.pow(o.y-y, 2), 0.5);
          if (d<dist) {
            dist = d;
            res = o;
          }
        }
        if (dist<1000 && res.ytVideo) {
          let url = 'https://youtu.be/'+res.ytVideo+'&?t='+res.ytStart;
          e.popup.setContent(text + '<br><br><a href="'+url+'" target=_blank>'+url+'</a>');
        }
      }});
    }
  }

  function loadMarkers() {
    for (const fname of ['markers','custom-markers'])
    fetch('data/'+fname+'.'+mapId+'.json')
      .then((response) => response.json())
      .then((j) => {
        let objects = {};
        let titles = {};
        for (o of j) {

          let alt = o.area + ':' + o.name;

          // skip markers out of bounds (e.g. "PipesystemNew_AboveSewer" in DLC2_Area0)
          let [[top,left],[bottom,right]] = mapBounds;
          if (! (o.lng>left && o.lng<right && o.lat>top && o.lat<bottom )) {
            continue;
          }

          // skip PipeCap_C (decorative) until we find a reliable link to the pipe system
          if (o.type == 'PipeCap_C') {
            continue;
          }

          // check if class is in the types list
          if (c = classes[o.type]) {
            let text = ''; // set it later in onPopupOpen

            let title = o.name;
            let defaultIcon = 'question_mark';
            let defaultLayer = 'misc';
            let icon = c.icon || defaultIcon;
            let layer = layers[c.layer] ? c.layer : defaultLayer;

            // can't have duplicate titles in search
            if (titles[title]) {
              title = o.area + ':' + o.name;
            }

            titles[title] = title;

            if (o.type.endsWith('Chest_C')) {
              icon = 'chest';
              layer = 'closedChest';
              if (o.spawns) {
                title = title + ' ('+o.spawns+')';
              } else if (o.coins) {
                title = title + ' ('+o.coins+' coin'+(o.coins>1?'s':'')+')';
              }
            } else {
              title = title + ' ('+o.type+')';
            }

            // all items you can purchase are marked as shops. note they may overlap "upgrades" and spawns. 
            if (o.type.startsWith('Buy') || o.type.startsWith('BP_Buy') || o.type.startsWith('Purchase') || o.type.startsWith('BP_Purchase')) {
              let icon = 'shop';
              let layer = 'shop';
              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: 10, alt: alt, o:o, layer:layer }).addTo(layers[layer])
              .bindPopup(text)
              .on('popupopen', onPopupOpen)
              .on('contextmenu',onContextMenu)
              ;
            }

            // finally, add marker (base marker goes in the middle)
            L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: 100, alt: alt, o:o, layer:layer }).addTo(layers[layer])
            .bindPopup(text)
            .on('popupopen', onPopupOpen)
            .on('contextmenu',onContextMenu)
            ;

            // we also have to put all spawns up there as separate markers, they may overlap already listed items (legacy thing)
            if (s = classes[o.spawns]) {
              let icon = s.icon || defaultIcon;
              let layer = layers[s.layer] ? s.layer : defaultLayer;
              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: 1000, alt: alt, o:o, layer:layer }).addTo(layers[layer])
              .bindPopup(text)
              .on('popupopen', onPopupOpen)
              .on('contextmenu',onContextMenu)
              ;
            }

          } // end of all items that have types entry

          // add dynamic player marker on top of PlayerStart icon
          if (o.type == 'PlayerStart' && !playerMarker) {
            playerStart = [o.lat, o.lng, o.alt];
            let t = new L.LatLng(o.lat, o.lng);
            if (p = settings.playerPosition) {
              t = new L.LatLng(p[0], p[1]);
            }
            playerMarker = L.marker([t.lat, t.lng], {zIndexOffset: 10000, draggable: true, title: Math.round(t.lat)+', '+Math.round(t.lng), alt:'playerMarker'})
            .bindPopup()
            .on('moveend', function(e) {
              let marker = e.target;
              let t = marker.getLatLng();
              settings.playerPosition = [t.lat, t.lng, 0];
              saveSettings();
              e.target._icon.title = Math.round(t.lat)+', '+Math.round(t.lng)
            })
            .on('popupopen', function(e) {
                let marker = e.target;
                let t = marker.getLatLng();
                t = {name:'playerPosition', lat:Math.round(t.lat), lng:Math.round(t.lng)};
                marker.setPopupContent(JSON.stringify(t, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'));
                marker.openPopup();
            }).addTo(map)
          }

          // collect objects for the 2-nd pass
          objects[alt] = o;

        } // end of loop

        // 2-nd pass (pads and pipes)
        for (name of Object.keys(objects)) {
          let o = objects[name];
          let alt = o.area + ':' + o.name

          if (o.type == 'Jumppad_C' && o.target) {
            if (r = o.direction) {
              let color = (o.allow_stomp || o.disable_movement==false) ? 'dodgerblue' : 'red';

              // need to add title as a single space (leaflet search issue), but not the full title so it doesn't appear in search
              let line = L.polyline([[o.lat, o.lng],[o.target.y,o.target.x]], {title:' ', alt:alt, color: color}).addTo(layers['jumppads']);
              line._path && line._path.setAttribute('alt', alt);
            }
          }

          // pipes
          if (o.other_pipe) {
            if (p = objects[o.other_pipe]) {
              let line = L.polyline([[o.lat, o.lng],[p.lat, p.lng]], {title:' ', alt:alt, color: 'yellowgreen'}).addTo(layers['pipesys']);
              line._path && line._path.setAttribute('alt', alt);
            }
          }
         
        } // end of 2-nd pass

        markItems();
    });
  }

  function loadLayers() {
      playerMarker = null;
      filename = 'data/layers.csv';

      let activeLayers = [];
      let inactiveLayers = [];
      let searchLayers = [];

      var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
        for (o of results.data) {
          if (!o.id) {
            continue;
          }
          if (o.id=='pipes' || o.id=='pads') {
            continue;
          }
          if (o.id=='graves' && mapId!='sl') {
            continue;
          }

          let layerObj = L.layerGroup();
          layerObj.id = o.id;

          if (settings.activeLayers[o.id]) {
            layerObj.addTo(map);
            activeLayers.push(layerObj);
          } else {
            inactiveLayers.push(layerObj);
          }

          layers[o.id] = layerObj;
          layerControl.addOverlay(layerObj, o.name);
          searchLayers.push(layerObj);
        }

        if (experimentalSearch) {

          searchControl = new L.Control.Search({
              layer: L.featureGroup(searchLayers),
              marker: false, // no red circle
              initial: false, // search any substring
              firstTipSubmit: false, // use first autosuggest
              autoCollapse: false,
              tipAutoSubmit: false, //auto map panTo when click on tooltip
              tooltipLimit: -1,
          }).addTo(map);

          searchControl._handleSubmit = function(){
            map.closePopup();
            searchControl.collapse();
            applyFilter();
          }

          function applyFilter() {
            // need fixing an issue with brackets (submitting a fullname from keyboard doesn't work)
            let records = searchControl._recordsCache = searchControl._filterData(settings.searchText, searchControl._recordsFromLayer());
            if (records && Object.keys(records).length>0) {
              count = Object.keys(records).length;
              if (count>0) {
                let text = Object.keys(records)[0];
                if (count==1) { // ==1 popup if we found 1 item, >=1 always show popup at first item
                  submitItem(text);
                } else {
                  let o = records[text];
                  layers[o.layer.options.layer].addTo(map);
                }
              }
            }
            saveSettings();
            markItems();
          }

          function submitItem(text) {
            const loc = searchControl._getLocation(text)
            if (loc) {
              searchControl.showLocation(loc, text);
              searchControl.fire('search:locationfound', {
                latlng: loc,
                text: text,
                layer: loc.layer ? loc.layer : null
              })
            }
          }

          function clickItem(text) {
            applyFilter();
            submitItem(text);
          }

          searchControl.on('search:expanded', function (e) {
            let input = document.querySelector('input.search-input');
            input.value = settings.searchText;
            if (settings.searchText) {
              input.focus();
              input.select();
              searchControl.searchText(settings.searchText);
              addSearchCallbacks();
            }
          });

          document.querySelector('.search-cancel').addEventListener('click',function (e) {
            clearFilter();
          });

          document.querySelector('input.search-input').addEventListener('input', function(e) {
            settings.searchText = document.querySelector('input.search-input').value;
            if (!settings.searchText) {
              //markItems(); // show everything without pressing enter
            }
            addSearchCallbacks();
          });

          // add click callbacks to search dropdown list items
          function addSearchCallbacks(){
            setTimeout(function() {
              let divs = document.querySelectorAll('.search-tip');
              [].forEach.call(divs, function(div) {
                div.addEventListener('click', function (e) {
                  let text = e.target.innerText;
                  clickItem(text);
                  e.preventDefault();
                })
              })
            }, 1500)
          }

        } else { // legacy search

          searchControl = new L.Control.Search({
              layer: L.featureGroup(searchLayers),
              marker: false, // no red circle
              initial: false, // search any substring
              firstTipSubmit: true, // use first autosuggest
              autoCollapse: true,
              tipAutoSubmit: true, //auto map panTo when click on tooltip
          }).addTo(map);
        }

        // search reveals all layers, hide all inactive layers right away
        for (layerObj of inactiveLayers) {
          map.removeLayer(layerObj);
        }

        searchControl.on('search:locationfound', function (e) {
            if (e.layer._popup) {
              layers[e.layer.options.layer].addTo(map);
              e.layer.openPopup();
            }
        });

        markItems();

        filename = 'data/types.csv';
        Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
          for (o of results.data) {
            if (!o.type) {
              continue;
            }
            classes[o.type] = o;
          }

          //loadMarkersLegacy();
          loadMarkers();

          layerControl.addTo(map); // triggers baselayerchange, so called in the end

        }});
      }});
  }

  loadLayers();
} // end of loadmap

function reloadMap(id) {
  if (!reloading) {
    reloading = true;
    map.fireEvent('baselayerchange',{layer:{mapId:id}});
    setTimeout(function(){ reloading = false; }, 250);
  }
}

function getIconSize(zoom) {
  let s = [32];
  return s[Math.round(Math.min(zoom,s.length-1))];
}

function getIcon(icon) {
  let iconObj = icons[icon];
  if (!iconObj) {
    let s = getIconSize(map.getZoom());
    let c = s >> 1;
    iconObj = L.icon({iconUrl: 'img/'+icon+'.png', iconSize: [s,s], iconAnchor: [c,c]});
    icons[icon] = iconObj;
  }
  return iconObj;
}

window.markItemFound = function (id, found=true, save=true) {
  var divs = document.querySelectorAll('img[alt="' + id + '"]');

  [].forEach.call(divs, function(div) {
    if (found) {
      div.classList.add('found');
    } else {
      div.classList.remove('found');
    }
  });

  if (found) {
    settings.markedItems[id] = true;
  } else {
    delete settings.markedItems[id];
  }

  if (save) {
    saveSettings();
  }
}

function markItems() {
  for (const[id,value] of Object.entries(settings.markedItems)) {
    var divs = document.querySelectorAll('*[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.add('found');
    });
  }

  // filter by settings.searchText. caching is unreliable, just perform a full search here
  let lookup = {}
  if (settings.searchText != '') {
    for (const o of Object.values(searchControl._filterData(settings.searchText, searchControl._recordsFromLayer()))) {
      lookup[o.layer.options.alt] = true;
    }
  }

  [].forEach.call(document.querySelectorAll('img.leaflet-marker-icon, path.leaflet-interactive'), function(div) {
    if (div.alt!='playerMarker') {
      let alt = div.getAttribute('alt');
      if (Object.keys(lookup).length==0 || lookup[alt]) {
        div.classList.remove('hidden');
      } else {
        div.classList.add('hidden');
      }
    }
  });
}

function unmarkItems() {
  for (const[id,value] of Object.entries(settings.markedItems)) {
    var divs = document.querySelectorAll('img[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.remove('found');
    });
  }
  settings.markedItems={};
  settings.playerPosition = playerStart;
  if (playerMarker) {
    playerMarker.setLatLng(new L.LatLng(playerStart[0], playerStart[1]));
  }
}

window.loadSaveFile = function () {
  let file = document.querySelector('#file').files[0];

  let self = this;
  let ready = false;
  let result = '';

  const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  self.readAsArrayBuffer = async function() {
      while (ready === false) {
        await sleep(100);
      }
      return result;
  }

  const reader = new FileReader();

  reader.onloadend = function(evt) {

    let loadedSave;
    try {
      loadedSave = new UESaveObject(evt.target.result);
    } catch(e) {
      console.log(e);
      alert('Could not load file, incompatible format.');
      return;
    }

    //console.log(loadedSave);

    for (let section of ["ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever"]) {
      for (o of loadedSave.Properties) {
        if (o.name != section) {
          continue;
        }
        for(x of o.value.value) {
          // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
          let name = x.split(".").pop();
          let area = x.split("/").pop().split('.')[0];
          if (name != "None") {
            markItemFound(area + ':' + name, true, false);
          }
        }
      }
    }

    for (o of loadedSave.Properties) {
      if (o.name == 'Player Position' && playerMarker) {
        let c = [0,0,0]
        let p = o.value;

        if (o.value.type=='Transform' && o.value['Translation']) {
          p = o.value['Translation'].value;
        }

        if (p && p.x && p.y) {
          var latlng = new L.LatLng(p.y, p.x);
          //console.log('setting player position from file', mapId, latlng);
          playerMarker.setLatLng(latlng);
          settings.playerPosition = [p.y, p.x, p.z];
        } else {
          console.log('cannot load player position from', JSON.stringify(o));
        }

      }
    }

    //setTimeout(function(){alert('Loaded successfully. Marked ' + Object.keys(settings.markedItems).length + ' items')},250);
    console.log('Marked ' + Object.keys(settings.markedItems).length + ' items');

    saveSettings();

    ready = true;
  };

  if (file instanceof Blob) {
    reader.readAsArrayBuffer(file);
  }
}

window.putSavefileLocationOnClipboard = function() {
  let location = '%LocalAppData%\\Supraland'+(map.mapId=='siu' ? 'SIU':'')+'\\Saved\\SaveGames';

  let text = 
  'This map allows you to import the game save file (latest .sav) to mark the collected items automatically. '+
  'On Windows, the default save path for this game is "'+location+'". '+
  'Click OK to copy the path to your clipboard.'
  ;

  if (confirm(text)) {
    let inputc = document.body.appendChild(document.createElement("input"));
    inputc.value = location;
    inputc.focus();
    inputc.select();
    document.execCommand('copy');
    inputc.parentNode.removeChild(inputc);
  }
}

window.onload = function(event) {
  // clear location hash, just in case
  history.pushState('', document.title, window.location.pathname + window.location.search);

  mapId = localData.mapId || 'sl';

  loadMap();

  let bindings = {
    KeyA:['x',+1],KeyD:['x',-1],
    KeyW:['y',+1],KeyS:['y',-1],
    KeyQ:['b',+1],KeyE:['b',-1],
    KeyT:['z',+1],KeyG:['z',-1],
    KeyX:['p',+1],KeyZ:['p',-1],
  };

  let pressed = {};

  function update(timestep) {
    let step = 100;
    let v = {};
    for (key of Object.keys(bindings)) {
      if (pressed[key]) {
        let [dir, step] = bindings[key];
        v[dir] = (v[dir]||0) + step;
      }
    }
    (v.x || v.y) && map.panBy([(-v.x||0)*step, (-v.y||0)*step], {animation: false});
    //v.b && map.setBearing(map.getBearing()+v.b*step/10);
    //v.p && map.setPitch(map.getPitch()+v.p*step/10, {duration: 1});
    //v.z && map.setZoom(map.getZoom()+v.z/16, {duration: 1});
    window.requestAnimationFrame(update);
  }

  window.addEventListener('keyup', (e) => {
    delete pressed[e.code];
  });

  let step = 256;
  window.addEventListener("keydown",function (e) {
    //console.log(e.code);
    if (e.target.id.startsWith('searchtext')) {
      return;
    }
    pressed[e.code] = true;
    switch (e.code) {
      case 'KeyF':
        if (e.ctrlKey) {
          searchControl.expand(true);
          e.preventDefault();
        } else {
          map.toggleFullscreen();
        }
        break;
      case 'Slash':
        searchControl.expand(true);
        e.preventDefault();
        break;
      case 'KeyR': map.fitBounds(mapBounds); break;
      case 'Digit1': reloadMap('sl'); break;
      case 'Digit2': reloadMap('slc'); break;
      case 'Digit3': reloadMap('siu'); break;
      /*case 'KeyA': map.panBy([-step,0]); break;
      case 'KeyD': map.panBy([step,0]); break;
      case 'KeyW': map.panBy([0,-step]); break;
      case 'KeyS': map.panBy([0,step]); break; */
      case 'KeyT': map.zoomIn(1); break;
      case 'KeyG': map.zoomOut(1); break;
    }
  });

  window.requestAnimationFrame(update);
}
