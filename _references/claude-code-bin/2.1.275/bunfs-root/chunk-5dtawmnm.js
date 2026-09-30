// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Nt,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{A,g,D}from"/$bunfs/root/chunk-347kpssc.js";D();var sre="continue";function kSr(t,e,n){if(n&&e===sre&&t===sre+"/")return"/";if(e.startsWith("/")&&t.length===sre.length+e.length+1&&t.startsWith(sre+e))return t.slice(sre.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Nt(()=>new o);function i(){return l.of(W())}function Y7t(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function ASr(){return i().inFlight}function MOn(t){i().inFlight=t}function TSr(){Y7t(null),i().inFlight=null}function DOn(){let[t,e]=g(()=>i().lastResult);return A(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{sre,kSr,Y7t,ASr,MOn,TSr,DOn};
