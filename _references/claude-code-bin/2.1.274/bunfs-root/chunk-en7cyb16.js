// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Xt}from"/$bunfs/root/chunk-hxy982f9.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{Qt,la,St,Dge}from"/$bunfs/root/chunk-27bj2wbx.js";import{Fn}from"/$bunfs/root/chunk-zsdbd62x.js";import{hostname as n}from"os";function FO(){return}function H8(){return}function Fb(){let e=FO();if(e!==void 0)return e;if(!Fn()||!St())return;return Qt()?.accessToken}async function jw(e){if(!(F()&&e!==void 0))return Fb();let r=FO();if(r!==void 0)return r;if(!Fn()||!await Dge(e))return;return(await la(e))?.accessToken}function mC(){return H8()??Xt().BASE_API_URL}function rme(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{FO,H8,Fb,jw,mC,rme};
