var map = null;
var mapId = '';
var markedItems = JSON.parse(localStorage.getItem('markedItems')) || {'sl':{},'slc':{},'siu':{}};
var markedItemsMode = 1;
var layers = {};
var classes = {};
var icons = {};

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

window.onload = function(event) {
  mapId = Object.keys(maps).find(id=>location.hash.endsWith(id)) || localStorage.getItem('mapId') || 'sl';
  loadMap(mapId);
};

function loadMap(mapId) {
  localStorage.setItem('mapId', mapId);

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

  var mapBounds = [
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

  //Create the map
  map = new L.Map('map', {
    crs: crs,
    fadeAnimation: false,
    zoomControl: true,
    maxBounds: mapBounds, // elastic-y map bounds
    fullscreenControl: true,
    fullscreenControlOptions: {
        position: 'topleft'
    },
  });

  // disable zoomControl above and use this to move zoom
  //L.control.zoom({ position: 'bottomright'}).addTo(map);

  layerOptions = {
      tileSize: L.point(tileSize.x, tileSize.y),
      noWrap: true,
      tms: false,
      updateInterval: -1,
      keepBuffer: 16,
      maxNativeZoom: 4,
      nativeZooms: [0, 1, 2, 3, 4],
      edgeBufferTiles: 2,
      bounds: mapBounds,
      attribution: '<a href="https://github.com/joric/supraland" target="_blank">Joric\'s Supraland</a>',
  };

  let layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright',
  });

  map.on('baselayerchange', function(e) {
    localStorage.setItem(mapId, location.hash);
    location.hash = '';
    map.off();
    map.remove();
    loadMap(e.layer.mapId);
  });

  map.on('overlayadd', function(e) {
    resizeIcons();
    for (id of Object.keys(markedItems[mapId])) {
      window.markItemFound(id);
    }
  });

  function getIconSize(zoom) {
    let s = [16,16,24,32,32,32,48,48,64];
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

  function resizeIcons() {
      map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
          let icon = layer.getIcon();
          let s = getIconSize(map.getZoom());
          let c = s >> 1;
          icon.options.iconSize = [s,s];
          icon.options.iconAnchor = [c,c];
          layer.setIcon(icon);
        }
     });

    // (hack) re-mark items that lost the "found" property after zoom
    for (const[id,value] of Object.entries(markedItems[mapId])) {
      var divs = document.querySelectorAll('img[alt="' + id + '"]');
      [].forEach.call(divs, function(div) {
        div.classList.add('found');
      });
    }
  }

  map.on('zoomend', function(e) {
    resizeIcons();
  });

  tilesDir = 'tiles/'+mapId;

  // L.tileLayer.canvas() is much faster than L.tileLayer() but requires a L.TileLayer.Canvas plugin
  let baseLayer = L.tileLayer.canvas(tilesDir+'/base/{z}/{x}/{y}.jpg', layerOptions).addTo(map);

  for (id in maps) {
    var title = maps[id].title;
    var layer = id==mapId ? baseLayer : L.layerGroup();
    layer.mapId = id;
    layerControl.addBaseLayer(layer, title);
  }

  if (mapId == 'sl') {
    for (const [id, title] of Object.entries({'pipes':'Pipes', 'pads':'Pads'})) {
      var layer = L.tileLayer.canvas(tilesDir+'/'+id+'/{z}/{x}/{y}.png', layerOptions).addTo(map);
      layerControl.addOverlay(layer, title);
    }
  }

  L.control.mousePosition().addTo(map);

  map.fitBounds(mapBounds);

  if (location.hash == '') {
      location.hash = localStorage.getItem(mapId);
  }

  var hash = new L.Hash(map);

  map.mapId = mapId; // for hash plugin to add mapId


  window.mapref = map;

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
            },
            subToolbar: new L.Toolbar2({ 
                actions: subActions
            })
        }
    });
  }

  actions = []
  //actions.push(newAction({icon:'&#x1F517;', actions:{'Copy URL To Clipboard':'copy-url'}}));
  actions.push(newAction({icon:'&#x1F4C1;', actions:{'Copy Path To Clipboard':'copy-path', 'Upload File':'upload-save', 'Toggle Items':'toggle-items' }}));
  let toolbar = new L.Toolbar2.Control({actions: actions, position: 'topleft'}).addTo(map);


  document.querySelector('.copy-path').onclick = function(e) {
    window.putSavefileLocationOnClipboard();
  }

  document.querySelector('#file').onchange = function(e) {
    window.loadSaveFile();
  }

  document.querySelector('.upload-save').onclick = function(e) {
    document.querySelector('#file').value = null;
    document.querySelector('#file').click();
  }

  document.querySelector('.toggle-items').onclick = function(e) {
    window.toggleFoundVisible();
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

  function loadMarkers() {
    fetch('data/markers.'+mapId+'.json')
      .then((response) => response.json())
      .then((j) => {
        var chests = 0;
        var chests_total = 0;

        for (o of j) {

          if (c = classes[o.type]) {

            let markerId = o.area + ':' + o.name;

            if (o.type.endsWith('Chest_C')) {
              chests += 1;
              chests_total += 1;

              let icon = 'chest';

              layer = 'closedChest';

              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: o.name, zIndexOffset: 100, alt: markerId }).addTo(layers[layer])
              .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
              ;
            }

            if (o.type.startsWith('Buy') || o.type.startsWith('BP_Buy') || o.type.startsWith('Purchase') || o.type.startsWith('BP_Purchase') || o.type.startsWith('BP_BoneDetector_C')) {
              icon = 'shop';
              layer = 'shop';
              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: o.name, zIndexOffset: 100, alt: markerId }).addTo(layers[layer])
              .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
              ;
            }

            icon = c.icon;
            layer = c.layer;

            if (s = classes[o.spawns]) {
              icon = s.icon;
              layer = s.layer;
              if (o.spawncount>1) {
                icon = 'coinStash';
              }
            }

            if (icon == '') {
              icon = 'question_mark';
            }

            if (!layers[layer]) {
              layer = 'misc';
            }

            L.marker([o.lat, o.lng], {icon: getIcon(icon), title: o.object_name, zIndexOffset: 100, alt: markerId }).addTo(layers[layer])
            .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
            //.bindTooltip(function (e) { return String(e.options.title);}, {permanent: true, opacity: 1.0})
            ;
          }
        } // end of loop

        resizeIcons();
    });
  }

  function loadLayers() {
      filename = 'data/layers.csv';

      var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
        for (o of results.data) {
          if (!o.id) {
            continue;
          }
          let layerObj = L.layerGroup();
          if (o.defaultActive) {
            layerObj.addTo(map);
          }
          layers[o.id] = layerObj;
          layerControl.addOverlay(layerObj, o.name);
        }


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


///////////////////////////////////////
//// UE4 Reader

window.toggleFoundVisible = function (){
  markedItemsMode = (markedItemsMode + 1) % 3;

  [].forEach.call(document.querySelectorAll('img.found'), function(div) {
      if (markedItemsMode == 0) {
        div.style.opacity = "0";
      } else if (markedItemsMode == 1) {
        div.style.opacity = "0.3";
      } else {
        div.style.opacity = "1";
      }
  });
}

window.markItemFound = function (id) {
  var divs = document.querySelectorAll('img[alt="' + id + '"]');
  [].forEach.call(divs, function(div) {
    div.classList.add('found');
  });
  markedItems[mapId][id] = true;
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

    let loadedSave = new UESaveObject(evt.target.result);

    console.log(loadedSave);

    markedItemsMode = 1;

    for (let section of ["ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever"]) {
      for (o of loadedSave.Properties) {
        if (o.name != section) {
          continue;
        }
        for(x of o.value.value) {
          let name = x.split(".").pop();
          let area = x.split("/").pop().split('.')[0];
          if (name != "None") {
            markItemFound(area + ':' + name);
          }
        }
      }
    }

    console.log('loaded', Object.keys(markedItems[mapId]).length, 'items');

    localStorage.setItem('markedItems', JSON.stringify(markedItems));

    ready = true;

  };

  if (file instanceof Blob) {
    reader.readAsArrayBuffer(file);
  }
}


