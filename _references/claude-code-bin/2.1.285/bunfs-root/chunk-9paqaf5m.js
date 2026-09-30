// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Cd}from"/$bunfs/root/chunk-5054mktj.js";import{pu}from"/$bunfs/root/chunk-5my546sf.js";import{RNt,o2}from"/$bunfs/root/chunk-8z30qdkb.js";import{mh}from"/$bunfs/root/chunk-7y7h3m02.js";import{Se}from"/$bunfs/root/chunk-675ch139.js";var o=Se(mh(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function Qat(){if(!Cd())return!1;let r=RNt()+f;return process.execPath.startsWith(r)}function Wu(r={}){return Ez(DTe(r))}function DTe(r={}){if(!r.pinToCurrentBinary&&Qat()){let t=WLe();return{cmd:t,prefixArgs:[],target:t}}if(Cd())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function WLe(){return a(o2(),"claude")}function Ez(r){let e=pu();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function Zat(){let r=RNt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{Qat,Wu,DTe,WLe,Ez,Zat};
