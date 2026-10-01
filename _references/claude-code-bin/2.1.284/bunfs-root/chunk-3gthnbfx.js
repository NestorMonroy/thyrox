// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{_}from"/$bunfs/root/chunk-q5gkv7dz.js";import{ee}from"/$bunfs/root/chunk-fhmcdk9y.js";import{As}from"/$bunfs/root/chunk-9y4t39ay.js";import{zco}from"/$bunfs/root/chunk-eszw8nph.js";import{ptt}from"/$bunfs/root/chunk-cwdrf18k.js";function i(t){return{arm(){ee().templateLanes[t]=!0},take(){let e=ee().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){ee().templateLanes[t]=!0}}}var o=i("prototypeArmed");function beo(){o.arm(),_("prototype_started",{})}function Seo(){return o.take()}function iwt(){o.giveBack()}function p(t,e){ee().templateLanes.boundSlugs.set(t,e)}function weo(t){return ee().templateLanes.boundSlugs.get(t)}function veo(t,e){p(t,"prototype"),_("prototype_publish",{artifact_slug:ptt(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function Eeo(t){n=t}async function JQe(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-q5rtg2j7.js");return r=zco(As(t).content.trimStart().replace(s,()=>n())),r}function keo(){return r}
export{beo,Seo,iwt,weo,veo,Eeo,JQe,keo};
