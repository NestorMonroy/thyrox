// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Fpc as o,Jpc as t,Lqc as P,loc as p}from"/$bunfs/root/_668.js";import{XBc as i,fCc as m,kCc as S}from"/$bunfs/root/_695.js";import{$Lc as l,VLc as f,ZLc as e,_Lc as c,iMc as A}from"/$bunfs/root/_708.js";import{Tbd as d}from"/$bunfs/root/_811.js";import{ncd as s}from"/$bunfs/root/_812.js";import{atd as h,qpd as a,spd as u}from"/$bunfs/root/_826.js";import{xxd as g}from"/$bunfs/root/_837.js";function O(){f()}function K(){let n=c();if(n!==void 0)return n;if(l())return e(!0);if(i()==="gateway")return e(u(a()));if(i()!=="firstParty")return e(!1);if(!m())return e(!1);let r=s.CLAUDE_CODE_ENTRYPOINT;if(r==="local-agent"||r==="remote_cowork"||r?.startsWith("claude-coworker"))return e(!1);if(o()&&t()===null)return e(!0);if(o()&&(t()==="enterprise"||t()==="team"))return e(!0);try{let{key:y}=p({skipRetrievingKeyFromApiKeyHelper:!0});if(y)return e(!0)}catch{}return e(!1)}var b=g(()=>{h();P();d();S();A()});
export{O as DTb,K as ETb,b as FTb};
