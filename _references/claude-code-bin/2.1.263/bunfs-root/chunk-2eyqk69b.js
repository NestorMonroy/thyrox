// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Vt}from"/$bunfs/root/chunk-1p8thh7t.js";import{O}from"/$bunfs/root/chunk-m3vzz9tz.js";import{Xt,Qi,gt,$se}from"/$bunfs/root/chunk-32f2qmtc.js";import{xn}from"/$bunfs/root/chunk-1wrntbps.js";import{hostname as n}from"os";function yI(){return}function KV(){return}function dy(){let e=yI();if(e!==void 0)return e;if(!xn()||!gt())return;return Xt()?.accessToken}async function bv(e){if(!(O()&&e!==void 0))return dy();let r=yI();if(r!==void 0)return r;if(!xn()||!await $se(e))return;return(await Qi(e))?.accessToken}function jfe(){return KV()??Vt().BASE_API_URL}function Nre(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{yI,KV,dy,bv,jfe,Nre};
