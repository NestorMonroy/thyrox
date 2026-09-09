// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Gt}from"/$bunfs/root/chunk-t8q7n4ta.js";import{Le}from"/$bunfs/root/chunk-a7esebzw.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";function u(){let r=Le(),e=new Map,o=0;return{emit(i,s){if(o===0){e.set(i,s);return}r.emit(i,s)},subscribe(i){o++;let s=[...e];e.clear();for(let[g,l]of s)i(g,l);let c=r.subscribe(i),n=!0;return()=>{if(n)n=!1,o--,c()}}}}var kMt=new Gt(u);function AMt(r){return(e,o)=>{t(`[remote-tools] ${e}: ${o}`),kMt.of(r).emit(e,o)}}
export{kMt,AMt};
