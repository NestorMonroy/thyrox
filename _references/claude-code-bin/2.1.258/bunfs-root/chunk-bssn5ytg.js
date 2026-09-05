// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{u}from"/$bunfs/root/chunk-mrh5xd2h.js";import{ja}from"/$bunfs/root/chunk-7npsafxm.js";import{hA}from"/$bunfs/root/chunk-b5d8dbmv.js";import{readFile as a}from"fs/promises";class o{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),s("tengu_dead_probe_adopt_ticks_token",{site:u(e)})}reset(){this.firedSites.clear()}}var l=new Y(()=>new o);function f(){return l.of(W().host)}function RZt(e){f().fire(e)}async function rxe(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),n=t.slice(r+2).split(" "),i=Number(n[19]);return Number.isFinite(i)?i:null}catch{return null}}async function e_e(e,t,r){if(r!==void 0){if(await ja(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(RZt("kill_gate"),await rxe(e)!==t)return}else return;await hA(e,"SIGTERM").catch(()=>{})}
export{RZt,rxe,e_e};
