// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Kt}from"/$bunfs/root/chunk-f8tyjwrg.js";import{Q}from"/$bunfs/root/chunk-nbcqw6vp.js";import{H}from"/$bunfs/root/chunk-xt60grfb.js";import{KCo}from"/$bunfs/root/chunk-e5tb3rbv.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var MTe=Kt(new o,(t)=>{t.pidDomain=void 0});function DTe(){if(MTe.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}MTe.pidSpace=`${u()}${t===""?"":"#"+t}`}return MTe.pidSpace}function VH(){return MTe.pidDomain??=(async()=>KCo(H()))().catch((t)=>{throw MTe.pidDomain=void 0,t}),MTe.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function O5e(t){try{let n=Q(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function T0(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{MTe,DTe,VH,O5e,T0};
