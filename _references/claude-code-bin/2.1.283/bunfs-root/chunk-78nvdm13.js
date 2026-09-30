// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Lt,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{C,g,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();var zue="continue";function JJr(t,e,n){if(n&&e===zue&&t===zue+"/")return"/";if(e.startsWith("/")&&t.length===zue.length+e.length+1&&t.startsWith(zue+e))return t.slice(zue.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Lt(()=>new o);function i(){return l.of(j())}function _kn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function QJr(){return i().inFlight}function znr(t){i().inFlight=t}function ZJr(){_kn(null),i().inFlight=null}function Vnr(){let[t,e]=g(()=>i().lastResult);return C(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{zue,JJr,_kn,QJr,znr,ZJr,Vnr};
