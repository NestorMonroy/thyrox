// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{S,t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{Wl}from"/$bunfs/root/chunk-s09hj0q3.js";import{jbr,X6,pz}from"/$bunfs/root/chunk-knfw31n5.js";import{Ja}from"/$bunfs/root/chunk-9f4kw8h9.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{oe,pn,T,D}from"/$bunfs/root/chunk-347kpssc.js";D();function yue({scope:n,bindings:i,active:o=!0,preemptive:a=!1,swallowAll:f=!1,claimFocus:l=!1,ref:d,flexGrow:k=0,flexDirection:B,flexShrink:O,children:R}){let y=T(null),p=Ja(),b=T([]);b.current=o?i:[];let H=oe((r)=>C(r,b.current),[]),A=M(n,o,a,f,b.current),g=o&&a&&Boolean(n),E=g&&f;pn(()=>{if(!p)return;let r=y.current;if(!r)return;let{decls:c,scopesChanged:s,preemptiveScopes:m,swallowAll:u}=p.keyHandlerRegistry,K={scope:n,active:o,preemptive:a,swallowAll:f,entriesRef:b};if(c.set(r,K),g&&n){if(x(m,n),E)x(u,n)}return s.emit(),()=>{if(c.delete(r),g&&n){if(v(m,n),E)v(u,n)}s.emit()}},[p,n,g,E,A]),pn(()=>{if(!l)return;let r=y.current;if(!r)return;let c=pz(r),s=!1,m=()=>{if(s)return;let u=y.current;if(!u)return;let K=c.activeElement;if(K&&X6(K,u))return;s=!0;try{c.focus(u)}finally{s=!1}};return c.pushAutoFocusFallback(r),m(),c.subscribe(m)},[l]);let h=T(!1);pn(()=>{return},[n,l,p]);let w=oe((r)=>{if(y.current=r,typeof d==="function")d(r);else if(d)d.current=r},[d]);return e(Wl,{ref:w,keybindingScope:n,onAction:H,tabIndex:l?-1:void 0,flexGrow:k,flexDirection:B,flexShrink:O,children:R})}function C(n,i){for(let o of i){if(o.action!==n.action)continue;if(o.chordOnly&&!n.isChordCompletion)continue;if(o.run()===!1)continue;n.consume();return}}function x(n,i){n.set(i,(n.get(i)??0)+1)}function v(n,i){let o=(n.get(i)??0)-1;if(o<=0)n.delete(i);else n.set(i,o)}function M(n,i,o,a,f){return S([n??"",i,o,a,f.map((l)=>[l.action??"",l.hint??"",Boolean(l.chordOnly)])])}
export{yue};
