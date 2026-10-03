// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Da}from"/$bunfs/root/chunk-fsx1dvsr.js";import{g,D}from"/$bunfs/root/chunk-mqace48v.js";D();var eV=150,ho=250;function Fc(e,n,t=eV){let o=e()-n;if(o>=0)return o<t;return n<=Date.now()}function Mno(e){let n=Da(),[t,o]=g(()=>({key:e,at:Date.now()}));if(t.key!==e)o({key:e,at:Date.now()});return function(){return Fc(n,t.at)}}
export{eV,ho,Fc,Mno};
