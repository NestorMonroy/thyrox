// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{uie,nw}from"/$bunfs/root/chunk-gx4tznbd.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Hf}from"/$bunfs/root/chunk-da71yq24.js";import{T_}from"/$bunfs/root/chunk-8jxxned0.js";import{py}from"/$bunfs/root/chunk-20q5babf.js";import{JUr}from"/$bunfs/root/chunk-hfkkcqwq.js";import{BD,Ll,o_}from"/$bunfs/root/chunk-ayyj05ne.js";import{RBt}from"/$bunfs/root/chunk-xvt6q4jb.js";import{wBt,v6e}from"/$bunfs/root/chunk-ewm723dx.js";import{B8t}from"/$bunfs/root/chunk-1yymty58.js";import{bi,fc}from"/$bunfs/root/chunk-p6031f67.js";var p=new Set([T_,py]),c=["subscribe_pr_activity","unsubscribe_pr_activity"];function T(o){return c.some((e)=>o.endsWith(e))}var f=new Set([Hf,"github"]);function NAn(o,e){if(e.length===0)return o;let t=e.map((n)=>[n,bi(n)]),r=o.filter((n)=>!t.some(([s,i])=>fc(n,s,i)));return r.length===o.length?o:r}function u(o){return o.mcpInfo?.cliOwned===!0&&o.mcpInfo.serverName===Hf}var l=import.meta.require("/$bunfs/root/chunk-ewsh4c7m.js");function nkt(){return(process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((o)=>o.trim()).filter(Boolean)}function $An(o,e=nkt()){if(wBt(o)||f.has(o.name))return!0;let t=bi(o.name);return e.some((r)=>r.startsWith(t))}function T6r(o){let e=a.CLAUDE_CODE_BRIEF,t=new Set(nkt());return o.filter((r)=>RBt.has(r.name)||T(r.name)||u(r)||v6e(r)||e&&p.has(r.name)||nw(r,t))}function lQe(o,e,t,r){let[n,s]=BD(B8t(Ll([...o,...e],"name"),r),o_),i=[...s.sort(uie),...n.sort(uie)];if(l){if(l.isCoordinatorMode())return T6r(i)}return i}function cQe(o,e){let t=o.length===1?o[0]:void 0;if(t&&JUr(e,t))return[];return o}
export{NAn,nkt,$An,T6r,lQe,cQe};
