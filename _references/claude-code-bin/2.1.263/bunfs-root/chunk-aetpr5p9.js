// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{zt,U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{E,d,F}from"/$bunfs/root/chunk-1c6mq242.js";F();var LY="continue";function KWn(t,e,n){if(n&&e===LY&&t===LY+"/")return"/";if(e.startsWith("/")&&t.length===LY.length+e.length+1&&t.startsWith(LY+e))return t.slice(LY.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new zt(()=>new o);function i(){return l.of(U())}function bFt(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function YWn(){return i().inFlight}function Ban(t){i().inFlight=t}function XWn(){bFt(null),i().inFlight=null}function Uan(){let[t,e]=d(()=>i().lastResult);return E(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{LY,KWn,bFt,YWn,Ban,XWn,Uan};
