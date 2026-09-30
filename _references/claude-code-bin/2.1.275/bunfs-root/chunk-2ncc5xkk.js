// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{wu}from"/$bunfs/root/chunk-crr3rzxx.js";import{Yc}from"/$bunfs/root/chunk-dx6j3jax.js";import{a_t,P1}from"/$bunfs/root/chunk-jwy9w658.js";import{Lg}from"/$bunfs/root/chunk-a497wre0.js";import{Se}from"/$bunfs/root/chunk-sr6jf0k1.js";var o=Se(Lg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function q5e(){if(!wu())return!1;let r=a_t()+f;return process.execPath.startsWith(r)}function Rd(r={}){return ZF(jme(r))}function jme(r={}){if(!r.pinToCurrentBinary&&q5e()){let t=gAe();return{cmd:t,prefixArgs:[],target:t}}if(wu())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function gAe(){return a(P1(),"claude")}function ZF(r){let e=Yc();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function V5e(){let r=a_t(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{q5e,Rd,jme,gAe,ZF,V5e};
