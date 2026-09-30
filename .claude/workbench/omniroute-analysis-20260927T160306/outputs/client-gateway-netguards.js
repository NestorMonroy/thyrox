==== ir: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function ir [982626,982879)
function ir(e){try{let t=new URL(e);if(t.protocol!=="https:"&&t.protocol!=="http:")return!1;let n=t.hostname.toLowerCase().replace(/^\[|\]$/g,"").replace(/\.$/,"");if(n.split(".").includes(""))return!1;if(zM.has(n))return!1;return!ph(n)}catch{return!1}}
==== $_: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function $_ [1037094,1037126)
function $_(e){return K$.has(e)}
==== yh: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function yh [999711,1000001)
function yh(e){if(e.includes("/")){let[n,i]=Zr.parseCIDR(e);if(n instanceof Zr.IPv6&&n.isIPv4MappedAddress()&&i>=96)return[n.toIPv4Address(),i-96];return[n,i]}let t=Zr.parse(e);if(t instanceof Zr.IPv6&&t.isIPv4MappedAddress())return[t.toIPv4Address(),32];return[t,t.kind()==="ipv6"?128:32]}
==== TD: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js variable TD [1141251,1141352)
TD=["10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","100.64.0.0/10","127.0.0.0/8","::1/128","fc00::/7"]
symbol: 4 de 4 nombre(s) resueltos
==== zM: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js variable zM [982513,982625)
zM=new Set(["metadata.google.internal","metadata.goog","metadata","instance-data","instance-data.ec2.internal"])
==== ph: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function ph [982261,982509)
function ph(e){let t;try{t=ds.parse(e.replace(/^\[|\]$/g,""))}catch{return!1}let i=(t.kind()==="ipv6"&&t.isIPv4MappedAddress()?t.toIPv4Address():t).range();if(i==="loopback"||i==="unspecified")return!dh();return m6(t.toString().replace(/%.*$/,""))}
==== K$: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js variable K$ [1037042,1037093)
K$=new Set(["localhost","127.0.0.1","::1","[::1]"])
==== gl: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function gl [1000001,1000033)
function gl(e){return e.map(yh)}
symbol: 4 de 4 nombre(s) resueltos
==== dh: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function dh [981963,982016)
function dh(){return a.CLAUDE_GATEWAY_ALLOW_LOOPBACK}
==== m6: 1 definicion(es) de nivel superior
---- chunk-379zyrv7.js function m6 [71573,72270)
function m6(e){let n=e.toLowerCase().replace(/^\[|\]$/g,"");if(n.endsWith("."))n=n.slice(0,-1);if(n===""||n==="localhost"||n.endsWith(".localhost"))return!0;if(zc.has(n))return!0;if(n.startsWith("instance-data.")&&n.endsWith(".compute.internal"))return!0;if(Uc(n)){if(ir.has(n))return!0;let[r=0,i=0,d=0,c=0]=n.split(".").map(Number);return ar(r,i,d,c)}if(!lr(n))return!1;let s=dr(n);if(s===void 0)return!0;if(cr(s))return!0;if(s.every((r)=>r===0))return!0;if(s.slice(0,15).every((r)=>r===0)&&s[15]===1)return!0;if(n==="fd00:ec2::254")return!0;if(s[0]===254&&(s[1]??0)>=128&&(s[1]??0)<=191)return!0;return Hc(s).some((r)=>{let[i=0,d=0,c=0,p=0]=r;return ar(i,d,c,p)||ir.has(`${i}.${d}.${c}.${p}`)})}
symbol: 2 de 2 nombre(s) resueltos
