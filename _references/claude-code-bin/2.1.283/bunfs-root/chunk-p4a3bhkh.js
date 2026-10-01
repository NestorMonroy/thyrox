// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{Qu,Pr,jO}from"/$bunfs/root/chunk-mxz6ht5b.js";var r="--inherit-permission-mode";function s(e){return e===r||e.startsWith(`${r}=`)}class f{mode}var c=new q(()=>new f);function p(){return c.of(j().host)}function qJr({inheritPermissionModeCli:e,resolvedMode:n,storageV5:i}){if(!e)return;p().mode=n,jO("--permission-mode",[r],n,void 0,i).catch((o)=>d(o))}async function KJr(e){let n=p(),i=n.mode;if(i===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let t=await Pr(o,e);if(!t?.respawnFlags)return;if(!t.respawnFlags.some(s)){n.mode=void 0;return}await jO("--permission-mode",[r],i,void 0,e,void 0,(u)=>u.some(s)),Qu(o);let m=await Pr(o,e);if(m?.respawnFlags&&!m.respawnFlags.some(s))n.mode=void 0}
export{qJr,KJr};
