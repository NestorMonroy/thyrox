// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Kl}from"/$bunfs/root/chunk-a207t0vs.js";import{xl}from"/$bunfs/root/chunk-3956xxm3.js";import{yXe,uD}from"/$bunfs/root/chunk-n2mayd00.js";import{dg}from"/$bunfs/root/chunk-5d6xmmb8.js";import{fe}from"/$bunfs/root/chunk-934z9d80.js";var o=fe(dg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function vOe(){if(!Kl())return!1;let r=yXe()+f;return process.execPath.startsWith(r)}function td(r={}){return tD(Tre(r))}function Tre(r={}){if(!r.pinToCurrentBinary&&vOe()){let t=Lfe();return{cmd:t,prefixArgs:[],target:t}}if(Kl())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function Lfe(){return a(uD(),"claude")}function tD(r){let e=xl();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function kOe(){let r=yXe(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{vOe,td,Tre,Lfe,tD,kOe};
