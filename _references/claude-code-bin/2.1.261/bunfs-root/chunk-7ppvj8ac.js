// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Vt}from"/$bunfs/root/chunk-49q43dms.js";import{O}from"/$bunfs/root/chunk-x7f60hk6.js";import{Xt,Qi,gt,Pse}from"/$bunfs/root/chunk-hyqdn9c0.js";import{xn}from"/$bunfs/root/chunk-hs05644q.js";import{hostname as n}from"os";function yI(){return}function qV(){return}function uy(){let e=yI();if(e!==void 0)return e;if(!xn()||!gt())return;return Xt()?.accessToken}async function bv(e){if(!(O()&&e!==void 0))return uy();let r=yI();if(r!==void 0)return r;if(!xn()||!await Pse(e))return;return(await Qi(e))?.accessToken}function Ufe(){return qV()??Vt().BASE_API_URL}function Mre(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{yI,qV,uy,bv,Ufe,Mre};
