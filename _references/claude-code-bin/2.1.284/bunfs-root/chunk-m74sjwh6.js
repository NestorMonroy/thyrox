// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ht,j}from"/$bunfs/root/chunk-d37h8mav.js";import{C,g,L}from"/$bunfs/root/chunk-68gegf2j.js";L();var wfe="continue";function Xlo(t,e,n){if(n&&e===wfe&&t===wfe+"/")return"/";if(e.startsWith("/")&&t.length===wfe.length+e.length+1&&t.startsWith(wfe+e))return t.slice(wfe.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Ht(()=>new o);function i(){return l.of(j())}function bIn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function Jlo(){return i().inFlight}function bfr(t){i().inFlight=t}function Qlo(){bIn(null),i().inFlight=null}function Sfr(){let[t,e]=g(()=>i().lastResult);return C(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{wfe,Xlo,bIn,Jlo,bfr,Qlo,Sfr};
