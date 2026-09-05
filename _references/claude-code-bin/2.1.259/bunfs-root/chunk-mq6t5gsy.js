// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Ll}from"/$bunfs/root/chunk-m92n5xra.js";import{Fl}from"/$bunfs/root/chunk-jtegkk17.js";import{B7e,N0}from"/$bunfs/root/chunk-7nw1s99d.js";import{wg}from"/$bunfs/root/chunk-rf373qvn.js";import{W}from"/$bunfs/root/chunk-qyvz15br.js";var o=W(wg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function HNe(){if(!Ll())return!1;let r=B7e()+f;return process.execPath.startsWith(r)}function ld(r={}){return w0(uoe(r))}function uoe(r={}){if(!r.pinToCurrentBinary&&HNe()){let t=Spe();return{cmd:t,prefixArgs:[],target:t}}if(Ll())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function Spe(){return a(N0(),"claude")}function w0(r){let e=Fl();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function wNe(){let r=B7e(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{HNe,ld,uoe,Spe,w0,wNe};
