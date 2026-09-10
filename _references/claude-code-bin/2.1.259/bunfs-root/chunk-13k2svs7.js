// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Jt}from"/$bunfs/root/chunk-m7w5m1w6.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{tn,oa,wt,ose}from"/$bunfs/root/chunk-x722nt0q.js";import{Nn}from"/$bunfs/root/chunk-xfn8hpdj.js";import{hostname as n}from"os";function tx(){return}function Dq(){return}function Ry(){let e=tx();if(e!==void 0)return e;if(!Nn()||!wt())return;return tn()?.accessToken}async function sk(e){if(!(M()&&e!==void 0))return Ry();let r=tx();if(r!==void 0)return r;if(!Nn()||!await ose(e))return;return(await oa(e))?.accessToken}function sme(){return Dq()??Jt().BASE_API_URL}function Yoe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return QAr(e)||"remote-control"}function QAr(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{tx,Dq,Ry,sk,sme,Yoe,QAr};
