// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{b,t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{el}from"/$bunfs/root/chunk-p97n3qf8.js";import{XUn,hj,yj}from"/$bunfs/root/chunk-2kd50vvr.js";import{ul}from"/$bunfs/root/chunk-s2qjm80t.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{U,Mn,k,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();function Mee({scope:n,bindings:i,active:o=!0,preemptive:a=!1,swallowAll:f=!1,claimFocus:l=!1,ref:d,flexGrow:D=0,flexDirection:O,flexShrink:R,children:H}){let y=k(null),p=ul(),g=k([]);g.current=o?i:[];let A=U((r)=>C(r,g.current),[]),S=M(n,o,a,f,g.current),K=o&&a&&Boolean(n),h=K&&f;Mn(()=>{if(!p)return;let r=y.current;if(!r)return;let{decls:c,scopesChanged:s,preemptiveScopes:m,swallowAll:u}=p.keyHandlerRegistry,E={scope:n,active:o,preemptive:a,swallowAll:f,entriesRef:g};if(c.set(r,E),K&&n){if(v(m,n),h)v(u,n)}return s.emit(),()=>{if(c.delete(r),K&&n){if(B(m,n),h)B(u,n)}s.emit()}},[p,n,K,h,S]),Mn(()=>{if(!l)return;let r=y.current;if(!r)return;let c=yj(r),s=!1,m=()=>{if(s)return;let u=y.current;if(!u)return;let E=c.activeElement;if(E&&hj(E,u))return;s=!0;try{c.focus(u)}finally{s=!1}};return c.pushAutoFocusFallback(r),m(),c.subscribe(m)},[l]);let x=k(!1);Mn(()=>{return},[n,l,p]);let w=U((r)=>{if(y.current=r,typeof d==="function")d(r);else if(d)d.current=r},[d]);return e(el,{ref:w,keybindingScope:n,onAction:A,tabIndex:l?-1:void 0,flexGrow:D,flexDirection:O,flexShrink:R,children:H})}function C(n,i){for(let o of i){if(o.action!==n.action)continue;if(o.chordOnly&&!n.isChordCompletion)continue;if(o.run()===!1)continue;n.consume();return}}function v(n,i){n.set(i,(n.get(i)??0)+1)}function B(n,i){let o=(n.get(i)??0)-1;if(o<=0)n.delete(i);else n.set(i,o)}function M(n,i,o,a,f){return b([n??"",i,o,a,f.map((l)=>[l.action??"",l.hint??"",Boolean(l.chordOnly)])])}
export{Mee};
