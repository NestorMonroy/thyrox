// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{Wl}from"/$bunfs/root/chunk-ftmzfxxh.js";import{XS}from"/$bunfs/root/chunk-q6emaxc6.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new V(()=>new n);function f(){return l.of(W().host)}function q3n(e){f().fire(e)}async function Cft(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function BFe(e,t,r){if(r!==void 0){if(await Wl(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(q3n("kill_gate"),await Cft(e)!==t)return}else return;await XS(e,"SIGTERM").catch(()=>{})}
export{q3n,Cft,BFe};
