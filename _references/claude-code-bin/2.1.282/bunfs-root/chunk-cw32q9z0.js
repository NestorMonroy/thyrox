// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{nn}from"/$bunfs/root/chunk-bjy6zt8z.js";import{Ian,vzn,kzn}from"/$bunfs/root/chunk-wbbthbh9.js";import{x3e}from"/$bunfs/root/chunk-t6d3nxvc.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{x6}from"/$bunfs/root/chunk-910r90zw.js";import{uir}from"/$bunfs/root/chunk-chdzkg0m.js";import{Nxn}from"/$bunfs/root/chunk-c9jscxk0.js";import{vn}from"/$bunfs/root/chunk-b8dp1mr6.js";var Qsr=["Docs"],t=new Set(["claudedocs","claudepages"]);function _An(e){return e.tier==="core"&&Qsr.some((o)=>x6(e.title)===x6(o))}var C7r="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function bwt(e){return e.config.type==="claudeai-proxy"&&x3e(e.config)&&Nxn(e.config)||uir()&&e.config.type==="sdk"&&nn(e.name)!==null&&t.has(kzn(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(vzn(e.config)||Ian.has(e.name))}function bAn(e){return e.some((o)=>(o.type==="connected"||o.type==="pending")&&bwt(o))}var r="Claude Preview",s="Claude Browser",i=vn(r),c=vn(s),m=new Set([i,c]);function rPe(e){return m.has(vn(e))}function H5t(e,o){let n=`mcp__${vn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:n,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:n,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{Qsr,_An,C7r,bwt,bAn,rPe,H5t};
