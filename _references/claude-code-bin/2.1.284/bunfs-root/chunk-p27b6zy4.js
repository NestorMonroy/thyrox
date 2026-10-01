// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Hd}from"/$bunfs/root/chunk-8whxj5sg.js";import{fu}from"/$bunfs/root/chunk-4eh5q9cs.js";import{YNt,lz}from"/$bunfs/root/chunk-1hs126es.js";import{_h}from"/$bunfs/root/chunk-hf1cte62.js";import{be}from"/$bunfs/root/chunk-2dxhgqgt.js";var o=be(_h(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function Rct(){if(!Hd())return!1;let r=YNt()+f;return process.execPath.startsWith(r)}function Vu(r={}){return LG(IAe(r))}function IAe(r={}){if(!r.pinToCurrentBinary&&Rct()){let t=QNe();return{cmd:t,prefixArgs:[],target:t}}if(Hd())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function QNe(){return a(lz(),"claude")}function LG(r){let e=fu();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function xct(){let r=YNt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{Rct,Vu,IAe,QNe,LG,xct};
