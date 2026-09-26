// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{dn}from"/$bunfs/root/chunk-d6bkh9x7.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{Bn}from"/$bunfs/root/chunk-txvgrx83.js";import{pn,Ra,gt,iTe}from"/$bunfs/root/chunk-wbbthbh9.js";import{hostname as n}from"os";function hN(){return}function lZ(){return}function Bw(){let e=hN();if(e!==void 0)return e;if(!Bn()||!gt())return;return pn()?.accessToken}async function lE(e){if(!(N()&&e!==void 0))return Bw();let r=hN();if(r!==void 0)return r;if(!Bn()||!await iTe(e))return;return(await Ra(e))?.accessToken}function kI(){return lZ()??dn().BASE_API_URL}function OEe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{hN,lZ,Bw,lE,kI,OEe};
