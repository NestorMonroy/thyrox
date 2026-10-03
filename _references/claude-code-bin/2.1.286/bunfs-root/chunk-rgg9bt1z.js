// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{y}from"/$bunfs/root/chunk-gm7a1q0z.js";import{Y}from"/$bunfs/root/chunk-bwk92a53.js";import{Cs}from"/$bunfs/root/chunk-jw1d1d4k.js";import{zfo}from"/$bunfs/root/chunk-xg9qxfna.js";import{Lnt}from"/$bunfs/root/chunk-0w18020d.js";function i(t){return{arm(){Y().templateLanes[t]=!0},take(){let e=Y().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){Y().templateLanes[t]=!0}}}var o=i("prototypeArmed");function dso(){o.arm(),y("prototype_started",{})}function uso(){return o.take()}function lEt(){o.giveBack()}function p(t,e){Y().templateLanes.boundSlugs.set(t,e)}function pso(t){return Y().templateLanes.boundSlugs.get(t)}function fso(t,e){p(t,"prototype"),y("prototype_publish",{artifact_slug:Lnt(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function mso(t){n=t}async function Met(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-sdsredre.js");return r=zfo(Cs(t).content.trimStart().replace(s,()=>n())),r}function gso(){return r}
export{dso,uso,lEt,pso,fso,mso,Met,gso};
