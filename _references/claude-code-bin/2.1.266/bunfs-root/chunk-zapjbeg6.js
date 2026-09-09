// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Yc}from"/$bunfs/root/chunk-9fmxymtw.js";import{$l}from"/$bunfs/root/chunk-1fd7beg1.js";import{J7e,pD}from"/$bunfs/root/chunk-928s7kda.js";import{Rg}from"/$bunfs/root/chunk-zzd7fs7v.js";import{ge}from"/$bunfs/root/chunk-7sg5wrey.js";var o=ge(Rg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function zFe(){if(!Yc())return!1;let r=J7e()+f;return process.execPath.startsWith(r)}function ud(r={}){return sD(Qoe(r))}function Qoe(r={}){if(!r.pinToCurrentBinary&&zFe()){let t=Sme();return{cmd:t,prefixArgs:[],target:t}}if(Yc())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function Sme(){return a(pD(),"claude")}function sD(r){let e=$l();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function WFe(){let r=J7e(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{zFe,ud,Qoe,Sme,sD,WFe};
