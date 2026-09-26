// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{nu}from"/$bunfs/root/chunk-h56wjcte.js";import{Vd}from"/$bunfs/root/chunk-x0h3cm08.js";import{iOt,dW}from"/$bunfs/root/chunk-kkbytmnn.js";import{Bg}from"/$bunfs/root/chunk-tsex6vh0.js";import{Se}from"/$bunfs/root/chunk-j14wpeqn.js";var o=Se(Bg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function Jot(){if(!nu())return!1;let r=iOt()+f;return process.execPath.startsWith(r)}function Mp(r={}){return qj(SEe(r))}function SEe(r={}){if(!r.pinToCurrentBinary&&Jot()){let t=xMe();return{cmd:t,prefixArgs:[],target:t}}if(nu())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function xMe(){return a(dW(),"claude")}function qj(r){let e=Vd();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function Qot(){let r=iOt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{Jot,Mp,SEe,xMe,qj,Qot};
