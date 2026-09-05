// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Kt}from"/$bunfs/root/chunk-twjxwmnx.js";import{M}from"/$bunfs/root/chunk-y7x1gsy0.js";import{Jt,Qs,wt,uie}from"/$bunfs/root/chunk-8qt7d28b.js";import{Wn}from"/$bunfs/root/chunk-cnazfz7b.js";import{hostname as n}from"os";function UR(){return}function nq(){return}function Ey(){let e=UR();if(e!==void 0)return e;if(!Wn()||!wt())return;return Jt()?.accessToken}async function qv(e){if(!(M()&&e!==void 0))return Ey();let r=UR();if(r!==void 0)return r;if(!Wn()||!await uie(e))return;return(await Qs(e))?.accessToken}function mpe(){return nq()??Kt().BASE_API_URL}function toe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return hHr(e)||"remote-control"}function hHr(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{UR,nq,Ey,qv,mpe,toe,hHr};
