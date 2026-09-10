// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Yt}from"/$bunfs/root/chunk-wchdjfbm.js";import{N}from"/$bunfs/root/chunk-m3k3498d.js";import{Jt,na,gt,iae}from"/$bunfs/root/chunk-btbsn9s4.js";import{On}from"/$bunfs/root/chunk-5jacf3nm.js";import{hostname as n}from"os";function sP(){return}function yK(){return}function Py(){let e=sP();if(e!==void 0)return e;if(!On()||!gt())return;return Jt()?.accessToken}async function YA(e){if(!(N()&&e!==void 0))return Py();let r=sP();if(r!==void 0)return r;if(!On()||!await iae(e))return;return(await na(e))?.accessToken}function Ime(){return yK()??Yt().BASE_API_URL}function ase(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{sP,yK,Py,YA,Ime,ase};
