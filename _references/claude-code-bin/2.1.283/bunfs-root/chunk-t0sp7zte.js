// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ct}from"/$bunfs/root/chunk-yqm14hey.js";import{J}from"/$bunfs/root/chunk-zkn0228z.js";import{O}from"/$bunfs/root/chunk-fmsbxtrp.js";import{_Lo}from"/$bunfs/root/chunk-j2p7jgmc.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var YCe=Ct(new o,(t)=>{t.pidDomain=void 0});function XCe(){if(YCe.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}YCe.pidSpace=`${u()}${t===""?"":"#"+t}`}return YCe.pidSpace}function HP(){return YCe.pidDomain??=(async()=>_Lo(O()))().catch((t)=>{throw YCe.pidDomain=void 0,t}),YCe.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function hYe(t){try{let n=J(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function v0(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{YCe,XCe,HP,hYe,v0};
