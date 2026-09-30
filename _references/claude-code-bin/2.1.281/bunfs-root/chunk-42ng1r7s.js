// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ot,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{A,g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();var zle="continue";function vGr(t,e,n){if(n&&e===zle&&t===zle+"/")return"/";if(e.startsWith("/")&&t.length===zle.length+e.length+1&&t.startsWith(zle+e))return t.slice(zle.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Ot(()=>new o);function i(){return l.of(W())}function Vgn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function EGr(){return i().inFlight}function nYn(t){i().inFlight=t}function kGr(){Vgn(null),i().inFlight=null}function rYn(){let[t,e]=g(()=>i().lastResult);return A(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{zle,vGr,Vgn,EGr,nYn,kGr,rYn};
