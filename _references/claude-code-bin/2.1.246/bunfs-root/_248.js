// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jcb as S,kcb as d}from"/$bunfs/root/_493.js";import{mcb as c,ocb as a}from"/$bunfs/root/_494.js";import{eSb as l,lSb as t,wSb as r,ySb as x}from"/$bunfs/root/_593.js";import{xxd as v}from"/$bunfs/root/_837.js";function b(N){let g=S(3),{session:f,children:p}=N,T;if(g[0]!==p||g[1]!==f)T=c(n.Provider,{value:f,children:p}),g[0]=p,g[1]=f,g[2]=T;else T=g[2];return T}function m(i){let C=S(3),e=t(n);if(!e){throw ReferenceError("useSession cannot be called outside of a <SessionProvider />")}let R;if(C[0]!==i||C[1]!==e)R=()=>i?i(e):e,C[0]=i,C[1]=e,C[2]=R;else R=C[2];let P=R;return r(e.subscribe,P,P)}var n;var h=v(()=>{x();a();d();n=l(null)});
export{b as lB,m as mB,h as nB};
