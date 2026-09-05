// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{V}from"/$bunfs/root/chunk-y5pwxex8.js";import{Wsr}from"/$bunfs/root/chunk-72b2vphk.js";import{L}from"/$bunfs/root/chunk-4qz1hwvq.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var Ose=new o;function vZe(){if(Ose.pidSpace===null){let n="";try{n=e("/proc/self/ns/pid")}catch{n=""}Ose.pidSpace=`${u()}${n===""?"":"#"+n}`}return Ose.pidSpace}function lK(){return Ose.pidDomain??=(async()=>Wsr(L()))().catch((n)=>{throw Ose.pidDomain=void 0,n}),Ose.pidDomain}import{timingSafeEqual as a}from"crypto";import{readFile as f}from"fs/promises";async function STe(n){try{let t=V(await f(n,"utf8"));if(t===null||typeof t!=="object")return;let i={};if("rvAuth"in t&&typeof t.rvAuth==="string")i.rvAuth=t.rvAuth;if("ptyAuth"in t&&typeof t.ptyAuth==="string")i.ptyAuth=t.ptyAuth;if("claimAuth"in t&&typeof t.claimAuth==="string")i.claimAuth=t.claimAuth;return i}catch{return}}function DT(n,t){if(typeof n!=="string"||!t||n.length===0)return!1;let i=Buffer.from(n),r=Buffer.from(t);if(i.length!==r.length)return!1;return a(i,r)}
export{Ose,vZe,lK,STe,DT};
