// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ct}from"/$bunfs/root/chunk-actz3rxp.js";import{Q}from"/$bunfs/root/chunk-055ns4k8.js";import{O}from"/$bunfs/root/chunk-hjabkkf1.js";import{cBo}from"/$bunfs/root/chunk-xnk9x3cd.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var WRe=ct(new o,(t)=>{t.pidDomain=void 0});function zRe(){if(WRe.pidSpace===null){let t="";try{t=e("/proc/self/ns/pid")}catch{t=""}WRe.pidSpace=`${u()}${t===""?"":"#"+t}`}return WRe.pidSpace}function GP(){return WRe.pidDomain??=(async()=>cBo(O()))().catch((t)=>{throw WRe.pidDomain=void 0,t}),WRe.pidDomain}import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function Y8e(t){try{let n=Q(await a(t,"utf8"));if(n===null||typeof n!=="object")return;let i={};if("rvAuth"in n&&typeof n.rvAuth==="string")i.rvAuth=n.rvAuth;if("ptyAuth"in n&&typeof n.ptyAuth==="string")i.ptyAuth=n.ptyAuth;if("claimAuth"in n&&typeof n.claimAuth==="string")i.claimAuth=n.claimAuth;return i}catch{return}}function FD(t,n){if(typeof t!=="string"||!n||t.length===0)return!1;let i=Buffer.from(t),r=Buffer.from(n);if(i.length!==r.length)return!1;return f(i,r)}
export{WRe,zRe,GP,Y8e,FD};
