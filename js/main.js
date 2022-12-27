var map = null;
var mapId = '';

var maps = {
  // data taken from the MapWorld* nodes
  'sl':  { 
      title: 'Supraland',
      "MapWorldCenter": {
        "X": 13000.0,
        "Y": -2000.0,
        "Z": 0.0
      },
      "MapWorldSize": 175000.0,
      "MapWorldUpperLeft": {
        "X": -74500.0,
        "Y": -89500.0,
        "Z": 0.0
      },
      "MapWorldLowerRight": {
        "X": 100500.0,
        "Y": 85500.0,
        "Z": 0.0
      },
   },

  'slc': {
    // can't get original data about this one
    title: 'Supraland Crash',
      "MapWorldCenter": {
        "X": 25991.0, // (45072-45040)/2
        "Y": -16.0,   // -(71047-19065)/2
        "Z": 0.0
      },
      "MapWorldSize": 90112.0,
      "MapWorldUpperLeft": {
        "X": -19065.0,
        "Y": -45040.0,
        "Z": 0.0
      },
      "MapWorldLowerRight": {
        "X": 71047.0,
        "Y": 45072.0,
        "Z": 0.0
      },
   },

  'siu': {
      title: 'Supraland Six Inches Under',
      "MapWorldCenter": {
        "X": 0.0,
        "Y": -19000.0,
        "Z": 10000.0
      },
      "MapWorldSize": 147456.0,
      "MapWorldUpperLeft": {
        "X": -73728.0,
        "Y": -92728.0,
        "Z": 10000.0
      },
      "MapWorldLowerRight": {
        "X": 73728.0,
        "Y": 54728.0,
        "Z": 10000.0
      },
   },
};

window.onload = function(event) {
  mapId = Object.keys(maps).find(id=>location.hash.endsWith(id)) || localStorage.getItem('mapId') || 'sl';
  loadMap(mapId);
};

