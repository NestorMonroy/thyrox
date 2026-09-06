// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{S,n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{ga}from"/$bunfs/root/chunk-gkqebe2m.js";import{_1n,NU,FU}from"/$bunfs/root/chunk-850xskm4.js";import{sl}from"/$bunfs/root/chunk-99d7k3tk.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{re,dn,v,F}from"/$bunfs/root/chunk-1c6mq242.js";F();function qZ({scope:t,bindings:i,active:o=!0,preemptive:a=!1,swallowAll:f=!1,claimFocus:l=!1,ref:d,flexGrow:B=0,flexDirection:D,flexShrink:O,children:R}){let y=v(null),p=sl(),b=v([]);b.current=o?i:[];let H=re((r)=>C(r,b.current),[]),A=M(t,o,a,f,b.current),g=o&&a&&Boolean(t),E=g&&f;dn(()=>{if(!p)return;let r=y.current;if(!r)return;let{decls:c,scopesChanged:s,preemptiveScopes:m,swallowAll:u}=p.keyHandlerRegistry,K={scope:t,active:o,preemptive:a,swallowAll:f,entriesRef:b};if(c.set(r,K),g&&t){if(x(m,t),E)x(u,t)}return s.emit(),()=>{if(c.delete(r),g&&t){if(k(m,t),E)k(u,t)}s.emit()}},[p,t,g,E,A]),dn(()=>{if(!l)return;let r=y.current;if(!r)return;let c=FU(r),s=!1,m=()=>{if(s)return;let u=y.current;if(!u)return;let K=c.activeElement;if(K&&NU(K,u))return;s=!0;try{c.focus(u)}finally{s=!1}};return c.pushAutoFocusFallback(r),m(),c.subscribe(m)},[l]);let h=v(!1);dn(()=>{return},[t,l,p]);let w=re((r)=>{if(y.current=r,typeof d==="function")d(r);else if(d)d.current=r},[d]);return e(ga,{ref:w,keybindingScope:t,onAction:H,tabIndex:l?-1:void 0,flexGrow:B,flexDirection:D,flexShrink:O,children:R})}function C(t,i){for(let o of i){if(o.action!==t.action)continue;if(o.chordOnly&&!t.isChordCompletion)continue;if(o.run()===!1)continue;t.consume();return}}function x(t,i){t.set(i,(t.get(i)??0)+1)}function k(t,i){let o=(t.get(i)??0)-1;if(o<=0)t.delete(i);else t.set(i,o)}function M(t,i,o,a,f){return S([t??"",i,o,a,f.map((l)=>[l.action??"",l.hint??"",Boolean(l.chordOnly)])])}
export{qZ};