class UESaveObject {
  constructor(binstr) {
    var x;
    var r = new UEReadHelper(binstr);
    r.pos = 4;
    window.tempr = r;
    this.SaveGameVersion = r.getInt32();
    this.PackageVersion = r.getInt32();
    this.EngineVersion_Major = r.getInt16();
    this.EngineVersion_Minor = r.getInt16();
    this.EngineVersion_Patch = r.getInt16();
    this.EngineVersion_Build = r.getInt32();
    this.EngineVersion_BuildId = r.getString();
    this.cfVersion = r.getInt32();
    this.cfData_Count = r.getInt32();
    this.cfData_Entries = [];
      for(x=0;x<this.cfData_Count;x++) {
        this.cfData_Entries[x] = { id: r.getGuid(), value: r.getInt32()};
      }
    this.SaveGameType = r.getString();
    this.Properties = [];
    for(x=0;true;x++) {
      this.Properties[x] = r.getNextProperty();
      if(this.Properties[x].name=="EOF"){ break; };
    }
  }
  
}

class UEReadHelper {
  constructor(binstr) {
    this.src = new TextDecoder("latin1").decode(binstr);
    this.rdr = new DataView(binstr);
    this.pos = 4;
  }

  peekInt8 () { return this.rdr.getInt8(this.pos, true); };
  peekUint8 () { return this.rdr.getUint8(this.pos, true); };
  peekInt16 () { return this.rdr.getInt16(this.pos, true); };
  peekUint16 () { return this.rdr.getUint16(this.pos, true); };
  peekInt32 () { return this.rdr.getInt32(this.pos, true); };
  peekUint32 () { return this.rdr.getUint32(this.pos, true); };
  peekFloat32 () { return this.rdr.getFloat32(this.pos, true); };
  peekFloat64 () { return this.rdr.getFloat64(this.pos, true); };
  peekInt64 () { return Number(this.rdr.getBigInt64(this.pos, true)); };
  peekUint64 () { return Number(this.rdr.getBigUint64(this.pos, true)); };
  peekString() { return this.src.substring(this.pos + 4, this.pos + this.peekInt32() + 3); };
  peekString64() { return this.src.substring(this.pos + 8, this.pos + this.peekInt64() + 7); };
  peekStringCustom(cnt) { return this.src.substring(this.pos + 4, this.pos + cnt + 3); };
  peekString64Custom(cnt) { return this.src.substring(this.pos + 8, this.pos + cnt + 7); };
  peekGuid() { 
    var tpos = this.pos;
    var byteorder = [3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15];
    var g = "";
    var gidx;
    for(gidx=0;gidx<16;gidx++) {
      this.pos = tpos + byteorder[gidx];
      g = g + ('0' + this.peekUint8().toString(16).toUpperCase()).slice(-2);
    }
    this.pos = tpos;
    return '{' + g.substr(0,8) + '-' + g.substr(8,4) + '-' + g.substr(12,4) + '-' + g.substr(16,4) + '-' + g.substr(20) + '}';
  }