function loadMap(mapId) {

  console.log('loading map', mapId);

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
  });

  // disable zoomControl above and use this to move zoom
  //L.control.zoom({ position: 'bottomright'}).addTo(map);

  var baseMaps = {};
  var overlayMaps = {};

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
    collapsed: false,
    position: 'topright',
  });

  map.on('baselayerchange', function(e) {
    localStorage.setItem(mapId, location.hash);
    location.hash = '';
    map.off();
    map.remove();
    loadMap(e.layer.mapId);
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
  actions.push(newAction({icon:'&#x1F4C1;', actions:{'Copy Save Folder Path To Clipboard':'copy-path', 'Upload File':'upload-save', 'Toggle Items':'toggle-items' }}));
  let toolbar = new L.Toolbar2.Control({actions: actions, position: 'topleft'}).addTo(map);


  document.querySelector('.copy-path').onclick = function(e) {
    window.putSavefileLocationOnClipboard();
  }


  //let file = $('input[type=file]')[0].files[0];
  //$('input[type=file]')[0].value = null;


  //let file = $('input[type=file]')[0].files[0];

  document.querySelector('#file').onchange = function(e) {
    window.loadSaveFile();
  }


  document.querySelector('.upload-save').onclick = function(e) {
    document.querySelector('#file').click();
  }

  document.querySelector('.toggle-items').onclick = function(e) {
    window.toggleFoundVisible();
  }

  function project(o) {

    function toRad(x) {
        return x / 180 * Math.PI;
    }

    function getVec(v) {
      return v ? new THREE.Vector3(v['X'], v['Y'], v['Z']) : new THREE.Vector3(1,1,1);
    }

    function getRot(v) {
      return new THREE.Vector3(toRad(v['Roll']), toRad(v['Pitch']), toRad(v['Yaw']));
      //return new THREE.Vector3(toRad(v['Pitch']), toRad(v['Yaw']), toRad(v['Roll']));
    }

    v = new THREE.Vector3(0,0,0);
    function apply_prop(v, d) {
      p = getVec(d['RelativeLocation']);
      r = getRot(d['RelativeRotation']);
      s = getVec(d['RelativeScale3D']);
      e = new THREE.Euler(r.x, r.y, r.z, 'XYZ');
      q = new THREE.Quaternion().setFromEuler(e);
      m = new THREE.Matrix4();
      m.compose(p,q,s); // equivalent to translation -> rotation -> scale
      v.applyMatrix4(m);
      console.log(v);
    }

    function getQuat(v) {
      return new THREE.Quaternion(v['X'],v['Y'],v['Z'],v['W']);
    }

    function apply_root(v, d) {
      m = new THREE.Matrix4();
      p = getVec(d['Translation']);
      q = getQuat(d['Rotation']);
      s = new THREE.Vector3(1,1,1);
      m.compose(p,q,s);

      console.log('before', v);

      v.applyMatrix4(m);


      console.log('after', v);

      console.log('trans', p);
      console.log('quat', q);


      console.log(m);
    }

    var local = {
      'RelativeLocation': {
        'X': o.location_x,
        'Y': o.location_y,
        'Z': o.location_z,
      },
      'RelativeRotation': {
        'Pitch': o.rotation_pitch ?? 0,
        'Yaw': o.rotation_yaw ?? 0,
        'Roll': o.rotation_roll ?? 0,
      },
      'RelativeScale': {
        'X': o.scale_x ?? 1,
        'Y': o.scale_y ?? 1,
        'Z': o.scale_z ?? 1,
      },
    }

    apply_prop(v, local);

    if (o.area == 'DLC2_SecretLavaArea') {

      if (['Chest3','Chest2_2', 'Bones_2'].includes(o.object_name)) {

        pedestal = {
          "RelativeLocation": {
            "X": -1975.2234,
            "Y": 2441.0225,
            "Z": 1599.9995
          },
          "RelativeRotation": {
            "Pitch": 0.0,
            "Yaw": 89.99993,
            "Roll": 0.0
          },
          "RelativeScale3D": {
            "X": 0.9971247,
            "Y": 0.9971248,
            "Z": 0.49248013
          }
        }

        fortress = {
          "RelativeLocation": {
            "X": 11637.441,
            "Y": 12546.801,
            "Z": 4227.0
          },
          "RelativeRotation": {
            "Pitch": 0.0,
            "Yaw": -81.99961,
            "Roll": 0.0
          },
          "RelativeScale3D": {
            "X": 1,
            "Y": 1,
            "Z": 1.
          }
        }

        apply_prop(v,pedestal);
        apply_prop(v,fortress);


      } // end of chest2_2

      world =  {
        "Rotation": {
          "X": 0.0,
          "Y": 0.0,
          "Z": 0.9999998807907104,
          "W": -1.1920928955078125e-07
        },
        "Translation": {
          "X": -2800.0,
          "Y": 13200.0,
          "Z": -2807.0
        }
      }

      apply_root(v, world);

    }


//"BP_BoneDetector_2",BP_BoneDetector_C,-114.8317,292.1713,-18.49751,0,6.775909,0,0.005,0.005,0.005,,
//"BuyChestDetectorRadius_2",BuyChestDetectorRadius_C,-114.8413,290.3628,-18.56413,0,-0.000164,0,0.005,0.005,0.005,,
//"BuyStats_2",BuyStats_C,-114.8024,291.5964,-18.51431,0,-0.000164,0,0.005,0.005,0.005,,
//"BuyUpgradeChestNum_2",BuyUpgradeChestNum_C,-114.623,290.9221,-18.44171,0,-0.000164,0,0.005,0.005,0.005,,
    if (['BP_BoneDetector_2','BuyChestDetectorRadius_2', 'BuyStats_2', 'BuyUpgradeChestNum_2'].includes(o.object_name)) {

        let d = {
          "RelativeLocation": {
            "X": -35050,
            "Y": -80220,
            "Z": 0
          },
          "RelativeRotation": {
            "Pitch": 0,
            "Yaw": 0,
            "Roll": 0
          },
          "RelativeScale3D": {
            "X": 1/0.005,
            "Y": 1/0.005,
            "Z": 1/0.005,
          }
        }

        apply_prop(v,d);
    }


    if (o.object_name.startsWith('ChestAreaEnd')) {
      let d = {
        "RelativeLocation": {
          "X": -35100,
          "Y": -80220,
          "Z": 0
        },
        "RelativeRotation": {
          "Pitch": 0,
          "Yaw": 0,
          "Roll": 0
        },
        "RelativeScale3D": {
          "X": 1/0.005,
          "Y": 1/0.005,
          "Z": 0.
        }
      }
      apply_prop(v,d);
    }

    if (o.area == 'DLC2_FinalBoss') {

      root = {
        "Rotation": {
          "X": 0.0,
          "Y": 0.0,
          "Z": 0.976296067237854,
          "W": -0.21643954515457153
        },
        "Translation": {
          "X": -10600.0,
          "Y": -29900.0,
          "Z": 565.0
        }
      }

      let d = {
        "RelativeLocation": {
          "X": -37500,
          "Y": -13550,
          "Z": 0
        },
        "RelativeRotation": {
          "Pitch": 0,
          "Yaw": 0,
          "Roll": 25,
        },
        "RelativeScale3D": {
          "X": 1,
          "Y": 1,
          "Z": 1.
        }
      }
      apply_root(v,root);
    }

    if (o.area == 'DLC2_PostRainbow') {

      let d = {
        "RelativeLocation": {
          "X": -56666,
          "Y": -42562,
          "Z": 0
        },
        "RelativeRotation": {
          "Pitch": 0,
          "Yaw": 0,
          "Roll": 142,
        },
        "RelativeScale3D": {
          "X": 1,
          "Y": 1,
          "Z": 1.
        }
      }

      apply_prop(v,d);
    }


    if (o.area == 'DLC2_Area0') {

      root =  {
        "Rotation": {
          "X": -0.0,
          "Y": 0.0,
          "Z": -0.9238795638084412,
          "W": 0.38268327713012695
        },
        "Translation": {
          "X": 32500.0,
          "Y": -5100.0,
          "Z": 23000.0
        }
      }

      apply_root(v, root);
    }


    x = v.x;
    y = v.y;
    z = v.z;

    let lng = x;
    let lat = y;

    return [lat,lng];
  }

  var layers = {};
  var classes = {};

  function loadMarkersOld() {
    chestIcon = L.icon({iconUrl: 'img/chest.png', iconSize: [32,32], iconAnchor: [16,16]});
    chestIconBig = L.icon({iconUrl: 'img/chest.png', iconSize: [64,64], iconAnchor: [32,32]});
    chestIconGold = L.icon({iconUrl: 'img/chest_gold.png', iconSize: [32,32], iconAnchor: [16,16]});

    var chests = 0;
    var chests_total = 0;

    filename = 'maps/' + mapId + '/markers/chests.csv';
    var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
      var chests = 0;
      for (o of results.data) {
        if (!o.x) {
          continue;
        }

        chests += 1;

        var layer = 'closedChest';

        let lat = o.y;
        let lng = o.x;

        m = L.marker([lat, lng], {icon: chestIconBig, title: o.type, zIndexOffset: -100 }).addTo(layers[layer])
        .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
        //.bindTooltip(function (e) { return String(e.options.title);}, {permanent: true, opacity: 1.0})
        //.setPopupYouTube(o.ytVideo, o.ytStart, o.ytEnd)
        ;
      }
      console.log('loaded ', filename, 'chests', chests);
    }});
  }

  function loadMarkersCSV() {

    var chests = 0;
    var chests_total = 0;

    var filenames = [];

    var icons = {};

    if (mapId=='sl') {
      filenames = [
        'Map.csv',
      ];
    } else if (mapId=='slc') {
      filenames = [
        'Crash.csv',
      ];
    } else if (mapId=='siu') {
      filenames = [
        //'DLC2_Complete.csv',
        //'DLC2_FinalBoss.csv',
        'DLC2_SecretLavaArea.csv',
        //'DLC2_PostRainbow.csv',
        //'DLC2_Area0.csv',
        //'DLC2_Area0_Below.csv',
      ];
    }

    for (filename of filenames) {
      var loadedCsv = Papa.parse('scripts/data_files/'+filename, { download: true, header: true, complete: function(results, filename) {
        var chests = 0;
        for (o of results.data) {

          if (!o.object_class) {
            continue;
          }

          if (o.object_name!='Chest2_2') {
            continue;
          }


          let area = filename.split('/').pop().split('.')[0];

          o = { area: area, ...o }; // spread operator

          // adjust cordinates
          let [lat, lng] = project(o);

          o.lng = lng;
          o.lat = lat;

//"BP_BoneDetector_2",BP_BoneDetector_C,-114.8317,292.1713,-18.49751,0,6.775909,0,0.005,0.005,0.005,,
//"BuyChestDetectorRadius_2",BuyChestDetectorRadius_C,-114.8413,290.3628,-18.56413,0,-0.000164,0,0.005,0.005,0.005,,
//"BuyStats_2",BuyStats_C,-114.8024,291.5964,-18.51431,0,-0.000164,0,0.005,0.005,0.005,,
//"BuyUpgradeChestNum_2",BuyUpgradeChestNum_C,-114.623,290.9221,-18.44171,0,-0.000164,0,0.005,0.005,0.005,,

/*
          if (o.object_class != 'BuyChestDetectorRadius_C') {
            continue;
          } else {
            console.log(o);
          }
*/
          if (c = classes[o.object_class]) {

            

            if (o.object_class.endsWith('Chest_C')) {
              chests += 1;
              chests_total += 1;

              let icon = 'chest_gold';
              let iconObj = icons[icon];
              if (!iconObj) {
                iconObj = L.icon({iconUrl: 'img/'+icon+'.png', iconSize: [32,32], iconAnchor: [16,16]});
                icons[icon] = iconObj;
              }

              layer = 'closedChest';

              L.marker([lat, lng], {icon: iconObj, title: o.object_name, zIndexOffset: 100 }).addTo(layers[layer])
              .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
              ;
            }

            if (o.object_class.startsWith('Buy') || o.object_class.startsWith('BP_Buy')
              || o.object_class.startsWith('Purchase')
              || o.object_class.startsWith('BP_Purchase')
              || o.object_class.startsWith('BP_BoneDetector_C')
              ) {
              let icon = 'shop';
              let iconObj = icons[icon];
              if (!iconObj) {
                iconObj = L.icon({iconUrl: 'img/'+icon+'.png', iconSize: [32,32], iconAnchor: [16,16]});
                icons[icon] = iconObj;
              }

              layer = 'shop';

              L.marker([lat, lng], {icon: iconObj, title: o.object_name, zIndexOffset: 100 }).addTo(layers[layer])
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

            let iconObj = icons[icon];
            if (!iconObj) {
              iconObj = L.icon({iconUrl: 'img/'+icon+'.png', iconSize: [32,32], iconAnchor: [16,16]});
              icons[icon] = iconObj;
            }

            if (!layers[layer]) {
              layer = 'misc';
            }

            o.icon = icon;
            o.layer = layer;

            L.marker([lat, lng], {icon: iconObj, title: o.object_name, zIndexOffset: 100 }).addTo(layers[layer])
            .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
            //.bindTooltip(function (e) { return String(e.options.title);}, {permanent: true, opacity: 1.0})
            ;

          }

        }
        console.log('loaded', filename, 'chests', chests, 'chests_total', chests_total);
      }});
    }
  }

  var icons = {};
  function getIcon(icon) {
    let iconObj = icons[icon];
    if (!iconObj) {
      iconObj = L.icon({iconUrl: 'img/'+icon+'.png', iconSize: [32,32], iconAnchor: [16,16]});
      icons[icon] = iconObj;
    }
    return iconObj;
  }

  function loadMarkersNew() {
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

            o.icon = icon;
            o.layer = layer;

            L.marker([o.lat, o.lng], {icon: getIcon(icon), title: o.object_name, zIndexOffset: 100, alt: markerId }).addTo(layers[layer])
            .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
            //.bindTooltip(function (e) { return String(e.options.title);}, {permanent: true, opacity: 1.0})
            ;
          }
      }
      });
