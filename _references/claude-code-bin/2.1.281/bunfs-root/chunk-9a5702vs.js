// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Bd}from"/$bunfs/root/chunk-ay603yys.js";import{Ld}from"/$bunfs/root/chunk-tds9wn6q.js";import{UIt,Uj}from"/$bunfs/root/chunk-jvxaafx0.js";import{Ig}from"/$bunfs/root/chunk-b7h8pwnv.js";import{Se}from"/$bunfs/root/chunk-0dapr5gw.js";var o=Se(Ig(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function cnt(){if(!Bd())return!1;let r=UIt()+f;return process.execPath.startsWith(r)}function Ip(r={}){return aj(_we(r))}function _we(r={}){if(!r.pinToCurrentBinary&&cnt()){let t=dOe();return{cmd:t,prefixArgs:[],target:t}}if(Bd())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function dOe(){return a(Uj(),"claude")}function aj(r){let e=Ld();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function dnt(){let r=UIt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{cnt,Ip,_we,dOe,aj,dnt};