  getInt8 () { var z = this.peekInt8(); this.pos +=1; return z };
  getUint8 () { var z = this.peekUint8(); this.pos +=1; return z };
  getInt16 () { var z = this.peekInt16(); this.pos +=2; return z };
  getUint16 () { var z = this.peekUint16(); this.pos +=2; return z };
  getInt32 () { var z = this.peekInt32(); this.pos +=4; return z };
  getUint32 () { var z = this.peekUint32(); this.pos +=4; return z };
  getFloat32 () { var z = this.peekFloat32(); this.pos +=4; return z };
  getFloat64 () { var z = this.peekFloat64(); this.pos +=8; return z };
  getInt64 () { var z = this.peekInt64(); this.pos +=8; return z };
  getUint64 () { var z = this.peekUint64(); this.pos +=8; return z };
  getString () { var z = this.peekString(); this.pos += this.peekInt32() + 4; return z };
  getString64() { var z = this.peekString64(); this.pos += this.peekInt64() + 8; return z; };
  getStringCustom(cnt) { var z = this.peekStringCustom(cnt); this.pos += cnt + 4; return z; };
  getString64Custom(cnt) { var z = this.peekString64Custom(cnt); this.pos += cnt + 8; return z; };
  getGuid () { var z = this.peekGuid(); this.pos += 16; return z; }

