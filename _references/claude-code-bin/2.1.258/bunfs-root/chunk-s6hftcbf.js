// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Il}from"/$bunfs/root/chunk-sr28hb79.js";import{Dl}from"/$bunfs/root/chunk-k7k7z6hv.js";import{dJe,v0}from"/$bunfs/root/chunk-a8c5cvq1.js";import{bg}from"/$bunfs/root/chunk-5rq4yp0f.js";import{z}from"/$bunfs/root/chunk-6zavqkd2.js";var o=z(bg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function WMe(){if(!Il())return!1;let r=dJe()+f;return process.execPath.startsWith(r)}function Yu(r={}){return c0(gre(r))}function gre(r={}){if(!r.pinToCurrentBinary&&WMe()){let t=Efe();return{cmd:t,prefixArgs:[],target:t}}if(Il())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function Efe(){return a(v0(),"claude")}function c0(r){let e=Dl();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function zMe(){let r=dJe(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{WMe,Yu,gre,Efe,c0,zMe};
