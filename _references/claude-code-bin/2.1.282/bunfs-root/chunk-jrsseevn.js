// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Mt,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{A,g,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();var Vce="continue";function KKr(t,e,n){if(n&&e===Vce&&t===Vce+"/")return"/";if(e.startsWith("/")&&t.length===Vce.length+e.length+1&&t.startsWith(Vce+e))return t.slice(Vce.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Mt(()=>new o);function i(){return l.of(W())}function ebn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function YKr(){return i().inFlight}function QXn(t){i().inFlight=t}function XKr(){ebn(null),i().inFlight=null}function ZXn(){let[t,e]=g(()=>i().lastResult);return A(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{Vce,KKr,ebn,YKr,QXn,XKr,ZXn};
