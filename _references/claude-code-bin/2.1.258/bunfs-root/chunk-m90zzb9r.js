// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{on,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{v,d,j}from"/$bunfs/root/chunk-db688wrz.js";j();var yY="continue";function RWn(t,e,n){if(n&&e===yY&&t===yY+"/")return"/";if(e.startsWith("/")&&t.length===yY.length+e.length+1&&t.startsWith(yY+e))return t.slice(yY.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new on(()=>new o);function i(){return l.of(W())}function UOt(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function jhr(){return i().lastResult}function xWn(){return i().inFlight}function gsn(t){i().inFlight=t}function jOt(){UOt(null),i().inFlight=null}function zut(){let[t,e]=d(()=>i().lastResult);return v(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{yY,RWn,UOt,jhr,xWn,gsn,jOt,zut};
