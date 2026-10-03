// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{De}from"/$bunfs/root/chunk-dj0a6j9w.js";import{Tt}from"/$bunfs/root/chunk-hbjpbz2q.js";import{t}from"/$bunfs/root/chunk-6w550002.js";function u(){let r=De(),e=new Map,o=0;return{emit(i,s){if(o===0){e.set(i,s);return}r.emit(i,s)},subscribe(i){o++;let s=[...e];e.clear();for(let[g,l]of s)i(g,l);let c=r.subscribe(i),n=!0;return()=>{if(n)n=!1,o--,c()}}}}var tkn=new Tt(u);function nkn(r){return(e,o)=>{t(`[remote-tools] ${e}: ${o}`),tkn.of(r).emit(e,o)}}
export{tkn,nkn};
