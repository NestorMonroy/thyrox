// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ln}from"/$bunfs/root/chunk-yr0jgjsq.js";import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{qn}from"/$bunfs/root/chunk-12vsw1j8.js";import{pn,Wa,ut,kRe}from"/$bunfs/root/chunk-swk3rjnt.js";import{hostname as n}from"os";function TH(){return}function Tte(){return}function Pv(){let e=TH();if(e!==void 0)return e;if(!qn()||!ut())return;return pn()?.accessToken}async function GE(e){if(!(N()&&e!==void 0))return Pv();let r=TH();if(r!==void 0)return r;if(!qn()||!await kRe(e))return;return(await Wa(e))?.accessToken}function wI(){return Tte()??ln().BASE_API_URL}function jAe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{TH,Tte,Pv,GE,wI,jAe};
