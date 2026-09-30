// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{Gl}from"/$bunfs/root/chunk-7rt268hn.js";import{lw}from"/$bunfs/root/chunk-fb8sxhrz.js";import{readFile as a}from"fs/promises";class n{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),i("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new K(()=>new n);function f(){return l.of(W().host)}function z9n(e){f().fire(e)}async function bgt(e){try{let t=await a(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),s=t.slice(r+2).split(" "),o=Number(s[19]);return Number.isFinite(o)?o:null}catch{return null}}async function gBe(e,t,r){if(r!==void 0){if(await Gl(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(z9n("kill_gate"),await bgt(e)!==t)return}else return;await lw(e,"SIGTERM").catch(()=>{})}
export{z9n,bgt,gBe};
