// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Ofb as f,Pfb as T}from"/$bunfs/root/_498.js";import{mBc as l,pBc as P}from"/$bunfs/root/_694.js";import{Pcd as a,Rcd as b}from"/$bunfs/root/_814.js";import{Jjd as n,Kjd as p,atd as k,zkd as s}from"/$bunfs/root/_826.js";import{fwd as o,nwd as d}from"/$bunfs/root/_833.js";import{xxd as m}from"/$bunfs/root/_837.js";import{readFile as g}from"fs/promises";class u{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),a("tengu_dead_probe_adopt_ticks_token",{site:o(e)})}reset(){this.firedSites.clear()}}function _(){return S.of(s().host)}function h(e){_().fire(e)}async function v(e){try{let t=await g(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),c=t.slice(r+2).split(" "),i=Number(c[19]);return Number.isFinite(i)?i:null}catch{return null}}async function R(e,t,r){if(r!==void 0){if(await l(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(h("kill_gate"),await v(e)!==t)return}else return;await f(e,"SIGTERM").catch(()=>{})}var S;var w=m(()=>{k();p();b();d();P();T();S=new n(()=>new u)});
export{h as bB,v as cB,R as dB,w as eB};
