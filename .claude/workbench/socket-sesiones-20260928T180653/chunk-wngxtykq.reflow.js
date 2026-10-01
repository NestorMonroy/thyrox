// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  v,U
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  Fo
}from"/$bunfs/root/chunk-yqm14hey.js";
import{
  b,J,ce
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  Se
}from"/$bunfs/root/chunk-4cnes656.js";
import{
  O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  YCe
}from"/$bunfs/root/chunk-t0sp7zte.js";
import{
  An,JL
}from"/$bunfs/root/chunk-797phdpb.js";
import{
  a
}from"/$bunfs/root/chunk-v49zfq06.js";
var m=65534,A=new Set(["/","/dev","/dev/shm","/run","/run/user","/tmp","/var","/var/tmp","/var/run","/home","/var/home","/root","/var/roothome","/mnt","/mnt/wslg"]);
function _ko(){
  return A
}import{
  readFile as P
}from"fs/promises";
async function D(){
  try{
    return F(await P("/proc/self/uid_map","utf8"))
  }catch{
    return
  }
}function F(e){
  let t=[];
  for(let n of e.split(`
`)){
    if(n.trim()==="")continue;
    let r=n.trim().split(/\s+/),o=Number(r[0]),s=Number(r[1]),u=Number(r[2]);
    if(r.length!==3||!Number.isSafeInteger(o)||o<0||!Number.isSafeInteger(s)||s<0||!Number.isSafeInteger(u)||u<=0)return;
    t.push({
      innerStart:o,hostStart:s,count:u
    })
  }return t
}function h(e){
  return e.length===1&&e[0].innerStart===0&&e[0].count>=4294967295
}async function S(){
  try{
    return R(await P("/proc/sys/kernel/overflowuid","utf8"))
  }catch{
    return
  }
}function R(e){
  let t=e.trim();
  if(!/^\d+$/.test(t))return;
  let n=Number(t);
  return Number.isSafeInteger(n)?n:void 0
}function B(e,t){
  if(e.length===0||t===void 0)return;
  return e.some((r)=>t>=r.innerStart&&t<r.innerStart+r.count)?void 0:t
}async function bko(){
  let e=process.getuid?.(),t=await D();
  if(t===void 0){
    let n=await S()??m;
    return e===n?{
      unmappedOwnerUid:void 0,uidCollapses:!0,rootUidAmbiguous:n===0
    }:void 0
  }if(h(t))return;
  return L(t,e)
}async function L(e,t){
  let n=await S(),r=n??m;
  return{
    unmappedOwnerUid:B(e,n),uidCollapses:e.length===0||t!==void 0&&t===r,rootUidAmbiguous:n===0
  }
}async function LOt(){
  let e=process.getuid?.();
  if(e===void 0)return;
  let t=await D();
  if(t===void 0)return;
  if(h(t))return e;
  let n=await S()??m;
  if(t.length===0||e===n)return;
  if(((s)=>t.some((u)=>s>=u.innerStart&&s<u.innerStart+u.count))(n))return e;
  let o=t.find((s)=>e>=s.innerStart&&e<s.innerStart+s.count);
  return o===void 0?void 0:o.hostStart+(e-o.innerStart)
}function E1n(){
  return YCe.uidsCollapse??=K(ce()),YCe.uidsCollapse
}function K(e){
  let t=process.getuid?.(),n;
  try{
    let s=e.readFileSync("/proc/self/uid_map",{
      encoding:"utf8"
    });
    n=F(s)
  }catch{
    n=void 0
  }let r;
  try{
    let u=e.readFileSync("/proc/sys/kernel/overflowuid",{
      encoding:"utf8"
    });
    r=R(u)
  }catch{
    r=void 0
  }let o=r??m;
  if(n===void 0)return t===o;
  if(h(n))return!1;
  return n.length===0||t!==void 0&&t===o
}import{
  createHash as j,randomBytes as x
}from"crypto";
import{
  lstatSync as z,mkdirSync as V,readFileSync as W,rmSync as X,writeFileSync as H
}from"fs";
import{
  chmod as E,lstat as l,mkdir as d,readdir as y,readFile as I,rm as _,utimes as G
}from"fs/promises";
import{
  connect as Y
}from"net";
import{
  basename as q,dirname as T,join as i,resolve as Q
}from"path";
function c(){
  return i(Se(),"daemon")
}function Z(){
  return j("sha256").update(Q(Se())).digest("hex").slice(0,8)
}function hge(){
  let e=process.getuid?.()??0,t=a.TERMUX_VERSION&&a.PREFIX?i(a.PREFIX,"tmp"):"/tmp";
  return i(t,`cc-daemon-${e}`,Z())
}var ee=/^[a-f0-9]{16}$/;
function HRr(){
  return i(c(),"pipe.key")
}var te=Fo(()=>{
  let e=HRr();for(let t=0;t<8;t++){
    let n;try{
      let o=z(e);if(!o.isFile()||o.size>4096){
        try{
          X(e,{
            recursive:!0,force:!0
          })
        }catch{
        }n="invalid"
      }else n=W(e,"utf8").trim()
    }catch(o){
      if(!U(o))throw o
    }if(n!==void 0){
      if(ee.test(n))return n;if(n===""&&t<3)continue;let o=x(8).toString("hex");return JL(e,o,384),o
    }let r=x(8).toString("hex");V(c(),{
      recursive:!0,mode:448
    });try{
      return H(e,r,{
        flag:"wx",mode:384
      }),r
    }catch(o){
      if(v(o)!=="EEXIST")throw o
    }
  }throw Error("daemon pipe.key is not a valid nonce")
},()=>Se());
function k(e){
  return`\\\\.\\pipe\\cc-daemon-${te()}-${e}`
}function hw(e){
  return e.replace(/cc-daemon-[0-9a-f]{16}/g,"cc-daemon-*")
}function sat(e){
  if(e instanceof Error){
    if(e.message=hw(e.message),typeof e.stack==="string")e.stack=hw(e.stack)
  }return e
}function osn(){
  return i(c(),"control.key")
}async function Sko(){
  let e=osn();
  try{
    let n=await l(e);
    if(n.isFile()&&n.size<=4096){
      let r=(await I(e,"utf8")).trim();
      if(r)return r
    }else await _(e,{
      recursive:!0,force:!0
    }).catch(()=>{
    })
  }catch(n){
    if(!U(n))throw n
  }let t=x(16).toString("hex");
  return await d(c(),{
    recursive:!0,mode:448
  }),await An(e,t,384),t
}async function yge(){
  try{
    let e=await l(osn());
    if(!e.isFile()||e.size>4096)return;
    return(await I(osn(),"utf8")).trim()||void 0
  }catch{
    return
  }
}async function wko(){
  let e=c();
  if(O()==="windows"){
    await d(e,{
      recursive:!0
    }),await E(e,448).catch(()=>{
    });
    return
  }await d(e,{
    recursive:!0,mode:448
  }),N();
  let t=process.getuid?.(),n=await l(e);
  if(t!==void 0&&n.uid!==t)throw Error(`refusing to use daemon dir: ${e} is owned by uid ${n.uid}`);
  if((n.mode&511)!==448)await E(e,448)
}async function NOt(){
  if(O()==="windows")return;
  let e=hge();
  await d(e,{
    recursive:!0,mode:448
  });
  let t=new Date;
  await G(e,t,t).catch(()=>{
  }),await C([T(e),e])
}var k1n="ENOTOWNED";
async function C(e){
  let t=process.getuid?.();
  N();
  for(let n of e){
    let r=await l(n);
    if(t!==void 0&&r.uid!==t)throw Object.assign(Error(`refusing to bind: ${n} is owned by uid ${r.uid}`),{
      code:k1n
    });
    if((r.mode&511)!==448)await E(n,448)
  }
}var MRr="refusing to use the daemon socket: this process runs in a user namespace without a uid mapping, so directory and peer ownership cannot be verified (start it with a mapping, e.g. unshare -Ur)";
function N(){
  if(E1n())throw Object.assign(Error(MRr),{
    code:k1n
  })
}async function vko(e){
  if(O()==="windows"){
    await d(e,{
      recursive:!0
    }).catch(()=>{
    });
    return
  }await NOt();
  let t=[A4e(),T1n()];
  for(let n of t)await d(n,{
    recursive:!0,mode:448
  });
  if(!t.includes(e)){
    if(await d(e,{
      recursive:!0,mode:448
    }).then(()=>!0,()=>!1))t.push(e)
  }await C(t)
}function Eko(){
  if(O()==="windows")return;
  let e=hge(),t=T(e),n=q(e);
  y(t,{
    withFileTypes:!0
  }).then(async(r)=>{
    for(let o of r){
      if(!o.isDirectory()||o.name===n)continue;let s=i(t,o.name);if(!await ne(i(s,"control.sock")))continue;let u=await l(s).catch(()=>null);if(!u||Date.now()-u.mtimeMs<1e4)continue;let p=await y(i(s,"rv")).catch(()=>[]),g=await y(i(s,"pty")).catch(()=>[]),w=await y(i(s,"spare")).catch(()=>[]);if(p.length||g.length||w.length)continue;await _(s,{
        recursive:!0,force:!0
      }).catch(()=>{
      })
    }
  }).catch(()=>{
  })
}function ne(e){
  let t,n=new Promise((o)=>{
    t=o
  }),r=Y(e);
  return r.setTimeout(1000,()=>{
    r.destroy(),t(!1)
  }),r.on("error",(o)=>{
    let s=v(o);t(s==="ENOENT"||s==="ECONNREFUSED"||s==="ENOTSOCK")
  }),r.once("connect",()=>{
    r.end(`{"op":"ping"}
`),t(!1)
  }),n
}function wee(){
  return i(c(),"dispatch")
}function DRr(){
  return i(c(),"dispatch","rejected")
}function EB(){
  return i(c(),"roster.json")
}var ssn="attach-journal";
function vee(){
  return i(c(),ssn)
}function T1n(){
  return i(hge(),"rv")
}function E4e(){
  return i(c(),"auth")
}function k4e(e){
  return i(E4e(),`${e}.json`)
}function $Ot(){
  return i(c(),"host-managed")
}function Hae(e){
  return i($Ot(),e)
}function T4e(e){
  return i(E4e(),`${e}.tokens.json`)
}function FOt(e){
  if(O()==="windows")return k(`rv-${e}`);
  return i(T1n(),`${e}.sock`)
}function A4e(){
  return i(hge(),"pty")
}function vS(e){
  if(O()==="windows")return k(`pty-${e}`);
  return i(A4e(),`${e}.sock`)
}function L9(){
  return i(hge(),"spare")
}function kko(e){
  return i(L9(),`${e}.pty.sock`)
}function Tko(e){
  return i(L9(),`${e}.claim.sock`)
}function cLe(){
  return i(c(),"pty-pids")
}function Eee(e){
  return i(cLe(),`${e}.pid`)
}function yw(e){
  return M(e,"err")
}function nx(e){
  return M(e,"late")
}function M(e,t){
  if(O()==="windows")return i(cLe(),`${e.split("\\").pop()}.${t}`);
  return`${e}.${t}`
}function HV(e){
  if(O()==="windows")return i(cLe(),`${e.split("\\").pop()}.exec-exit`);
  return`${e}.exec-exit`
}function kB(){
  if(O()==="windows")return k("control");
  return N(),i(hge(),"control.sock")
}var C4e=0,isn=1,UOt=262144,f=5,BOt=1048576,_ge=1e4;
function jOt(e){
  let t=typeof e==="string"?Buffer.from(e,"utf8"):e,n=Buffer.allocUnsafe(f+t.length);
  return n.writeUInt32BE(t.length,0),n.writeUInt8(C4e,4),t.copy(n,f),n
}function QO(e){
  let t=Buffer.from(b(e),"utf8"),n=Buffer.allocUnsafe(f+t.length);
  return n.writeUInt32BE(t.length,0),n.writeUInt8(isn,4),t.copy(n,f),n
}function asn(e,t){
  let n=Buffer.alloc(0),r=!1;
  return(o)=>{
    if(r)return;
    n=n.length===0?o:Buffer.concat([n,o]);
    while(n.length>=f){
      let s=n.readUInt32BE(0);
      if(s>BOt){
        r=!0,t(`frame too large (${s} > ${BOt})`);
        return
      }let u=f+s;
      if(n.length<u)return;
      let p=n.readUInt8(4),g=n.subarray(f,u);
      if(n=n.subarray(u),p===C4e)e({
        kind:C4e,payload:Buffer.from(g)
      });
      else if(p===isn){
        let w;
        try{
          w=J(g.toString("utf8"))
        }catch{
          r=!0,t("bad ctrl json");
          return
        }e({
          kind:isn,ctrl:w
        })
      }else{
        r=!0,t(`unknown frame kind ${p}`);
        return
      }
    }
  }
} export{
  _ko,bko,LOt,E1n,hge,HRr,hw,sat,osn,Sko,yge,wko,NOt,k1n,MRr,vko,Eko,wee,DRr,EB,ssn,vee,T1n,E4e,k4e,$Ot,Hae,T4e,FOt,A4e,vS,L9,kko,Tko,cLe,Eee,yw,nx,HV,kB,C4e,isn,UOt,BOt,_ge,jOt,QO,asn
};