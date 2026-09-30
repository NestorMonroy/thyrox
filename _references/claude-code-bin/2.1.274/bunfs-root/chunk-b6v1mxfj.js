// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{mu}from"/$bunfs/root/chunk-j96jysac.js";import{Uc}from"/$bunfs/root/chunk-m1zv9as2.js";import{Lgt,GF}from"/$bunfs/root/chunk-tk6dc7dv.js";import{oy}from"/$bunfs/root/chunk-qch08t7s.js";import{Se}from"/$bunfs/root/chunk-3z5w4bh8.js";var o=Se(oy(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function X3e(){if(!mu())return!1;let r=Lgt()+f;return process.execPath.startsWith(r)}function hd(r={}){return gF(xfe(r))}function xfe(r={}){if(!r.pinToCurrentBinary&&X3e()){let t=eke();return{cmd:t,prefixArgs:[],target:t}}if(mu())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function eke(){return a(GF(),"claude")}function gF(r){let e=Uc();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function J3e(){let r=Lgt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{X3e,hd,xfe,eke,gF,J3e};
