// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{_}from"/$bunfs/root/chunk-marw4shk.js";import{Q}from"/$bunfs/root/chunk-nxtd6mp4.js";import{Wo}from"/$bunfs/root/chunk-2xnqb2qr.js";import{owr}from"/$bunfs/root/chunk-a9ebyets.js";import{Qze}from"/$bunfs/root/chunk-nrhsy0rh.js";function i(t){return{arm(){Q().templateLanes[t]=!0},take(){let e=Q().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){Q().templateLanes[t]=!0}}}var o=i("prototypeArmed");function igr(){o.arm(),_("prototype_started",{})}function agr(){return o.take()}function qet(){o.giveBack()}function p(t,e){Q().templateLanes.boundSlugs.set(t,e)}function lgr(t){return Q().templateLanes.boundSlugs.get(t)}function cgr(t,e){p(t,"prototype"),_("prototype_publish",{artifact_slug:Qze(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function ugr(t){n=t}async function L2e(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-9b3tzsb4.js");return r=owr(Wo(t).content.trimStart().replace(s,()=>n())),r}function dgr(){return r}
export{igr,agr,qet,lgr,cgr,ugr,L2e,dgr};
