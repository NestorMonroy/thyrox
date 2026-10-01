// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Tt,j}from"/$bunfs/root/chunk-hbjpbz2q.js";import{C,g,D}from"/$bunfs/root/chunk-mqace48v.js";D();var lme="continue";function Ypo(t,e,n){if(n&&e===lme&&t===lme+"/")return"/";if(e.startsWith("/")&&t.length===lme.length+e.length+1&&t.startsWith(lme+e))return t.slice(lme.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Tt(()=>new o);function i(){return l.of(j())}function TMn(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function Xpo(){return i().inFlight}function ehr(t){i().inFlight=t}function Jpo(){TMn(null),i().inFlight=null}function thr(){let[t,e]=g(()=>i().lastResult);return C(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{lme,Ypo,TMn,Xpo,ehr,Jpo,thr};
