// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Yn}from"/$bunfs/root/chunk-gfewy5rb.js";import{J}from"/$bunfs/root/chunk-4bbpt7sc.js";import{M}from"/$bunfs/root/chunk-gh1pqen9.js";import{T5r}from"/$bunfs/root/chunk-nx8vfssq.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var pye=Yn(new o,(t)=>{t.pidDomain=void 0});function qSt(){if(pye.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}pye.pidSpace=`${u()}${t===""?"":"#"+t}`}return pye.pidSpace}function TN(){return pye.pidDomain??=(async()=>T5r(M()))().catch((t)=>{throw pye.pidDomain=void 0,t}),pye.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function JUe(t){try{let n=J(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function DP(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{JUe,DP,pye,qSt,TN};
