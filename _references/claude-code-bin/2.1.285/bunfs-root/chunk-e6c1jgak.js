// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{c}from"/$bunfs/root/chunk-aap6zsd0.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{nc}from"/$bunfs/root/chunk-qfbb586n.js";import{Ab}from"/$bunfs/root/chunk-3p89rsbh.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new q(()=>new n);function f(){return l.of(j().host)}function vrr(e){f().fire(e)}async function jbt(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function HWe(e,t,r){if(r!==void 0){if(await nc(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(vrr("kill_gate"),await jbt(e)!==t)return}else return;await Ab(e,"SIGTERM").catch(()=>{})}
export{vrr,jbt,HWe};
