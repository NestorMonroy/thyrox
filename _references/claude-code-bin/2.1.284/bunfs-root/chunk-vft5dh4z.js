// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,j}from"/$bunfs/root/chunk-d37h8mav.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{dp,Hr,tH}from"/$bunfs/root/chunk-e06pb89d.js";var r="--inherit-permission-mode";function s(e){return e===r||e.startsWith(`${r}=`)}class f{mode}var c=new q(()=>new f);function p(){return c.of(j().host)}function pto({inheritPermissionModeCli:e,resolvedMode:n,storageV5:i}){if(!e)return;p().mode=n,tH("--permission-mode",[r],n,void 0,i).catch((o)=>d(o))}async function fto(e){let n=p(),i=n.mode;if(i===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let t=await Hr(o,e);if(!t?.respawnFlags)return;if(!t.respawnFlags.some(s)){n.mode=void 0;return}await tH("--permission-mode",[r],i,void 0,e,void 0,(u)=>u.some(s)),dp(o);let m=await Hr(o,e);if(m?.respawnFlags&&!m.respawnFlags.some(s))n.mode=void 0}
export{pto,fto};
