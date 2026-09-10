// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Ryc as m,Vyc as c,_yc as u}from"/$bunfs/root/_679.js";import{F8c as l,S7c as a,j9c as f,l8c as p}from"/$bunfs/root/_770.js";u();p();f();import{stat as d}from"fs/promises";import{homedir as h}from"os";import{join as o,sep as g}from"path";var D=604800000,w=1000;function _(e){let t=[`This session was opened by an external deep link in ${L(e.cwd)}`];if(e.repo){let n=e.lastFetch?c(e.lastFetch):"never",r=!e.lastFetch||Date.now()-e.lastFetch.getTime()>D;t.push(`Resolved ${e.repo} from local clones \xB7 last fetched ${n}${r?" \u2014 CLAUDE.md may be stale":""}`)}if(e.prefillLength)t.push(e.prefillLength>w?`The prompt below (${m(e.prefillLength)} chars) was supplied by the link \u2014 scroll to review the entire prompt before pressing Enter.`:"The prompt below was supplied by the link \u2014 review carefully before pressing Enter.");return t.join(`
`)}async function k(e){let t=await l(e);if(!t)return;let n=await a(t),[r,i]=await Promise.all([s(o(t,"FETCH_HEAD")),n?s(o(n,"FETCH_HEAD")):Promise.resolve(void 0)]);if(r&&i)return r>i?r:i;return r??i}async function s(e){try{let{mtime:t}=await d(e);return t}catch{return}}function L(e){let t=h();if(e===t)return"~";if(e.startsWith(t+g))return"~"+e.slice(t.length);return e}
export{w as Wd,_ as Xd,k as Yd};
