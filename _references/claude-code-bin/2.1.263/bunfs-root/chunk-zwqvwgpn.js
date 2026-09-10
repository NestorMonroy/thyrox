// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Kl}from"/$bunfs/root/chunk-bxegdt3f.js";import{xl}from"/$bunfs/root/chunk-x7s5nmns.js";import{bXe,dD}from"/$bunfs/root/chunk-rr7qj8e9.js";import{dg}from"/$bunfs/root/chunk-bpwy9q2d.js";import{fe}from"/$bunfs/root/chunk-1r5dbh9v.js";var o=fe(dg(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function vOe(){if(!Kl())return!1;let r=bXe()+f;return process.execPath.startsWith(r)}function nd(r={}){return nD(Rre(r))}function Rre(r={}){if(!r.pinToCurrentBinary&&vOe()){let t=Pfe();return{cmd:t,prefixArgs:[],target:t}}if(Kl())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function Pfe(){return a(dD(),"claude")}function nD(r){let e=xl();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function kOe(){let r=bXe(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{vOe,nd,Rre,Pfe,nD,kOe};
