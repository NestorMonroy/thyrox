// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{S,t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{wa}from"/$bunfs/root/chunk-gbjaaczn.js";import{Zzn,zj,BE}from"/$bunfs/root/chunk-25k3003k.js";import{ll}from"/$bunfs/root/chunk-3mz60s54.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{re,fn,k,L}from"/$bunfs/root/chunk-v21q572m.js";L();function ute({scope:n,bindings:i,active:o=!0,preemptive:a=!1,swallowAll:f=!1,claimFocus:l=!1,ref:d,flexGrow:B=0,flexDirection:D,flexShrink:O,children:R}){let y=k(null),p=ll(),b=k([]);b.current=o?i:[];let H=re((r)=>C(r,b.current),[]),A=M(n,o,a,f,b.current),g=o&&a&&Boolean(n),E=g&&f;fn(()=>{if(!p)return;let r=y.current;if(!r)return;let{decls:c,scopesChanged:s,preemptiveScopes:m,swallowAll:u}=p.keyHandlerRegistry,K={scope:n,active:o,preemptive:a,swallowAll:f,entriesRef:b};if(c.set(r,K),g&&n){if(x(m,n),E)x(u,n)}return s.emit(),()=>{if(c.delete(r),g&&n){if(v(m,n),E)v(u,n)}s.emit()}},[p,n,g,E,A]),fn(()=>{if(!l)return;let r=y.current;if(!r)return;let c=BE(r),s=!1,m=()=>{if(s)return;let u=y.current;if(!u)return;let K=c.activeElement;if(K&&zj(K,u))return;s=!0;try{c.focus(u)}finally{s=!1}};return c.pushAutoFocusFallback(r),m(),c.subscribe(m)},[l]);let h=k(!1);fn(()=>{return},[n,l,p]);let w=re((r)=>{if(y.current=r,typeof d==="function")d(r);else if(d)d.current=r},[d]);return e(wa,{ref:w,keybindingScope:n,onAction:H,tabIndex:l?-1:void 0,flexGrow:B,flexDirection:D,flexShrink:O,children:R})}function C(n,i){for(let o of i){if(o.action!==n.action)continue;if(o.chordOnly&&!n.isChordCompletion)continue;if(o.run()===!1)continue;n.consume();return}}function x(n,i){n.set(i,(n.get(i)??0)+1)}function v(n,i){let o=(n.get(i)??0)-1;if(o<=0)n.delete(i);else n.set(i,o)}function M(n,i,o,a,f){return S([n??"",i,o,a,f.map((l)=>[l.action??"",l.hint??"",Boolean(l.chordOnly)])])}
export{ute};
