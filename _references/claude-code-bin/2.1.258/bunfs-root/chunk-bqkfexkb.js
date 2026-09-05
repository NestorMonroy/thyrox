// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{on}from"/$bunfs/root/chunk-b1z7jvb2.js";import{Ue}from"/$bunfs/root/chunk-ycrs8y50.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";function Ufr(){let r=Ue(),e=new Map,o=0;return{emit(i,s){if(o===0){e.set(i,s);return}r.emit(i,s)},subscribe(i){o++;let s=[...e];e.clear();for(let[g,l]of s)i(g,l);let c=r.subscribe(i),n=!0;return()=>{if(n)n=!1,o--,c()}}}}var uRt=new on(Ufr);function dRt(r){return(e,o)=>{t(`[remote-tools] ${e}: ${o}`),uRt.of(r).emit(e,o)}}
export{Ufr,uRt,dRt};
