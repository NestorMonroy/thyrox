// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{kl}from"/$bunfs/root/chunk-b8sc2vbx.js";import{g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();var GB=150,wo=250;function ed(e,n,t=GB){let o=e()-n;if(o>=0)return o<t;return n<=Date.now()}function U2r(e){let n=kl(),[t,o]=g(()=>({key:e,at:Date.now()}));if(t.key!==e)o({key:e,at:Date.now()});return function(){return ed(n,t.at)}}
export{GB,wo,ed,U2r};
