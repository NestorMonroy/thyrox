// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Dd}from"/$bunfs/root/chunk-adsaemws.js";import{Fht}from"/$bunfs/root/chunk-gstngv81.js";var f=512,u={GIT_NO_LAZY_FETCH:"1"},S=["filter","working-tree-encoding","ident"],b=16,p=f*80+262144;function T_n(n){return`"${n.replace(/["\\\x00-\x1f\x7f]/g,(t)=>{switch(t){case'"':return"\\\"";case"\\":return"\\\\";case`
`:return"\\n";case"\r":return"\\r";case"\t":return"\\t";default:return"\\"+t.charCodeAt(0).toString(8).padStart(3,"0")}})}"`}async function w(n,e,t,r){if(e.length===0||r<=0||t?.aborted===!0)return{pairs:[],spawns:0};let s=await Dd(n,["hash-object","--stdin-paths"],t,p,u,e.map(T_n).join(`
`)+`
`),a=s.stdout.split(`
`).map((o)=>o.replace(/\r$/,"")).filter((o)=>/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(o)).slice(0,e.length),d=e.slice(0,a.length).map((o,i)=>[o,a[i]]);if(s.code===0&&a.length===e.length)return{pairs:d,spawns:1};let l=await w(n,e.slice(a.length+1),t,r-1);return{pairs:[...d,...l.pairs],spawns:1+l.spawns}}async function g(n,e,t){let r=await y(n,e,S,t);return r===null?[]:e.filter((s)=>r.answered.has(s)&&!r.claimed.has(s))}var m=15000;async function y(n,e,t,r,s=m){if(e.length===0)return{answered:new Set,claimed:new Set};let a=AbortSignal.any([...r===void 0?[]:[r],AbortSignal.timeout(s)]),d=await Dd(n,["check-attr","-z","--stdin",...t],a,e.reduce((i,c)=>i+t.length*(Buffer.byteLength(c)+2304),4096),u,e.join("\x00")+"\x00");if(d.code!==0)return null;let l=d.stdout.split("\x00"),o=Fht(l.slice(0,l.length-l.length%3),3).flatMap(([i,,c])=>i===void 0||c===void 0?[]:[{path:i,claimed:c!=="unspecified"&&c!=="unset"}]);return{answered:new Set(o.map((i)=>i.path)),claimed:new Set(o.flatMap((i)=>i.claimed?[i.path]:[]))}}function mBe(n,{timeoutMs:e=m}={}){return async(t,r)=>{let s=await y(n,t,["filter"],r,e);return s===null?null:new Set(t.filter((a)=>s.claimed.has(a)||!s.answered.has(a)))}}function HJn(n,e){return async(t,r,s)=>{if(!(e!==void 0?e.has(t):(await g(n,[t],s)).includes(t)))return null;let d=await Dd(n,["hash-object","--stdin","--path",t],s,p,u,r),l=d.stdout.trim();return d.code===0&&/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(l)?l:null}}async function SKr(n,e,t){return new Set(await g(n,e,t))}function wKr(n){return async(e,t)=>{let r=await g(n,e,t),s=Fht([...r],f),{pairs:a}=await s.reduce(async(d,l)=>{let o=await d,i=await w(n,l,t,b-o.spawns);return{pairs:[...o.pairs,...i.pairs],spawns:o.spawns+i.spawns}},Promise.resolve({pairs:[],spawns:0}));return new Map(a)}}async function vKr(n,e,t,r){return n.kind==="git_blob"&&(await t([e],r)).get(e)===n.blobId}
export{T_n,mBe,HJn,SKr,wKr,vKr};
