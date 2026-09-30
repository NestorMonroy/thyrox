// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{dn}from"/$bunfs/root/chunk-dqhw8yqd.js";import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{Bn}from"/$bunfs/root/chunk-6r1h1xyw.js";import{un,Ta,pt,UEe}from"/$bunfs/root/chunk-5khn4tvf.js";import{hostname as n}from"os";function qL(){return}function eQ(){return}function Hw(){let e=qL();if(e!==void 0)return e;if(!Bn()||!pt())return;return un()?.accessToken}async function Kv(e){if(!(F()&&e!==void 0))return Hw();let r=qL();if(r!==void 0)return r;if(!Bn()||!await UEe(e))return;return(await Ta(e))?.accessToken}function aI(){return eQ()??dn().BASE_API_URL}function Ywe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{qL,eQ,Hw,Kv,aI,Ywe};
