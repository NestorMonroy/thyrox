// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Nd}from"/$bunfs/root/chunk-v5r4yd9z.js";import{gu}from"/$bunfs/root/chunk-5f5ezmyf.js";import{$Ft,HG}from"/$bunfs/root/chunk-f2952xwj.js";import{ih}from"/$bunfs/root/chunk-vqc3jzpc.js";import{be}from"/$bunfs/root/chunk-qr34qg3p.js";var o=be(ih(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function Xdt(){if(!Nd())return!1;let r=$Ft()+f;return process.execPath.startsWith(r)}function Xu(r={}){return iG(XAe(r))}function XAe(r={}){if(!r.pinToCurrentBinary&&Xdt()){let t=J$e();return{cmd:t,prefixArgs:[],target:t}}if(Nd())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function J$e(){return a(HG(),"claude")}function iG(r){let e=gu();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function Jdt(){let r=$Ft(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{Xdt,Xu,XAe,J$e,iG,Jdt};
