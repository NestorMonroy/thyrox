// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ut,G}from"/$bunfs/root/chunk-ja309z9r.js";import{A,m,L}from"/$bunfs/root/chunk-s59wj17y.js";L();var ane="continue";function qgr(t,e,n){if(n&&e===ane&&t===ane+"/")return"/";if(e.startsWith("/")&&t.length===ane.length+e.length+1&&t.startsWith(ane+e))return t.slice(ane.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Ut(()=>new o);function i(){return l.of(G())}function P9t(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function Vgr(){return i().inFlight}function MIn(t){i().inFlight=t}function Kgr(){P9t(null),i().inFlight=null}function DIn(){let[t,e]=m(()=>i().lastResult);return A(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{ane,qgr,P9t,Vgr,MIn,Kgr,DIn};
