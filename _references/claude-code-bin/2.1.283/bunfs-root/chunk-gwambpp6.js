// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{c}from"/$bunfs/root/chunk-vyyazxfq.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{nc}from"/$bunfs/root/chunk-x5vr5vwm.js";import{mb}from"/$bunfs/root/chunk-41vsymfs.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new q(()=>new n);function f(){return l.of(j().host)}function JZn(e){f().fire(e)}async function Dyt(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function lje(e,t,r){if(r!==void 0){if(await nc(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(JZn("kill_gate"),await Dyt(e)!==t)return}else return;await mb(e,"SIGTERM").catch(()=>{})}
export{JZn,Dyt,lje};
