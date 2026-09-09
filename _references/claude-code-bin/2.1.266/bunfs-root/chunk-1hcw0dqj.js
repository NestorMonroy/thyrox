// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{u}from"/$bunfs/root/chunk-vkfaczp9.js";import{ja}from"/$bunfs/root/chunk-fbrtdkc9.js";import{mb}from"/$bunfs/root/chunk-3bybpd4s.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:u(e)})}reset(){this.firedSites.clear()}}var l=new z(()=>new n);function f(){return l.of(B().host)}function yon(e){f().fire(e)}async function kVe(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function kSe(e,t,r){if(r!==void 0){if(await ja(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(yon("kill_gate"),await kVe(e)!==t)return}else return;await mb(e,"SIGTERM").catch(()=>{})}
export{yon,kVe,kSe};