  getNextProperty() {
    //console.log( "pos " + this.pos + "    len " + this.src.length );
    if(this.peekInt32()==0) { return {name: "EOF" } };
    var retVal = { name: this.getString() };
    if(retVal.name == null) { return null; };
    if(retVal.name == "None") { 
      retVal.length = 0;
      retVal.value = null;
      return retVal;
    }
    var tpos = this.pos;
    retVal.type = this.getString();
    if(retVal.type == "None") { return {name: "EOF" } };
    if(retVal.type.includes("::")) { this.pos = tpos + 1; retVal.type = this.getString(); return retVal; };
    retVal.length = this.getInt64();
    retVal.value = this.getValueByType(retVal.type, retVal.length);
    return retVal;
  }

  getValueByType(type, overlen){
    var retVal = {};
    var tCheck = 0;
    switch(type){
      case "ArrayProperty":
        retVal.innerType = this.getString();
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal.count = this.getInt32();
        retVal.value = [];
        var x = 0;
        switch(retVal.innerType) {
          case "ObjectProperty":
            for(x=0;x<retVal.count;x++){
              retVal.value[x] = this.getString();
            }
            break;
          case "StructProperty":
            this.pos -= 8;
            retVal.value = this.getString64Custom(overlen - 4);
            break;
          default:
            retVal.value[x] = this.getNestedValueByType(retVal.innerType, overlen);
            break;
        }
        break;
      case "IntProperty":
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal = this.getInt32();
        break;
      case "BoolProperty":
        tCheck = retVal.length; //if not=0 then something's wrong.  tbi
        retVal.value = this.getInt16();
        if(retVal.value==0){retVal = false} else {retVal = true};
        break;
      case "NameProperty":
      case "StrProperty":
      case "ObjectProperty":
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal = this.getString();
        break;
      case "FloatProperty":
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal = this.getFloat32();
        break;
      case "StructProperty":
        var iType = this.getString();
        var iId = this.getGuid();
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal = this.getNestedValueByType(iType, overlen);
        retVal.type = iType;
        retVal.id = iId;
        break;
      case "MapProperty":
        var mpKeyType = this.getString();
        var mpValType = this.getString();
        this.pos -= 7;
        retVal.innerValue = this.getString64Custom(overlen);
        retVal.keyType = mpKeyType;
        retVal.valueType = mpValType;
        break;
      case "TextProperty":
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        this.pos -= 8;
        retVal.value = this.getString64Custom(overlen);
        retVal.value = retVal.value.slice(retVal.value.lastIndexOf("\x00")+1);
        break;
      default:
        //console.log("property type not handled: " + type);
        break;
    }
  return retVal;
  }


  getNestedValueByType(type, overlen){
    var retVal = {};
    var tCheck = 0;
    switch(type){
                  case "DateTime":
                    retVal.value = this.getInt64(); //this needs to be converted from a .net 64-bit datetime to a js date object
                    break;
                  case "Guid":
                    retVal.value = this.getGuid();
                    break;
                  case "Vector":
                  case "Rotator":
                    retVal.x = this.getFloat32();
                    retVal.y = this.getFloat32();
                    retVal.z = this.getFloat32();
                    break;
                  case "LinearColor":
                    retVal.r = this.getFloat32();
                    retVal.g = this.getFloat32();
                    retVal.b = this.getFloat32();
                    retVal.a = this.getFloat32();
                    break;
      default:
        retVal.name = type;
        if( type.endsWith("Property") ) { 
          retVal.value = this.getValueByType(this.getString());
        } else {
          //console.log("nested property type not explicitly handled: " + type);
          this.pos -= 8;
          retVal.value = this.getString64Custom(overlen);
        }
        break;
    }
  return retVal;
  }
}

window.putSavefileLocationOnClipboard = function() {
  var inputc = document.body.appendChild(document.createElement("input"));
  inputc.value = '%LocalAppData%\\Supraland'+(map.mapId=='siu' ? 'SIU':'')+'\\Saved\\SaveGames\\';
  inputc.focus();
  inputc.select();
  document.execCommand('copy');
  inputc.parentNode.removeChild(inputc);
  alert('"'+inputc.value + '" copied to clipboard. Now you can click Upload File, and paste clipboard to the file dialog.');
}



