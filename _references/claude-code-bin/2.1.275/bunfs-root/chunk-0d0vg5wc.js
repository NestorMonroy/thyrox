// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{c}from"/$bunfs/root/chunk-gytndg57.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{tr}from"/$bunfs/root/chunk-cwfdaz1m.js";import{y_n,__n}from"/$bunfs/root/chunk-9apg35nm.js";import{je,Kt}from"/$bunfs/root/chunk-xbd48fav.js";var p=["userSettings","projectSettings","localSettings","flagSettings","cliArg","session"];function s(l){if(l===je)return je;if(l===Kt)return Kt;return null}function m(l,e){let o=s(l);if(o===null)return null;if(e===void 0||e===""||/^[\s*]+$/.test(e))return"bare";return(o===je?y_n(o,e):__n(o,e))?"dangerous_prefix":"scoped"}function y(l){let e={},o=0;for(let r of p)for(let t of l[r]??[]){let{toolName:f,ruleContent:S}=tr(t),n=s(f);if(n===null)continue;let u=m(n,S);if(u===null)continue;let a=`${r}_${n}_${u}`;e[a]=(e[a]??0)+1,o++}return e.total_shell_allow_rules=o,e}function QSr(l){i("tengu_shell_allow_rules_at_init",y(l))}function fQt(l){for(let e of l){if(e.type!=="addRules"||e.behavior!=="allow")continue;for(let o of e.rules){let r=s(o.toolName);if(r===null)continue;let t=m(o.toolName,o.ruleContent);if(t===null)continue;i("tengu_shell_allow_rule_added",{toolName:c(r),category:c(t),destination:c(e.destination)})}}}
export{QSr,fQt};
