// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{I0}from"/$bunfs/root/chunk-7mq52efs.js";import{Re,k,Pt,D}from"/$bunfs/root/chunk-bqbammwz.js";D();var vTn=()=>a,a=()=>{},c=()=>{return};function xe(t,i){let n=Re(I0),r=k(null);if(r.current===null)r.current={select:i,last:null,source:null,get:c,notifier:n,subscribe:vTn};let e=r.current;if(e.select=i,e.source!==t||e.notifier!==n)e.notifier=n,e.subscribe=t?n?.paced(t.subscribe)??t.subscribe:vTn;if(e.source!==t)e.source=t,e.last=null,e.get=t?()=>{let s=t.getSnapshot(),o=e.select;if(!o)return s;let u=e.last;if(u!==null&&u.snapshot===s&&u.select===o)return u.selected;let l=o(s);return e.last={snapshot:s,select:o,selected:l},l}:c;return Pt(e.subscribe,e.get,e.get)}
export{vTn,xe};
