// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Qt,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{v,d,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();var nX="continue";function Oqn(t,e,n){if(n&&e===nX&&t===nX+"/")return"/";if(e.startsWith("/")&&t.length===nX.length+e.length+1&&t.startsWith(nX+e))return t.slice(nX.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Qt(()=>new o);function i(){return l.of(z())}function sBt(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function kSr(){return i().lastResult}function Nqn(){return i().inFlight}function tcn(t){i().inFlight=t}function aBt(){sBt(null),i().inFlight=null}function Dft(){let[t,e]=d(()=>i().lastResult);return v(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{nX,Oqn,sBt,kSr,Nqn,tcn,aBt,Dft};
