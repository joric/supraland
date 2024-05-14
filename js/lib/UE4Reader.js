///////////////////////////////////////
//// UE4 Reader
//// (c) 2022 LewisPattJr (initial version, https://github.com/SupraGamesCommunity/map-sl/commit/5c2daddbf)
//// (c) 2024 joric/github (transform node)

class UESaveObject {
  constructor(binstr) {
    let x;
    let r = new UEReadHelper(binstr);
    r.pos = 4;
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
    let tpos = this.pos;
    let byteorder = [3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15];
    let g = "";
    let gidx;
    for(gidx=0;gidx<16;gidx++) {
      this.pos = tpos + byteorder[gidx];
      g = g + ('0' + this.peekUint8().toString(16).toUpperCase()).slice(-2);
    }
    this.pos = tpos;
    return '{' + g.substr(0,8) + '-' + g.substr(8,4) + '-' + g.substr(12,4) + '-' + g.substr(16,4) + '-' + g.substr(20) + '}';
  }

  getInt8 () { let z = this.peekInt8(); this.pos +=1; return z };
  getUint8 () { let z = this.peekUint8(); this.pos +=1; return z };
  getInt16 () { let z = this.peekInt16(); this.pos +=2; return z };
  getUint16 () { let z = this.peekUint16(); this.pos +=2; return z };
  getInt32 () { let z = this.peekInt32(); this.pos +=4; return z };
  getUint32 () { let z = this.peekUint32(); this.pos +=4; return z };
  getFloat32 () { let z = this.peekFloat32(); this.pos +=4; return z };
  getFloat64 () { let z = this.peekFloat64(); this.pos +=8; return z };
  getInt64 () { let z = this.peekInt64(); this.pos +=8; return z };
  getUint64 () { let z = this.peekUint64(); this.pos +=8; return z };
  getString () { let z = this.peekString(); this.pos += this.peekInt32() + 4; return z };
  getString64() { let z = this.peekString64(); this.pos += this.peekInt64() + 8; return z; };
  getStringCustom(cnt) { let z = this.peekStringCustom(cnt); this.pos += cnt + 4; return z; };
  getString64Custom(cnt) { let z = this.peekString64Custom(cnt); this.pos += cnt + 8; return z; };
  getGuid () { let z = this.peekGuid(); this.pos += 16; return z; }

  getNextProperty() {
    //console.log( "pos " + this.pos + "    len " + this.src.length );
    if(this.peekInt32()==0) { return {name: "EOF" } };
    let retVal = { name: this.getString() };
    if(retVal.name == null) { return null; };
    if(retVal.name == "None") { 
      retVal.length = 0;
      retVal.value = null;
      return retVal;
    }
    let tpos = this.pos;
    retVal.type = this.getString();
    if(retVal.type == "None") { return {name: "EOF" } };
    if(retVal.type.includes("::")) { this.pos = tpos + 1; retVal.type = this.getString(); return retVal; };
    retVal.length = this.getInt64();
    retVal.value = this.getValueByType(retVal.type, retVal.length);
    return retVal;
  }

