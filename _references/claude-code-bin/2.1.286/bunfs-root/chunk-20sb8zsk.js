// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{cn}from"/$bunfs/root/chunk-8zh80t3g.js";import{F}from"/$bunfs/root/chunk-616rkgbc.js";import{Bn}from"/$bunfs/root/chunk-sygqycmd.js";import{pn,Na,ct,txe}from"/$bunfs/root/chunk-4hjp8tw4.js";import{hostname as n}from"os";function DM(){return}function sne(){return}function Jv(){let e=DM();if(e!==void 0)return e;if(!Bn()||!ct())return;return pn()?.accessToken}async function ok(e){if(!(F()&&e!==void 0))return Jv();let r=DM();if(r!==void 0)return r;if(!Bn()||!await txe(e))return;return(await Na(e))?.accessToken}function OP(){return sne()??cn().BASE_API_URL}function sCe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{DM,sne,Jv,ok,OP,sCe};
