// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ln}from"/$bunfs/root/chunk-djetmnb8.js";import{N}from"/$bunfs/root/chunk-8nz62976.js";import{Gn}from"/$bunfs/root/chunk-4h0c4z04.js";import{un,La,pt,mCe}from"/$bunfs/root/chunk-t6pwageh.js";import{hostname as n}from"os";function uH(){return}function Gee(){return}function fv(){let e=uH();if(e!==void 0)return e;if(!Gn()||!pt())return;return un()?.accessToken}async function AE(e){if(!(N()&&e!==void 0))return fv();let r=uH();if(r!==void 0)return r;if(!Gn()||!await mCe(e))return;return(await La(e))?.accessToken}function cP(){return Gee()??ln().BASE_API_URL}function NTe(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{uH,Gee,fv,AE,cP,NTe};
