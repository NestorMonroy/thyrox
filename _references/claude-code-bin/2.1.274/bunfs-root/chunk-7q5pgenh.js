// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{hr}from"/$bunfs/root/chunk-g5h2a16k.js";import{J}from"/$bunfs/root/chunk-r2c9k9kh.js";import{M}from"/$bunfs/root/chunk-b565vq97.js";import{WGr}from"/$bunfs/root/chunk-gcqbd9wm.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var Uge=hr(new o,(t)=>{t.pidDomain=void 0});function r_t(){if(Uge.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}Uge.pidSpace=`${u()}${t===""?"":"#"+t}`}return Uge.pidSpace}function tN(){return Uge.pidDomain??=(async()=>WGr(M()))().catch((t)=>{throw Uge.pidDomain=void 0,t}),Uge.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function YFe(t){try{let n=J(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function aP(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{YFe,aP,Uge,r_t,tN};
