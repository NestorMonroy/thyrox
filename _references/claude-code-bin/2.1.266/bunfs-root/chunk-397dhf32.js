// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{V}from"/$bunfs/root/chunk-fy3j7rz0.js";import{wdr}from"/$bunfs/root/chunk-ahrqcn3y.js";import{gl}from"/$bunfs/root/chunk-924sppga.js";import{M}from"/$bunfs/root/chunk-k9qk789z.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var dae=gl(new o,(t)=>{t.pidDomain=void 0});function tnt(){if(dae.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}dae.pidSpace=`${u()}${t===""?"":"#"+t}`}return dae.pidSpace}function aF(){return dae.pidDomain??=(async()=>wdr(M()))().catch((t)=>{throw dae.pidDomain=void 0,t}),dae.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function hxe(t){try{let n=V(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function oR(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{dae,tnt,aF,hxe,oR};
