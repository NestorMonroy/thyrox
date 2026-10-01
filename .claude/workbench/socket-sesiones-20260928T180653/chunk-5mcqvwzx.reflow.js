// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  rN,fj,p1t,amt,O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  Do,OFe,DLo
}from"/$bunfs/root/chunk-0grnxhq4.js";
import{
  l,U
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  ok
}from"/$bunfs/root/chunk-s1pmhfks.js";
import{
  Y,qe
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  N
}from"/$bunfs/root/chunk-8nz62976.js";
import{
  Wh
}from"/$bunfs/root/chunk-yqm14hey.js";
import{
  b,zo,t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  Se
}from"/$bunfs/root/chunk-4cnes656.js";
import{
  An
}from"/$bunfs/root/chunk-797phdpb.js";
import{
  Re
}from"/$bunfs/root/chunk-qbkceaaj.js";
import{
  f
}from"/$bunfs/root/chunk-bnk68ax9.js";
import{
  Gw
}from"/$bunfs/root/chunk-v49zfq06.js";
import{
  Nh,TFe,Pv,Hx,n6,nc
}from"/$bunfs/root/chunk-x5vr5vwm.js";
import{
  cl,pA,w0,gi,wye,fYe,ZFr,lh,IL,mJ,r3n,qce
}from"/$bunfs/root/chunk-q8a07cv0.js";
import{
  Zt
}from"/$bunfs/root/chunk-8w2y72gy.js";
import{
  HP,v0
}from"/$bunfs/root/chunk-t0sp7zte.js";
import{
  pr
}from"/$bunfs/root/chunk-2vygpg3s.js";
import{
  da
}from"/$bunfs/root/chunk-jzycvw5e.js";
import{
  pn
}from"/$bunfs/root/chunk-xn8f4n02.js";
import{
  o,u
}from"/$bunfs/root/chunk-dk5kbfrn.js";
import{
  dp,Ks
}from"/$bunfs/root/chunk-mp7hmykc.js";
import{
  D
}from"/$bunfs/root/chunk-153dnzje.js";
import{
  rt
}from"/$bunfs/root/chunk-nwpc1c89.js";
var se=[fj,rN,p1t],ve=[...amt,"system-reminder"],B;
function K(){
  return B??=DLo([{
    tags:se
  }]),B
}function aYe(e){
  return K().neutralize(e)
}function X4n(e){
  return K().openerOffsets(e)
}var ie=new RegExp(`[${OFe.open}]`,"u");
function H(e){
  return ie.test(e)||e.includes("\\u")
}var oe=/^\s*(?:\{\s*["}]|\[\s*(?:["{[\]\d-]|true\b|false\b|null\b))/,ae=new Map([['"','"'],["\\","\\"],["/","/"],["b","\b"],["f","\f"],["n",`
`],["r","\r"],["t","\t"]]);
function z(e,n){
  let r=n,i=1;
  while(i%2===1){
    if(r=e.indexOf('"',r+1),r===-1)return-1;
    i=0;
    while(e.charCodeAt(r-i-1)===92)i++
  }return r
}function de(e){
  let n=[],r=e.indexOf('"');
  while(r!==-1){
    let i=z(e,r);
    if(i===-1){
      n.push([r+1,e.length]);
      break
    }n.push([r+1,i]),r=e.indexOf('"',i+1)
  }return n
}function ue(e){
  if(oe.test(e))return!0;
  let n=e.search(/\S/),r=e[n]==='"'?z(e,n):-1;
  return r!==-1&&e.slice(r+1).trim()===""
}function ce(e,n,r){
  let i="",d=[],a=[];
  for(let c=n;c<r;){
    let g=e[c],S=1;
    if(g==="\\"&&c+1<r){
      let k=ae.get(e[c+1]),p=e.slice(c+2,c+6);
      if(k!==void 0)g=k,S=2;
      else if(e[c+1]==="u"&&c+6<=r&&/^[0-9a-fA-F]{4}$/.test(p))g=String.fromCharCode(parseInt(p,16)),S=6
    }i+=g,d.push(c),a.push(c+S),c+=S
  }return{
    value:i,starts:d,ends:a
  }
}function fe(e){
  let n=new Map;
  for(let d of X4n(e))n.set(d,{
    end:d+1,keepsOpener:e[d]==="<"
  });
  for(let[d,a]of de(e)){
    if(!H(e.slice(d,a)))continue;
    let{
      value:c,starts:g,ends:S
    }=ce(e,d,a);
    for(let k of X4n(c))n.set(g[k],{
      end:S[k],keepsOpener:c[k]==="<"
    })
  }let r="",i=0;
  for(let d of[...n.keys()].sort((a,c)=>a-c)){
    let{
      end:a,keepsOpener:c
    }=n.get(d);
    r+=e.slice(i,c?a:d)+(c?"\\\\":"<\\\\"),i=a
  }return r+e.slice(i)
}function lYe(e){
  if(!H(e))return e;
  return ue(e)?fe(e):aYe(e)
}var Hm="main";
function Wce(e,n){
  return`<${p1t} from="${Do(e)}">
${dpt(n)}
</${p1t}>`
}function dpt(e){
  return lYe(e)
}async function J4n(e,n){
  let r=[],i;
  try{
    i=await Ks((d)=>e.listEntries({
      namespace:"session"
    },{
      cursor:d,skipKeyStats:!0
    }),(d)=>{
      for(let a of d)if(a.kind==="key"&&a.key.namespace==="session")r.push(a.key.file)
    })
  }catch(d){
    n.onIssue?.(`failed: ${l(d)}`);
    return
  }switch(i.status){
    case"done":return r;
    case"error":n.onIssue?.(`failed: ${rt(i.error)}`);
    return;
    case"capped":return n.onIssue?.(`truncated at ${dp} pages; ${r.length} names seen`,"warn"),n.partialOnCap?r:void 0
  }
}import{
  createHash as le,randomBytes as j
}from"crypto";
import{
  mkdir as me,readdir as q,unlink as F
}from"fs/promises";
import{
  basename as pe,join as _,resolve as ge
}from"path";
var X="auth",rfn=/^(\d+)\.[0-9a-f]{64}\.key$/,ke=/^(\d+)\.[0-9a-f]{64}\.key\.tmp\.[0-9a-f]+$/,v=16,he=/^[0-9a-f]{32}$/,x=4096,W=f(()=>u({
  peerToken:o().regex(he),procStart:o().optional(),procStartFt:o().optional(),pidDomain:o().optional()
}));
function ofn(){
  return O()==="windows"
}function YDo(){
  return{
    peerToken:j(v).toString("hex"),childToken:j(v).toString("hex")
  }
}var sfn=25;
function sz(){
  return _(Se(),"sessions")
}function Iv(e){
  let n=qce(e);
  if(n!==void 0)return`\\\\.\\pipe\\${r3n(n)}`;
  if(Wh(e))return;
  return ge(e)
}function J(e){
  let n=Iv(e);
  return n===void 0?void 0:le("sha256").update(n).digest("hex")
}function Q(e,n){
  let r=J(n);
  if(r===void 0)throw Error("refusing to derive a messaging key name for a non-canonical socket path");
  return`${e}.${r}.key`
}async function XDo(e,n,r,{
  sweepPermitted:i
}){
  if(N()&&r!==void 0)return ye(r,e,n);
  let d=sz();
  await me(d,{
    recursive:!0,mode:448
  }),await be(d,i);
  let a=_(d,Q(process.pid,e));
  try{
    await F(a)
  }catch{
  }return await An(a,b({
    peerToken:n,...n6(await Pv()),pidDomain:await HP()
  }),384),a
}async function ye(e,n,r){
  let i=Q(process.pid,n),d=await e.ensureScope({
    namespace:"session"
  });
  if(!d.ok)throw t(`[uds-auth] sessions scope unavailable: ${rt(d.error)}`),Error("messaging key folder could not be made through storage");
  try{
    await e.delete(Re.session(i))
  }catch{
  }let a=await e.write(Re.session(i),b({
    peerToken:r,...n6(await Pv()),pidDomain:await HP()
  }),{
    publishDiscipline:"atomic",mode:384,exactMode:384
  });
  if(!a.ok)throw t(`[uds-auth] key publish failed: ${rt(a.error)}`),Error("messaging key could not be published through storage");
  return _(sz(),i)
}async function ifn(e){
  try{
    let n=await cl(e,x);
    if(n===null)return;
    let r=W().safeParse(zo(n));
    return r.success?r.data.pidDomain:void 0
  }catch{
    return
  }
}async function be(e,n){
  if(!n)return;
  let r;
  try{
    r=await q(e)
  }catch{
    return
  }let i=await HP();
  await Promise.all(r.map(async(d)=>{
    let a=ke.exec(d);if(!a||!Nh(parseInt(a[1],10)))return;let c=await ifn(_(e,d));if(c!==void 0&&c!==i)return;try{
      await F(_(e,d))
    }catch{
    }
  }))
}async function JDo(e,n){
  if(N()&&n!==void 0){
    try{
      await n.delete(Re.session(pe(e)))
    }catch{
    }return
  }try{
    await F(e)
  }catch{
  }
}async function QDo(e,n,r){
  let i=sz(),d;
  if(N()&&n!==void 0){
    let p=await J4n(n,{
      partialOnCap:!1
    });
    if(p===void 0)return{
      kind:"unusable"
    };
    d=p
  }else try{
    d=await q(i)
  }catch(p){
    return U(p)?{
      kind:"no-key"
    }:{
      kind:"unusable"
    }
  }let a=J(e);
  if(a===void 0)return{
    kind:"no-key"
  };
  let c=`.${a}.key`,g=d.filter((p)=>p.endsWith(c)).map((p)=>{
    let h=rfn.exec(p);return h?{
      file:p,pid:parseInt(h[1],10)
    }:void 0
  }).filter((p)=>p!==void 0);
  if(g.length===0)return{
    kind:"no-key"
  };
  let S=async(p)=>{
    let h=N()&&n!==void 0?await Ee(n,p):await cl(_(i,p),x);
    if(h===null)return;
    try{
      let E=W().safeParse(zo(h));
      return E.success?E.data:void 0
    }catch{
      return
    }
  };
  if(g.length===1){
    let p=g[0];
    if(r?.requireLiveOwner&&Nh(p.pid))return{
      kind:"dead-owner"
    };
    let h=await S(p.file);
    if(h===void 0)return{
      kind:"unusable"
    };
    if(r?.requireLiveOwner){
      let E=Hx(h);
      if(E!==void 0){
        let w=await nc(p.pid,{
          skipCache:!0
        });
        if(w!==void 0&&!TFe(E,w))return{
          kind:"dead-owner"
        }
      }
    }return{
      kind:"token",token:h.peerToken
    }
  }let k;
  for(let{
    file:p,pid:h
  }of g){
    let E=await S(p);
    if(E===void 0)continue;
    let w=0;
    if(!Nh(h)){
      let I=Hx(E),R=I===void 0?void 0:await nc(h,{
        skipCache:!0
      });
      if(I===void 0||R===void 0)w=1;
      else w=TFe(I,R)?2:0
    }if(k===void 0||w>k.rank)k={
      rank:w,peerToken:E.peerToken
    }
  }if(k===void 0)return{
    kind:"unusable"
  };
  if(r?.requireLiveOwner&&k.rank===0)return{
    kind:"dead-owner"
  };
  return{
    kind:"token",token:k.peerToken
  }
}async function Ee(e,n){
  try{
    let r=await e.readText([{
      key:Re.session(n),offset:0,length:x+1
    }]);
    if(!r.ok)return null;
    let i=r.value.items[0];
    if(!i.found||i.totalBytes>x)return null;
    return i.value
  }catch{
    return null
  }
}function zFr(e){
  return b({
    type:X,token:e
  })+`
`
}var ZDo=zFr("0".repeat(v*2)).length;
function eLo(e){
  return typeof e==="object"&&e!==null&&"type"in e&&e.type===X
}function tLo(e,n){
  if(n===void 0)return;
  if(v0(e,n.peerToken))return"peer";
  if(v0(e,n.childToken))return"child";
  return
}function Nq(){
  let{
    getFeatureValue_SESSION_PINNED:e
  }=import.meta.require("/$bunfs/root/chunk-whgt1c2k.js");
  try{
    return e("tengu_session_stable_address",!1)
  }catch{
    return!1
  }
}var Z="sid:";
function upt(e){
  return`${Z}${e}`
}function cYe(e){
  return e.startsWith(Z)
}function yFe(e){
  return!cYe(e.sock)
}import{
  basename as we
}from"path";
function Q4n(e){
  let n=typeof e==="string"?e.trim():"",r=nne(n);
  return!n||!r||r==="untitled session"&&n.toLowerCase()!=="untitled session"
}function _Fe(e){
  return e.environmentKind!==void 0&&e.environmentKind!=="bridge"
}function VFr(e){
  return!_Fe(e)&&e.connected===!1
}function Cr(e){
  return e.normalize("NFKC").replace(/[\p{Cc}\p{Cf}]/gu,(n)=>/\s/.test(n)?n:"").trim().toLowerCase().replace(/\s+/g,"-")
}function bFe(e){
  return typeof e!=="string"||PP(e)
}function dYe(e,n){
  return e.name===gi&&n!==void 0&&e.agentId===n
}function e6(e){
  let n=e.teamContext;
  if(n?.leadAgentId&&n.isLeader!==!1)return n.leadAgentId;
  let r=da(n);
  return r?w0(gi,r):void 0
}function SFe(e,n){
  return e.members.filter((r)=>dYe(r,n)||!bFe(r.name))
}function PP(e){
  let n=Cr(e);
  return n===Hm||n===gi||n===wye||n===fYe||ok(n)!==null
}var M=6,qFr=12,Gce=`[0-9a-f]{${M},${qFr}}`,Ie=new RegExp(`^(.*\\S)\\s*\\[(${Gce})\\]$`);
function O1(e){
  let n=Ie.exec(e.trim());
  return n?{
    name:n[1],ref:n[2]
  }:null
}function H1(e,n){
  let r=[];
  r.push({
    name:Hm,id:qe(),kind:"main",where:"in-process",lastActive:void 0,sock:void 0
  });
  let i=new Set;
  for(let[s,m]of Object.entries(e.teamContext?.teammates??{
  }))i.add(s),r.push({
    name:m.name,id:s,kind:"teammate",where:"in-process",lastActive:void 0,sock:void 0
  });
  for(let[s,m]of e.agentNameRegistry){
    let y=e.tasks[m],A=y?.type==="local_agent"?y:void 0;
    r.push({
      name:s,id:m,kind:"subagent",where:"in-process",lastActive:A?.startTime,sock:void 0
    })
  }for(let s of n.teamFile?.members??[]){
    if(i.has(s.agentId))continue;
    i.add(s.agentId),r.push({
      name:s.name,id:s.agentId,kind:"teammate",where:"this-machine",lastActive:void 0,sock:void 0
    })
  }let d=Nq(),a=n.sessions.filter(yFe),c=d?ne(a):void 0,g=d?te(Y(),a,c):void 0;
  for(let s of a){
    let m=c?.get(s)?.claims;
    r.push({
      name:s.name||we(s.cwd),id:s.sock,kind:"session",where:"this-machine",lastActive:s.statusUpdatedAt,sock:s.sock,...m!==void 0&&m.size>0&&{
        claimedSessionIds:[...m].sort()
      },...d&&s.sessionId!==void 0&&!g.has(s.sessionId)&&{
        stableId:upt(s.sessionId)
      },...d&&s.nameSource==="derived"&&{
        derivedName:!0
      },...s.hostSessionId!==void 0&&{
        hostSessionId:s.hostSessionId
      }
    })
  }let S=new Map;
  for(let s of n.sessions)if(s.bridgeSessionId!==void 0){
    let m=pr(s.bridgeSessionId);
    S.set(m,[...S.get(m)??[],s.sock])
  }let k=[];
  for(let s of n.cloud??[]){
    if(rFt(n.sessions,s.id)){
      k.push({
        rawName:s.title||"untitled",socks:S.get(pr(s.id))??[]
      });
      continue
    }r.push({
      name:s.title||"untitled",id:s.id,kind:"cloud-session",...Q4n(s.title)&&{
        derivedName:!0
      },...s.acceptsPeerMessages===!0&&{
        reportsInbound:!0
      },where:s.remoteControl?"remote":"cloud",lastActive:s.lastActive,sock:void 0,...s.offline&&{
        offline:!0
      }
    })
  }let p=new Set((n.cloud??[]).map((s)=>pr(s.id))),h=fpt(n.sessions);
  for(let s of n.bridge??[]){
    let m=pr(s.id);
    if(p.has(m))continue;
    if(h.has(m)){
      k.push({
        rawName:s.title||"untitled",socks:S.get(m)??[]
      });
      continue
    }let y=Date.parse(s.updated_at);
    r.push({
      name:s.title||"untitled",id:s.id,kind:"bridge-session",...Q4n(s.title)&&{
        derivedName:!0
      },...s.acceptsPeerMessages===!0&&{
        reportsInbound:!0
      },...s.inboundReportUnavailable&&{
        inboundReportUnavailable:!0
      },where:_Fe(s)?"cloud":"remote",lastActive:Number.isNaN(y)?void 0:y,sock:void 0,...VFr(s)&&{
        offline:!0
      }
    })
  }let E=e6(e),w=r.flatMap((s)=>{
    let m=nne(s.name);if(m===null||!L(m))return[];let y=s.kind==="main"||s.kind==="teammate"&&dYe({
      name:s.name,agentId:s.id
    },E),A=(s.kind==="session"||s.kind==="cloud-session"||s.kind==="bridge-session")&&Cr(m)===Hm;return y||A||!bFe(m)?[{
      ...s,name:m
    }]:[]
  }),I=new Set,R=_e(w.filter((s)=>{
    if(s.kind!=="session")return!0;let m=`${Cr(s.name)}\x00${Iv(s.id)??s.id}`;if(I.has(m))return!1;return I.add(m),!0
  })),P=new Map;
  for(let s of R){
    let m=Cr(s.name),y=P.get(m);
    if(y)y.push(s);
    else P.set(m,[s])
  }let C=new Map;
  for(let{
    rawName:s,socks:m
  }of k){
    let y=nne(s);
    if(y===null||!L(y))continue;
    let A=Cr(y),G=C.get(A)??new Set;
    for(let re of m)G.add(re);
    C.set(A,G)
  }return{
    candidates:R,byName:P,remoteNamesClaimedLocally:C
  }
}function uYe(e,n,r){
  let i=e.get(n);
  if(!i||i.length===0)return;
  let d=r===void 0?[]:i.filter((g)=>g.name===r),c=(d.length>0?d:i)[0];
  if(c.where==="in-process")return{
    kind:"one",candidate:c
  };
  return{
    kind:"ambiguous"
  }
}function t6(e){
  return`${e.name} [${e.ref}]`
}function Z4n(e){
  return e==="remote"?`${e3n(e)} (Remote Control)`:e3n(e)
}function e3n(e){
  switch(e){
    case"in-process":return"in this session";
    case"cloud":return"in the cloud";
    case"remote":return"on another machine";
    case"this-machine":return"on this machine"
  }
}function eFt(e,n){
  let r=e.kind==="main"?"main conversation":e.kind==="session"||e.kind==="cloud-session"||e.kind==="bridge-session"?"Claude session":e.kind,i=Z4n(e.where),d=e.lastActive===void 0?"":`, ${e.kind==="subagent"?"started":"active"} ${Zt(Math.max(0,n-e.lastActive),{mostSignificantOnly:!0})} ago`;
  return`${t6(e)} \u2014 ${r}, ${i}${d}`
}var Ae=pA;
function nne(e){
  if(typeof e!=="string")return null;
  return[...e.replace(/[\p{Cc}\p{Cf}]/gu,(r)=>/\s/.test(r)?r:"").replace(/\s+/g," ").trim()].slice(0,Ae).join("").trim()||"untitled session"
}function afn(e,n){
  return e.find((r)=>r.name===n)??e.find((r)=>nne(r.name)===n)
}function rne(e){
  let n=nne(e);
  return n!==null&&!ppt(n)&&IL(n)?n:null
}function tFt(e){
  let n=nne(e);
  return n!==null&&L(n)&&!PP(n)?n:null
}function L(e){
  return!ppt(e)&&IL(e)&&!e.includes("@")&&e!=="*"
}function ppt(e){
  let n=Cr(e);
  return lh(e).scheme!=="other"||lh(n).scheme!=="other"||ZFr(e)||ZFr(n)
}function _e(e){
  let n=e.map((a)=>T(a.kind,nFt(a))),r=xe().map((a)=>T("session",a)),i=D([...n,...r]).sort(),d=new Map;
  for(let a=0;a<i.length;a++){
    let c=i[a],g=Math.max(a>0?V(c,i[a-1]):0,a+1<i.length?V(c,i[a+1]):0);
    d.set(c,Math.min(c.length,Math.max(M,g+1)))
  }return e.map((a,c)=>{
    let g=n[c];return{
      ...a,ref:g.slice(0,d.get(g))
    }
  })
}function V(e,n){
  let r=0;
  while(r<e.length&&r<n.length&&e[r]===n[r])r++;
  return r
}function T(e,n){
  return String(pn(`${e}:${n}`))
}function nFt(e){
  return e.stableId??e.id
}function xe(){
  let e=Gw.CLAUDE_CODE_MESSAGING_SOCKET;
  return e===void 0?[]:ee(e)
}function KFr(e){
  return Nq()?upt(Y()):e
}function ee(e){
  let n=KFr(e);
  return n===e?[e]:[n,e]
}function YFr(e,n){
  return ee(n).some((r)=>Te(e,"session",r))
}function ne(e){
  let n=[];
  for(let i of e){
    let d=n.filter((c)=>c.records.some((g)=>mJ(g.sock,i.sock))),a={
      records:[],claims:new Set
    };
    for(let c of d){
      a.records.push(...c.records);
      for(let g of c.claims)a.claims.add(g)
    }if(a.records.push(i),i.sessionId!==void 0)a.claims.add(i.sessionId);
    n=n.filter((c)=>!d.includes(c)),n.push(a)
  }let r=new Map;
  for(let i of n)for(let d of i.records)r.set(d,i);
  return r
}function te(e,n,r){
  let i=new Set([e]),d=new Set;
  for(let a of n){
    if(a.sessionId===void 0)continue;
    if(i.has(a.sessionId))d.add(a.sessionId);
    i.add(a.sessionId)
  }for(let a of new Set(r.values()))if(a.records.length>1)for(let c of a.claims)d.add(c);
  return d
}function nLo(e,n,r){
  if(r)return!0;
  let i=Y(),d=e.filter(yFe);
  if(n!==void 0)d.push({
    sock:n,sessionId:i
  });
  let a=ne(d);
  return te("",d,a).has(i)
}function wFe(e,n){
  return T(e,n).slice(0,M)
}function Te(e,n,r){
  return e.length>=M&&T(n,r).startsWith(e)
}function fpt(e){
  return new Set(e.flatMap((n)=>n.bridgeSessionId?[pr(n.bridgeSessionId)]:[]))
}function rFt(e,n){
  let r=pr(n);
  return e.some((i)=>i.bridgeSessionId!==void 0&&pr(i.bridgeSessionId)===r)
} export{
  aYe,X4n,lYe,Hm,Wce,dpt,J4n,rfn,ofn,YDo,sfn,sz,Iv,XDo,ifn,JDo,QDo,zFr,ZDo,eLo,tLo,Nq,upt,cYe,yFe,Q4n,_Fe,VFr,Cr,bFe,dYe,e6,SFe,PP,qFr,Gce,O1,H1,uYe,t6,Z4n,e3n,eFt,nne,afn,rne,tFt,ppt,nFt,KFr,YFr,nLo,wFe,fpt,rFt
};