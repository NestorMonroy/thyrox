// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Tt,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{A,g,D}from"/$bunfs/root/chunk-bqbammwz.js";D();var wfe="continue";function Blo(t,e,n){if(n&&e===wfe&&t===wfe+"/")return"/";if(e.startsWith("/")&&t.length===wfe.length+e.length+1&&t.startsWith(wfe+e))return t.slice(wfe.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Tt(()=>new o);function i(){return l.of(j())}function zIn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function jlo(){return i().inFlight}function Bpr(t){i().inFlight=t}function Wlo(){zIn(null),i().inFlight=null}function jpr(){let[t,e]=g(()=>i().lastResult);return A(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{wfe,Blo,zIn,jlo,Bpr,Wlo,jpr};
