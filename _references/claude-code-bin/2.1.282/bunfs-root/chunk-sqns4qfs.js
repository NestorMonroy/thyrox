// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{yo}from"/$bunfs/root/chunk-zwm3fybx.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{j0}from"/$bunfs/root/chunk-xt60grfb.js";import{Bn}from"/$bunfs/root/chunk-txvgrx83.js";function i(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!Bn()}function DAo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function s(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function jg(){return i()||yo()!==null||j0()||s()}function w5(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function PD(){if(w5())return!1;return j0()}var xTe="claude-ai",w5e="anthropic-skills",ITe=["anthropic-skills","claude-ai"],v5e="anthropic-skills";function o(e,t){return e==="account"&&t?"claude-ai":"anthropic-skills"}function sGn(e,t,n){return`${o(t,n)}:${e}`}function Fae(e){return ITe.some((t)=>e.startsWith(`${t}:`))}function _ln(e){return/^[A-Za-z0-9._-]+$/.test(e)}function JN(e){let t=ITe.find((n)=>e.startsWith(`${n}:`));return t===void 0?e:e.slice(t.length+1)}function pge(e){if(e.startsWith("claude-ai:"))return`anthropic-skills:${e.slice(10)}`;if(e.startsWith("anthropic-skills:"))return`claude-ai:${e.slice(17)}`;return}function JLe(e){let t=pge(e.name);if(t===void 0)return[];return e.name.startsWith("claude-ai:")||e.syncedSkillClass==="account"?[t]:[]}function bln(e){if(e.loadedFrom==="syncedSkills")return JLe(e);if(e.loadedFrom==="plugin"&&e.name.startsWith("anthropic-skills:")){let t=pge(e.name);return t===void 0?[]:[t]}return[]}function Sln(e,t){let n=t?"anthropic-skills":"claude-ai";if(!e.startsWith(`${n}:`))return[];let r=pge(e);return r===void 0?[]:[r]}
export{DAo,jg,w5,PD,xTe,w5e,ITe,v5e,sGn,Fae,_ln,JN,pge,JLe,bln,Sln};
