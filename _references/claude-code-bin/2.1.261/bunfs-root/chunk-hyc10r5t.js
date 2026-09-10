// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{u}from"/$bunfs/root/chunk-2y9gqtpa.js";import{Nr}from"/$bunfs/root/chunk-qtjs85tq.js";import{n4t,r4t}from"/$bunfs/root/chunk-qsaz58sb.js";import{We,Bt}from"/$bunfs/root/chunk-hyqdn9c0.js";var p=["userSettings","projectSettings","localSettings","flagSettings","cliArg","session"];function s(l){if(l===We)return We;if(l===Bt)return Bt;return null}function c(l,e){let o=s(l);if(o===null)return null;if(e===void 0||e===""||/^[\s*]+$/.test(e))return"bare";return(o===We?n4t(o,e):r4t(o,e))?"dangerous_prefix":"scoped"}function y(l){let e={},o=0;for(let r of p)for(let t of l[r]??[]){let{toolName:f,ruleContent:S}=Nr(t),n=s(f);if(n===null)continue;let a=c(n,S);if(a===null)continue;let m=`${r}_${n}_${a}`;e[m]=(e[m]??0)+1,o++}return e.total_shell_allow_rules=o,e}function hGn(l){i("tengu_shell_allow_rules_at_init",y(l))}function ZOt(l){for(let e of l){if(e.type!=="addRules"||e.behavior!=="allow")continue;for(let o of e.rules){let r=s(o.toolName);if(r===null)continue;let t=c(o.toolName,o.ruleContent);if(t===null)continue;i("tengu_shell_allow_rule_added",{toolName:u(r),category:u(t),destination:u(e.destination)})}}}
export{hGn,ZOt};
