// ==========================================================================
// constants/common.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/constants/common.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 8  (0 cadena, 8 nombre)
//   descartadas por ruido (>400 aparic.) : 11
//   sitios de co-ocurrencia : 15  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 3
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[22563574:22564456]  (882 B)
//     especificidad 7.641 · 5 anclas — 'toLocaleString'(×56 g1), 'numeric'(×144 g1), 'getMonth'(×17 g2), 'getFullYear'(×18 g2), 'getDate'(×23 g2)
function Ayy(e){let t=e.trim(),r=t.match(Hyy);if(!r)return null;let n=Number(r[1]??""),o=Number(r[2]??""),i=Number(r[3]??""),s=Number(r[4]??""),a=Number(r[5]??""),l=r[6]===void 0?0:Number(r[6]);if(n<100)return null;let c=new Date(Date.UTC(n,o,0)).getUTCDate();if(o<1||o>12||i<1||i>c)return null;if(s>24||a>59||l>59||s===24&&(a>0||l>0))return null;let u=Date.parse(t);if(Number.isNaN(u))return null;if(!/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(t)){let f=new Date(Date.UTC(n,o-1,i,s,a)),m=new Date(u);if(m.getFullYear()!==f.getUTCFullYear()||m.getMonth()!==f.getUTCMonth()||m.getDate()!==f.getUTCDate()||m.getHours()!==f.getUTCHours()||m.getMinutes()!==f.getUTCMinutes())return null}let p=Date.UTC(n,o-1,i,s,a,l);if(Math.abs(u-p)>50400000)return null;return new Date(u).toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"})}

// --- bundle[3063956:3064246]  (290 B)
//     especificidad 6.033 · 4 anclas — 'toLocaleString'(×56 g1), 'numeric'(×144 g1), 'getFullYear'(×18 g2), 'padStart'(×91 g2)
function QMt(e){let t=Math.max(0,Math.floor(e/1000));if(t<60)return`${t}s`;let r=Math.floor(t/60);if(r<60)return`${r}m${String(t%60).padStart(2,"0")}s`;let n=Math.floor(r/60);if(n<24)return`${n}h${String(r%60).padStart(2,"0")}m`;return`${Math.floor(n/24)}d${String(n%24).padStart(2,"0")}h`}

// --- bundle[5195756:5198537]  (2781 B)
//     especificidad 5.540 · 4 anclas — 'numeric'(×144 g1), 'getMonth'(×17 g2), 'getFullYear'(×18 g2), 'getDate'(×23 g2)
function(F$a){Object.defineProperty(F$a,"__esModule",{value:!0});var N$a=Wle(),zar=ZCe(),$Se=M$a(),mIp=PSe(),d3r=Uar();function _1v(e){let t=new Date(0,0,1);t.setFullYear(e.getFullYear());let r=e.getTime()-t.getTime();return Math.floor(r/86400000)}function b1v(e,t){let r=e.message,n=(0,N$a.timestampDate)(r);if(t===void 0)return new Date(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),n.getUTCHours(),n.getUTCMinutes(),n.getUTCSeconds(),n.getUTCMilliseconds());let o=t.match(/^(?<sign>[+-]?)(?<hours>\d\d):(?<minutes>\d\d)$/);if(o?.groups){let p=o.groups.sign=="-"?1:-1,f=parseInt(o.groups.hours),m=parseInt(o.groups.minutes),h=p*(f*60*60*1000+m*60*1000);return n=new Date(n.getTime()-h),new Date(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),n.getUTCHours(),n.getUTCMinutes(),n.getUTCSeconds(),n.getUTCMilliseconds())}let i=new Intl.DateTimeFormat("en-US",{hourCycle:"h23",hour12:!1,timeZone:t,year:"numeric",month:"numeric",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}),s,a,l,c,u,d;for(let p of i.formatToParts(n))switch(p.type){case"year":s=parseInt(p.value);break;case"month":a=parseInt(p.value)-1;break;case"day":l=parseInt(p.value);break;case"hour":c=parseInt(p.value);break;case"minute":u=parseInt(p.value);break;case"second":d=parseInt(p.value);break}if(s===void 0||a===void 0||l===void 0||c===void 0||u===void 0||d===void 0)throw Error(`Error converting ${(0,mIp.toJson)(N$a.TimestampSchema,r)} to IANA timezone ${t}`);return new Date(s,a,l,c,u,d,n.getUTCMilliseconds())}var{STRING:v1v,INT:p3r}=zar.CelScalar;function Eet(e,t){function r(n){let o=b1v(this,n),i=t(o);try{return BigInt(i)}catch(s){throw Error(`Error converting ${i} of ${String(o)} of ${(0,mIp.toJson)(N$a.TimestampSchema,this.message)} to BigInt`)}}return[(0,d3r.celMethod)(e,zar.TIMESTAMP,[],p3r,r),(0,d3r.celMethod)(e,zar.TIMESTAMP,[v1v],p3r,r)]}F$a.default=[(0,d3r.celMethod)($Se.TIME_GET_SECONDS,zar.DURATION,[],p3r,function(){return this.message.seconds}),(0,d3r.celMethod)($Se.TIME_GET_MINUTES,zar.DURATION,[],p3r,function(){return this.message.seconds/60n}),(0,d3r.celMethod)($Se.TIME_GET_HOURS,zar.DURATION,[],p3r,function(){return this.message.seconds/3600n}),(0,d3r.celMethod)($Se.TIME_GET_MILLISECONDS,zar.DURATION,[],p3r,function(){return BigInt(this.message.nanos)/1000000n}),...Eet($Se.TIME_GET_FULL_YEAR,(e)=>e.getFullYear()),...Eet($Se.TIME_GET_MONTH,(e)=>e.getMonth()),...Eet($Se.TIME_GET_DATE,(e)=>e.getDate()),...Eet($Se.TIME_GET_DAY_OF_MONTH,(e)=>e.getDate()-1),...Eet($Se.TIME_GET_DAY_OF_WEEK,(e)=>e.getDay()),...Eet($Se.TIME_GET_DAY_OF_YEAR,(e)=>_1v(e)),...Eet($Se.TIME_GET_SECONDS,(e)=>e.getSeconds()),...Eet($Se.TIME_GET_MINUTES,(e)=>e.getMinutes()),...Eet($Se.TIME_GET_HOURS,(e)=>e.getHours()),...Eet($Se.TIME_GET_MILLISECONDS,(e)=>e.getMilliseconds())]}

// Habia 15 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
