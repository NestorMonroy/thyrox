// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{bUb as f,iUb as h}from"/$bunfs/root/_600.js";import{mUb as s,nUb as p,oUb as x}from"/$bunfs/root/_601.js";import{c$b as d}from"/$bunfs/root/_664.js";import{Vbd as i,Wbd as m}from"/$bunfs/root/_812.js";import{txd as u,xxd as g}from"/$bunfs/root/_837.js";import{readdir as v,stat as I}from"fs/promises";import{join as l,sep as P}from"path";function y(){if(!i())return!1;let r=s()+P;return process.execPath.startsWith(r)}function L(r={}){return w(A(r))}function A(r={}){if(!r.pinToCurrentBinary&&y()){let t=S();return{cmd:t,prefixArgs:[],target:t}}if(i())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function S(){return l(p(),"claude")}function w(r){let e=f();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function N(){let r=s(),e;try{e=await v(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let a=l(r,n);try{let c=await I(a);if(c.isFile()&&c.size>0)return a}catch{}}return null}var o;var B=g(()=>{m();h();x();o=u(d(),1)});
export{y as nlb,L as olb,A as plb,S as qlb,w as rlb,N as slb,B as tlb};
