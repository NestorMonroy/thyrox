// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Gt,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{v,d,L}from"/$bunfs/root/chunk-v21q572m.js";L();var FX="continue";function P4n(t,e,n){if(n&&e===FX&&t===FX+"/")return"/";if(e.startsWith("/")&&t.length===FX.length+e.length+1&&t.startsWith(FX+e))return t.slice(FX.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Gt(()=>new o);function i(){return l.of(B())}function KBt(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function H4n(){return i().inFlight}function Hun(t){i().inFlight=t}function M4n(){KBt(null),i().inFlight=null}function Mun(){let[t,e]=d(()=>i().lastResult);return v(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{FX,P4n,KBt,H4n,Hun,M4n,Mun};
