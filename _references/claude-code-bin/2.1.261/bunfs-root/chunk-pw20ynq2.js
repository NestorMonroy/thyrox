// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,U}from"/$bunfs/root/chunk-annedm50.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{u}from"/$bunfs/root/chunk-2y9gqtpa.js";import{Ua}from"/$bunfs/root/chunk-wdt4vs8t.js";import{B_}from"/$bunfs/root/chunk-k3az65h0.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:u(e)})}reset(){this.firedSites.clear()}}var l=new j(()=>new n);function f(){return l.of(U().host)}function Oen(e){f().fire(e)}async function sWe(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function O_e(e,t,r){if(r!==void 0){if(await Ua(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(Oen("kill_gate"),await sWe(e)!==t)return}else return;await B_(e,"SIGTERM").catch(()=>{})}
export{Oen,sWe,O_e};