  getValueByType(type, overlen){
    let retVal = {};
    let tCheck = 0;
    switch(type){
      case "ArrayProperty":
        retVal.innerType = this.getString();
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal.count = this.getInt32();
        retVal.value = [];
        let x = 0;
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
        let iType = this.getString();
        /*
        console.log('type',iType);
        let p = this.pos;
        let s = this.getString64Custom(100);
        console.log(s);
        this.pos = p;
        */
        let iId = this.getGuid();
        tCheck = this.getInt8(); //if not=0 then something's wrong.  tbi
        retVal = this.getNestedValueByType(iType, overlen);
        retVal.type = iType;
        retVal.id = iId;
        break;
      case "MapProperty":
        let mpKeyType = this.getString();
        let mpValType = this.getString();
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
    let retVal = {};
    let tCheck = 0;
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
                  case "Transform":
                    let p = this.pos;

                    /*
                    '\t\x00\x00\x00
                    Rotation\x00\x0F\x00\x00\x00
                    StructProperty\x00\x10\x00\x00\x00\x00\x00\x00\x00\x05\x00\x00\x00
                    Quat\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00€\x00\x00\x00\x00ó\x045¿ò\x045?\f\x00\x00\x00
                    Translation\x00\x0F\x00\x00\x00
                    StructProperty\x00\f\x00\x00\x00\x00\x00\x00\x00\x07\x00\x00\x00
                    Vector\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00AJ\x90Fb(¯Æ€\x1ApÂ\x05\x00\x00\x00
                    None'
                    */

                    /*

                    \x09\x00\x00\x00Rotation\x00
                    \x0F\x00\x00\x00StructProperty\x00\x10\x00\x00\x00\x00\x00\x00\x00
                    \x05\x00\x00\x00Quat\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x80\x00\x00\x00\x00\xf3\x04\x35\xbf\xf2\x04\x35\x3f
                    \x0c\x00\x00\x00Translation\x00
                    \x0F\x00\x00\x00StructProperty\x00\x0c\x00\x00\x00\x00\x00\x00\x00
                    \x07\x00\x00\x00Vector\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x41\x4a\x90\x46\x62\x28\xaf\xc6\x80\x1a\x70\xc2
                    \x05\x00\x00\x00None

                    */

                    /*

                    00 00 00 00 00 00 00 00 09 00 00 00 52 6f 74 61 74 69 6f 6e 00 0f 00 00 00 53 74 72 75 63 74 50 72 6f 70
                                                         R  o  t  a  t  i  o  n                 S  t  r  u  c  t  P  r  o  p

                    65 72 74 79 00 10 00 00 00 00 00 00 00 05 00 00 00 51 75 61 74 00 00 00 00 00 00 00 00 00 00 00 00 00 00
                     e  r  t  y                                         Q  u  a  t                                          

                    00 00 00 00 00 00 00 80 00 00 00 00 f3 04 35 bf f2 04 35 3f 0c 00 00 00 54 72 61 6e 73 6c 61 74 69 6f 6e
                                                               5           5  ?              T  r  a  n  s  l  a  t  i  o  n

                    00 0f 00 00 00 53 74 72 75 63 74 50 72 6f 70 65 72 74 79 00 0c 00 00 00 00 00 00 00 07 00 00 00 56 65 63
                                    S  t  r  u  c  t  P  r  o  p  e  r  t  y                                         V  e  c

                    74 6f 72 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 41 4a 90 46 62 28 af c6 80 1a 70 c2 05   
                     t  o  r                                                        A  J     F  b  (              p         

                    */

                    // weird vector values. scaled/rotated?

                    let t = this.getString(); //Rotation
                    this.pos += 0;
                    t = this.getString(); // StructProperty
                    this.pos += 8;

                    t = this.getString(); // Quat
                    this.pos += 17;
                    retVal.rotation = {x: this.getFloat32(), y: this.getFloat32(), z: this.getFloat32(), w: this.getFloat32()}

                    t = this.getString(); // Translation
                    this.pos += 0;

                    t = this.getString(); // StructProperty
                    this.pos += 8;

                    t = this.getString(); // Vector
                    this.pos += 17;
                    retVal.translation = {x: this.getFloat32(), y: this.getFloat32(), z: this.getFloat32()}

                    this.pos = p - 8
                    this.getString64Custom(overlen);
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

// Example usage:

/*
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
    ready = true;
  };

  if (file instanceof Blob) {
    reader.readAsArrayBuffer(file);
  }
}
*/

if (typeof require !== 'undefined' && require.main === module) {
  fname = 'C:\\Users\\user\\AppData\\Local\\Supraland\\Saved\\SaveGames\\CrashSave1.sav';
  fname = 'C:\\Users\\user\\AppData\\Local\\SupralandSIU\\Saved\\SaveGames\\SixInchesSave1.sav';
  require('fs').readFile(fname, (err, buf) => {
    if (err) {
      console.log(err);
    } else {
      let loadedSave = new UESaveObject(buf.buffer);
      //require('fs').writeFileSync('save.json', JSON.stringify(loadedSave,null,2));
      for (o of loadedSave.Properties) {
        if (o.name == 'Player Position') {
          console.log(o);
        }
      }
    }
  })
}
