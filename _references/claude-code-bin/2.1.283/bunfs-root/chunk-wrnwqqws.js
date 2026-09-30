// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{en}from"/$bunfs/root/chunk-s1pmhfks.js";import{rpn,WKn,zKn}from"/$bunfs/root/chunk-t6pwageh.js";import{ZYe}from"/$bunfs/root/chunk-379zyrv7.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{s8}from"/$bunfs/root/chunk-tsfnap17.js";import{ypr}from"/$bunfs/root/chunk-x2ys96xy.js";import{LMn}from"/$bunfs/root/chunk-csayct82.js";import{vn}from"/$bunfs/root/chunk-831var66.js";var cpr=["Docs"],t=new Set(["claudedocs","claudepages"]);function Dxn(e){return e.tier==="core"&&cpr.some((o)=>s8(e.title)===s8(o))}var fio="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function nkt(e){return e.config.type==="claudeai-proxy"&&ZYe(e.config)&&LMn(e.config)||ypr()&&e.config.type==="sdk"&&en(e.name)!==null&&t.has(zKn(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(WKn(e.config)||rpn.has(e.name))}function Lxn(e){return e.some((o)=>(o.type==="connected"||o.type==="pending")&&nkt(o))}var r="Claude Preview",s="Claude Browser",i=vn(r),c=vn(s),m=new Set([i,c]);function aHe(e){return m.has(vn(e))}function n8t(e,o){let n=`mcp__${vn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:n,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:n,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{cpr,Dxn,fio,nkt,Lxn,aHe,n8t};
