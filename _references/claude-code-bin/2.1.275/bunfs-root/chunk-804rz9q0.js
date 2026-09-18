// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{c}from"/$bunfs/root/chunk-gytndg57.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{fl}from"/$bunfs/root/chunk-01m22vhx.js";import{db}from"/$bunfs/root/chunk-k6ccx3t8.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new G(()=>new n);function f(){return l.of(W().host)}function N0n(e){f().fire(e)}async function _nt(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function _He(e,t,r){if(r!==void 0){if(await fl(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(N0n("kill_gate"),await _nt(e)!==t)return}else return;await db(e,"SIGTERM").catch(()=>{})}
export{N0n,_nt,_He};
