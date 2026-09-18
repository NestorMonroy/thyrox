// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{je}from"/$bunfs/root/chunk-xbd48fav.js";import{Bt,iae,fv}from"/$bunfs/root/chunk-3qftbphc.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{bf}from"/$bunfs/root/chunk-nbfvjj3w.js";import{M_}from"/$bunfs/root/chunk-w21br88b.js";import{Fh}from"/$bunfs/root/chunk-kxr4eyfb.js";import{NGr}from"/$bunfs/root/chunk-9apg35nm.js";import{oL,$l}from"/$bunfs/root/chunk-q2gh92k2.js";import{py,Tzt,ygt}from"/$bunfs/root/chunk-h8abzvp3.js";import{$zt,S8e}from"/$bunfs/root/chunk-x94ea0xy.js";import{uJt}from"/$bunfs/root/chunk-mdt3sxrw.js";import{Si,vc}from"/$bunfs/root/chunk-0ahj7yw0.js";var p=new Set([M_,Fh]),c=["subscribe_pr_activity","unsubscribe_pr_activity"];function f(o){return c.some((e)=>o.endsWith(e))}var T=new Set([bf,"github"]);function uIn(o,e){if(e.length===0)return o;let t=e.map((r)=>[r,Si(r)]),n=o.filter((r)=>!t.some(([s,i])=>vc(r,s,i)));return n.length===o.length?o:n}function u(o){return o.mcpInfo?.cliOwned===!0&&o.mcpInfo.serverName===bf}var m=import.meta.require("/$bunfs/root/chunk-48f8swxq.js");function qTt(){return(process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((o)=>o.trim()).filter(Boolean)}function dIn(o,e=qTt()){if($zt(o)||T.has(o.name))return!0;let t=Si(o.name);return e.some((n)=>n.startsWith(t))}function KJr(o){let e=a.CLAUDE_CODE_BRIEF,t=new Set(qTt()),n=ygt();return o.filter((r)=>Tzt.has(r.name)||n&&Bt(r,je)&&!py(r)||f(r.name)||u(r)||S8e(r)||e&&p.has(r.name)||fv(r,t))}function pet(o,e,t,n){let[r,s]=oL(uJt($l([...o,...e],"name"),n),py),i=[...s.sort(iae),...r.sort(iae)];if(m){if(m.isCoordinatorMode())return KJr(i)}return i}function fet(o,e){let t=o.length===1?o[0]:void 0;if(t&&NGr(e,t))return[];return o}
export{uIn,qTt,dIn,KJr,pet,fet};
