==== Ob: 1 definicion(es) de nivel superior
---- chunk-gpsyc3w1.js function Ob [638028,638221)
function Ob(){try{let e=Db.readFileSync("/proc/version",{encoding:"utf8"}),r=e.match(/WSL(\d+)/i);if(r&&r[1])return r[1];if(e.toLowerCase().includes("microsoft"))return"1";return}catch{return}}
