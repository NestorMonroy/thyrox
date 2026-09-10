// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{zt,U}from"/$bunfs/root/chunk-annedm50.js";import{E,d,F}from"/$bunfs/root/chunk-gwyyj914.js";F();var RY="continue";function WWn(t,e,n){if(n&&e===RY&&t===RY+"/")return"/";if(e.startsWith("/")&&t.length===RY.length+e.length+1&&t.startsWith(RY+e))return t.slice(RY.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new zt(()=>new o);function i(){return l.of(U())}function _Ft(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function VWn(){return i().inFlight}function Fan(t){i().inFlight=t}function qWn(){_Ft(null),i().inFlight=null}function Ban(){let[t,e]=d(()=>i().lastResult);return E(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{RY,WWn,_Ft,VWn,Fan,qWn,Ban};
