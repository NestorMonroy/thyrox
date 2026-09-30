// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{sn}from"/$bunfs/root/chunk-vtytg7jt.js";import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{zn}from"/$bunfs/root/chunk-n2v4180x.js";import{ln,Ha,ut,aRe}from"/$bunfs/root/chunk-f74xvn8g.js";import{hostname as n}from"os";function yH(){return}function dte(){return}function Hv(){let e=yH();if(e!==void 0)return e;if(!zn()||!ut())return;return ln()?.accessToken}async function GE(e){if(!(L()&&e!==void 0))return Hv();let r=yH();if(r!==void 0)return r;if(!zn()||!await aRe(e))return;return(await Ha(e))?.accessToken}function mP(){return dte()??sn().BASE_API_URL}function zTe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{yH,dte,Hv,GE,mP,zTe};
