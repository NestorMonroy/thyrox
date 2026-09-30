// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Yt}from"/$bunfs/root/chunk-ebf04mp3.js";import{F}from"/$bunfs/root/chunk-h401nbms.js";import{Jt,pa,mt,aye}from"/$bunfs/root/chunk-xbd48fav.js";import{Bn}from"/$bunfs/root/chunk-ffayvr1z.js";import{hostname as n}from"os";function uM(){return}function AY(){return}function Xb(){let e=uM();if(e!==void 0)return e;if(!Bn()||!mt())return;return Jt()?.accessToken}async function cv(e){if(!(F()&&e!==void 0))return Xb();let r=uM();if(r!==void 0)return r;if(!Bn()||!await aye(e))return;return(await pa(e))?.accessToken}function zC(){return AY()??Yt().BASE_API_URL}function _ge(){let e=process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX||n();return t(e)||"remote-control"}function t(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
export{uM,AY,Xb,cv,zC,_ge};