/*
    filename = 'maps/' + mapId + '/markers/chests.csv';
    var loadedCsv = Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
      var chests = 0;
      for (o of results.data) {
        if (!o.x) {
          continue;
        }

        chests += 1;

        var layer = 'closedChest';

        let lat = o.y;
        let lng = o.x;

        m = L.marker([lat, lng], {icon: chestIconBig, title: o.type, zIndexOffset: -100 }).addTo(layers[layer])
        .bindPopup(JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'))
        //.bindTooltip(function (e) { return String(e.options.title);}, {permanent: true, opacity: 1.0})
        //.setPopupYouTube(o.ytVideo, o.ytStart, o.ytEnd)
        ;
      }
      console.log('loaded ', filename, 'chests', chests);
    }});
    */
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

          //loadMarkersOld();
          loadMarkersNew();
          //loadMarkersCSV();

          layerControl.addTo(map); // triggers baselayerchange, so called in the end

        }});
      }});
  }

  loadLayers();

} // end of loadmap


///////////////////////////////////////
//// UE4 Reader

window.toggleFoundVisible = function (){
  var divs = document.querySelectorAll('img.marked');
  [].forEach.call(divs, function(div) {
    if (div.classList.contains('marked')) {
      if (div.classList.contains('found')) {
        div.classList.remove('found');
      } else {
        div.classList.add('found');
      }
    }
  });
}

