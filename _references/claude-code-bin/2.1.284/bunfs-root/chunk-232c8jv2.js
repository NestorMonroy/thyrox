// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{St}from"/$bunfs/root/chunk-zy97v06w.js";import{J}from"/$bunfs/root/chunk-6b6gfk00.js";import{O}from"/$bunfs/root/chunk-320rdak1.js";import{SBo}from"/$bunfs/root/chunk-ewa9x7ja.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var sxe=St(new o,(t)=>{t.pidDomain=void 0});function ixe(){if(sxe.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}sxe.pidSpace=`${u()}${t===""?"":"#"+t}`}return sxe.pidSpace}function KI(){return sxe.pidDomain??=(async()=>SBo(O()))().catch((t)=>{throw sxe.pidDomain=void 0,t}),sxe.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function X8e(t){try{let n=J(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function N0(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{sxe,ixe,KI,X8e,N0};
