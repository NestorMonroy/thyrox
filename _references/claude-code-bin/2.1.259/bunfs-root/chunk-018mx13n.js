// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{u}from"/$bunfs/root/chunk-97tbrkcc.js";import{Va}from"/$bunfs/root/chunk-3r19kwqx.js";import{PH}from"/$bunfs/root/chunk-a3vshzn8.js";import{readFile as a}from"fs/promises";class o{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),s("tengu_dead_probe_adopt_ticks_token",{site:u(e)})}reset(){this.firedSites.clear()}}var l=new V(()=>new o);function f(){return l.of(z().host)}function Xtn(e){f().fire(e)}async function kLe(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),n=t.slice(r+2).split(" "),i=Number(n[19]);return Number.isFinite(i)?i:null}catch{return null}}async function tbe(e,t,r){if(r!==void 0){if(await Va(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(Xtn("kill_gate"),await kLe(e)!==t)return}else return;await PH(e,"SIGTERM").catch(()=>{})}
export{Xtn,kLe,tbe};