window.markItemFound = function (id) {
  var divs = document.querySelectorAll('img[alt="' + id + '"]');
  [].forEach.call(divs, function(div) {
    div.classList.add('marked');
    div.classList.add('found');
  });
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
    result = evt.target.result;
    window.loadedSave = new UESaveObject(result);

    console.log(window.loadedSave);

    var theProps = Array("ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever");
    var toProcess;
    var el;
    var i;
    var x;

    for( i = 0; i < theProps.length; i++ ){
      toProcess = loadedSave.Properties.find(function (x) { return x.name==theProps[i] }).value.value;
      for( x = 0; x < toProcess.length; x++ ){
        let el = toProcess[x].split(".").pop();
        let area = toProcess[x].split("/").pop().split('.')[0];
        let id = area + ':' + el;
        if (id != "None" ){ markItemFound(id) };
      }
    }
    ready = true;
  };
  reader.readAsArrayBuffer(file);
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
  inputc.value = "%LocalAppData%\\Supraland\\Saved\\SaveGames\\";

  if (map.mapId == 'siu') {
    inputc.value = "%LocalAppData%\\SupralandSIU\\Saved\\SaveGames\\";
  }

  inputc.focus();
  inputc.select();
  document.execCommand('copy');
  inputc.parentNode.removeChild(inputc);
  alert('"'+inputc.value + '" copied to clipboard. Now you can click Upload File, and paste clipboard to the file dialog.');
}

