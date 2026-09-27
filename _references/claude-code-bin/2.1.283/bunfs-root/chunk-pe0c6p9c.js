// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{_}from"/$bunfs/root/chunk-d09a8ccq.js";import{ee}from"/$bunfs/root/chunk-w6cz7xwh.js";import{ms}from"/$bunfs/root/chunk-3fb3v82z.js";import{kso}from"/$bunfs/root/chunk-qn96q61j.js";import{DZe}from"/$bunfs/root/chunk-0xkwfstm.js";function i(t){return{arm(){ee().templateLanes[t]=!0},take(){let e=ee().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){ee().templateLanes[t]=!0}}}var o=i("prototypeArmed");function A9r(){o.arm(),_("prototype_started",{})}function C9r(){return o.take()}function F_t(){o.giveBack()}function p(t,e){ee().templateLanes.boundSlugs.set(t,e)}function R9r(t){return ee().templateLanes.boundSlugs.get(t)}function x9r(t,e){p(t,"prototype"),_("prototype_publish",{artifact_slug:DZe(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function I9r(t){n=t}async function d7e(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-ek0zbgsx.js");return r=kso(ms(t).content.trimStart().replace(s,()=>n())),r}function P9r(){return r}
export{A9r,C9r,F_t,R9r,x9r,I9r,d7e,P9r};
