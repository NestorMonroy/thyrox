// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{dQc as n,hQc as l}from"/$bunfs/root/_717.js";import{Ehd as p,Jhd as y}from"/$bunfs/root/_822.js";import{Jjd as o,Kjd as u,atd as h,zkd as r}from"/$bunfs/root/_826.js";import{xxd as S}from"/$bunfs/root/_837.js";class a{#e=new Map;#t=new Map;#s=!1;#n=!1;register(e,t){let s=n(e);this.#e.delete(s),[...this.#e.keys()].slice(0,Math.max(0,this.#e.size+1-g)).forEach((i)=>{let c=this.#e.get(i);this.#e.delete(i),c?.then((d)=>this.retire(d.sessionId),()=>{})}),this.#e.set(s,t)}take(e){let t=n(e),s=this.#e.get(t);return this.#e.delete(t),s}hold(e,t){this.retire(e.sessionId),this.#t.set(e.sessionId,{unregister:p(()=>e.sync.shutdown(t)),sync:e.sync})}retire(e){let t=n(e),s=this.#t.get(t);if(s===void 0)return;this.#t.delete(t),s.unregister(),s.sync.shutdown(0)}stateOf(e){return this.#t.get(n(e))?.sync.state()}tellUnknownEngineWord(){if(this.#s)return!1;return this.#s=!0,!0}linkedWorktreesServed(){return this.#n}serveLinkedWorktreesForTesting(e){throw Error("serveLinkedWorktreesForTesting is test-only")}get heldCount(){return this.#e.size}get exitHookCount(){return this.#t.size}}function f(){return new a}function D(){return m.of(r().host)}function H(e){return D().take(e)}var g=8,I="File sync is not running for this session here: this process did not seed it from this checkout, so it has nothing to keep in sync",m;var L=S(()=>{h();l();u();y();m=new o(f)});
export{I as GVb,a as HVb,f as IVb,m as JVb,D as KVb,H as LVb,L as MVb};
