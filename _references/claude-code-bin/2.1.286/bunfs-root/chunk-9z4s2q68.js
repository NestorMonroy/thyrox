// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Xt}from"/$bunfs/root/chunk-9wvhp90s.js";import{uht,K_n,AXn}from"/$bunfs/root/chunk-0wj52kch.js";import{aJe}from"/$bunfs/root/chunk-v67w5hxq.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{k9}from"/$bunfs/root/chunk-6cab4ymk.js";import{Ubr}from"/$bunfs/root/chunk-etz6qdg6.js";import{iFn}from"/$bunfs/root/chunk-kt4703ww.js";import{En}from"/$bunfs/root/chunk-1b1zc2ez.js";var Obr=["Docs"],n=new Set(["claudedocs","claudepages"]);function $0n(e){return e.tier==="core"&&Obr.some((o)=>k9(e.title)===k9(o))}var Gmo="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function fRt(e){return e.config.type==="claudeai-proxy"&&aJe(e.config)&&iFn(e.config)||Ubr()&&e.config.type==="sdk"&&Xt(e.name)!==null&&n.has(AXn(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(K_n(e.config)||uht.has(e.name))}function F0n(e){return e.some((o)=>(o.type==="connected"||o.type==="pending"||o.type==="cached")&&fRt(o))}var r="Claude Preview",s="Claude Browser",i=En(r),c=En(s),m=new Set([i,c]);function v0e(e){return m.has(En(e))}function V7t(e,o){let t=`mcp__${En(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:t,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:t,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{Obr,$0n,Gmo,fRt,F0n,v0e,V7t};
