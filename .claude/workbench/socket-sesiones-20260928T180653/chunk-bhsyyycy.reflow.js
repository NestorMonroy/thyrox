chunk-bhsyyycy.js: 13 -> 267 lineas; ancho medio 568 -> 31
// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  l,v
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  He
}from"/$bunfs/root/chunk-2j44ssk9.js";
import{
  q,j
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  _,m
}from"/$bunfs/root/chunk-d09a8ccq.js";
import{
  HH,kv,Cut,eF,x
}from"/$bunfs/root/chunk-t6pwageh.js";
import{
  t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  re
}from"/$bunfs/root/chunk-vq0drrah.js";
import{
  Q5,ADo
}from"/$bunfs/root/chunk-fvmr4qjr.js";
import{
  li
}from"/$bunfs/root/chunk-1ay853f5.js";
import{
  pA,lh,mJ
}from"/$bunfs/root/chunk-q8a07cv0.js";
import{
  Cr
}from"/$bunfs/root/chunk-5mcqvwzx.js";
import{
  Ws
}from"/$bunfs/root/chunk-fhcnpt13.js";
import{
  Bf,VOt,D3,DV
}from"/$bunfs/root/chunk-qcy58j4w.js";
var Y=16,E=64;
function P(e,n){
  if(e.startedAt!==n.startedAt)return e.startedAt<n.startedAt;
  let s=e.procStart??"",i=n.procStart??"";
  if(s!==i)return s<i;
  return e.pid<n.pid
}function L(e,n,s){
  return n.filter((i)=>i.pid!==s&&i.name!==void 0&&i.procStart!==void 0&&Cr(i.name)===e)
}function D(e){
  return new Set(e.flatMap((n)=>n.name===void 0?[]:[Cr(n.name)]))
}function O(e,n,s=Q5){
  let i=(r)=>`${re(e,pA-r.length-1)}-${r}`;
  for(let r=0;r<Y;r++){
    let o=i(s());
    if(!n.has(Cr(o)))return o
  }for(let r=2;;r++){
    let o=i(`${s()}-${r}`);
    if(!n.has(Cr(o)))return o
  }
}function B(e){
  let{
    desiredName:n,self:s,live:i,moment:r,slug:o
  }=e,d=e.suffixBase??n,p=Cr(n);
  if(!p)return{
    kind:"keep"
  };
  let c=L(p,i,s.pid),a=r==="rename"?c:r==="startup"?c.filter((u)=>P(u,s)):c.filter((u)=>P({
    ...u,startedAt:u.nameSince??u.startedAt
  },{
    ...s,startedAt:s.nameSince??s.startedAt
  }));
  if(a.length===0)return{
    kind:"keep"
  };
  return{
    kind:"yield",newName:O(d,D(i),o),holders:a
  }
}class b{
  correspondents=new Map;
  senderMode=null;
  userTypedName=void 0;
  hasAdopter=!1;
  lastYield=void 0;
  yielded=He();
  pendingYield=void 0;
  noteCorrespondent(e,n,s){
    if(!e||lh(e).scheme!=="uds")return;
    if(this.correspondents.delete(e),this.correspondents.set(e,{
      pid:n,procStart:s
    }),this.correspondents.size>E){
      let i=this.correspondents.keys().next().value;
      if(i!==void 0)this.correspondents.delete(i)
    }
  }announceYield(e,n){
    this.pendingYield=[e,n],this.yielded.emit(e,n)
  }reset(){
    this.correspondents.clear(),this.lastYield=void 0,this.yielded.clear(),this.pendingYield=void 0,this.senderMode=null,this.userTypedName=void 0,this.hasAdopter=!1
  }
}var F=new q(()=>new b);
function wS(){
  return F.of(j().host)
}function jkr(){
  let e=kv();
  return e!==void 0&&(e.source==="user"||e.source==="collision")&&wS().userTypedName===e.name?e.name:void 0
}function Wkr(e,n,s){
  wS().noteCorrespondent(e,n,s)
}function zFn(){
  let e=wS(),n=e.pendingYield;
  return e.pendingYield=void 0,n
}var w={
  whenRegistered:Cut,listLive:D3
};
function N(){
  return x("tengu_session_name_uniqueness",!0)
}async function tPt(e,n,s=w,i=e){
  if(!N())return{
    name:e,yielded:!1
  };
  if(i=C(i)??i,!await s.whenRegistered())return{
    name:e,yielded:!1
  };
  try{
    let r=await s.listLive(),o=r.find((a)=>a.pid===process.pid);
    if(!o)return{
      name:e,yielded:!1
    };
    let d=B({
      desiredName:e,self:o,live:r,moment:n,slug:s.slug,suffixBase:i
    });
    if(d.kind==="keep")return{
      name:e,yielded:!1
    };
    let p=U(e,o),c=li(p!==void 0&&Cr(p)!==Cr(e)?p:d.newName)||d.newName;
    return t(`[session-name] "${e}" is held by live pid ${d.holders[0]?.pid}; this session takes "${c}"`,{
      level:"info"
    }),_("session_name_collision"),wS().lastYield={
      base:Cr(i),name:c
    },{
      name:c,yielded:!0
    }
  }catch(r){
    return t(`[session-name] uniqueness check failed, keeping "${e}": ${l(r)}`,{
      level:"warn"
    }),m("session_name_collision","check_failed"),{
      name:e,yielded:!1
    }
  }
}function U(e,n){
  let s=fDe(e,n.name);
  if(s!==void 0)return s;
  let i=n.name,r=i===void 0?void 0:A(i);
  if(i===void 0||r===void 0)return;
  let o=C(e)??e,d=re(o,pA-r.suffix.length-1);
  return r.base.toLowerCase()===d.toLowerCase()?i:void 0
}function A(e){
  let n=/-([a-z]+-[a-z]+)(-\d{1,4})?$/i.exec(e);
  if(!n||!ADo(n[1].toLowerCase()))return;
  let s=e.slice(0,e.length-n[0].length);
  return s.length>0?{
    base:s,suffix:n[0].slice(1)
  }:void 0
}function fDe(e,n){
  if(!N())return;
  let s=wS().lastYield,i=C(e)??e;
  return s!==void 0&&n!==void 0&&Cr(s.name)===Cr(n)&&s.base===Cr(i)?n:void 0
}function y(e){
  let n=kv();
  return n!==void 0&&Cr(n.name)===Cr(e)
}function C(e){
  return A(e)?.base
}var z=3000;
function T(e){
  setTimeout(e,z).unref()
}async function Gkr(e){
  let{
    sessionNameArg:n,interactive:s,writeName:i,onRenamed:r,deps:o
  }=e,d=e.scheduleRecheck??T;
  if(n&&s)wS().userTypedName=n;
  if(n)await i(n,e.sessionNameArgSource??"user");
  let p=kv();
  if(!s||!p||p.source==="derived")return;
  let c=async(a,u,g=a)=>{
    if(u&&!y(a))return;
    let f=await tPt(a,u?"recheck":"startup",o,g);
    if(!y(a))return;
    if(!f.yielded){
      if(!u)d(()=>void c(a,!0));
      return
    }if(wS().userTypedName===a)wS().userTypedName=f.name;
    if(await i(f.name,"collision"),r?.(f.name,a),wS().announceYield(f.name,a),!u)d(()=>void c(f.name,!0,a))
  };
  await c(p.name,!1)
}function Vtn(e){
  let{
    name:n,onYield:s,deps:i
  }=e,r=e.suffixBase??n;
  (e.scheduleRecheck??T)(()=>{
    (async()=>{
      if(!y(n))return;let d=await tPt(n,"recheck",i,r);if(!d.yielded||!y(n))return;if(wS().userTypedName===n)wS().userTypedName=d.name;await s(d.name,n)
    })()
  })
}function VFn(e,n,s){
  let i=kv();
  if(i===void 0||i.source==="derived"||i.source==="auto")return;
  if(i.source==="collision"&&fDe(e?.name??n,i.name)!==void 0)return;
  let r=Cr(i.name);
  if(e!==void 0&&r===Cr(e.name)||r===Cr(n)||r===Cr(s))return;
  return i
}async function sae(e,n,s={
}){
  let i=s.deps??w,r=e?li(e):"";
  if(!r)return;
  let o=HH(),d=o.adoptions,p=++o.restores,c=()=>o.adoptions===d&&(!s.yieldToLaterRestore||o.restores===p);
  if(!await i.whenRegistered()||!c())return;
  if(s.autoOnly){
    await eF(r,n,"auto");
    return
  }let a=kv();
  if(a!==void 0&&a.source!=="auto"&&a.source!=="derived"&&Cr(a.name)===Cr(r))return;
  let u=await tPt(r,"rename",i);
  if(!c()||VFn(a,r,u.name))return;
  let g=async(f,S)=>{
    await eF(f,n,"collision"),wS().announceYield(f,S)
  };
  if(!u.yielded){
    await eF(r,n,s.source),Vtn({
      name:r,deps:i,onYield:g
    });
    return
  }if(await eF(u.name,n,"collision"),wS().userTypedName===r)wS().userTypedName=u.name;
  if(Vtn({
    name:u.name,suffixBase:r,deps:i,onYield:g
  }),u.name===a?.name)return;
  wS().announceYield(u.name,r)
}async function zkr(e,n,s,i,r=VOt,o=w.listLive){
  if(!N()||!Ws()||wS().correspondents.size===0)return;
  let d=DV(),[p,c,a]=[e,n,s].map(li),u=`This session was renamed from "${p}" to "${c}" ("${a}" is held by another live session on this machine). Address this one as "${c}" from now on.`,g;
  try{
    g=new Map((await o(i)).map((f)=>[f.pid,f.sock]))
  }catch(f){
    t(`[session-name] rename notice skipped: registry unreadable (${v(f)??l(f)})`);
    return
  }await Promise.all([...wS().correspondents].map(async([f,{
    pid:S,procStart:k
  }])=>{
    let{
      scheme:R,target:h
    }=lh(f);if(R!=="uds"||!h||d!==void 0&&mJ(h,d)||g.get(S)!==h)return;try{
      await r(h,u,i,c,void 0,void 0,wS().senderMode?.(),{
        trackReceipts:!1,expectPeerPid:S,...k!==void 0&&{
          expectPeerProcStart:k
        }
      })
    }catch(M){
      t(`[session-name] rename notice to ${Bf(f)} failed: ${v(M)??"send error"}`)
    }
  }))
} export{
  wS,jkr,Wkr,zFn,tPt,fDe,Gkr,Vtn,VFn,sae,zkr
};