// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{qgd as u,ugd as o}from"/$bunfs/root/_820.js";import{xxd as e}from"/$bunfs/root/_837.js";import{timingSafeEqual as f}from"crypto";import{readFile as a}from"fs/promises";async function A(r){try{let t=u(await a(r,"utf8"));if(t===null||typeof t!=="object")return;let n={};if("rvAuth"in t&&typeof t.rvAuth==="string")n.rvAuth=t.rvAuth;if("ptyAuth"in t&&typeof t.ptyAuth==="string")n.ptyAuth=t.ptyAuth;if("claimAuth"in t&&typeof t.claimAuth==="string")n.claimAuth=t.claimAuth;return n}catch{return}}function m(r,t){if(typeof r!=="string"||!t||r.length===0)return!1;let n=Buffer.from(r),i=Buffer.from(t);if(n.length!==i.length)return!1;return f(n,i)}var h=e(()=>{o()});
export{A as pzc,m as qzc,h as rzc};
