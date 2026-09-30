// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{y}from"/$bunfs/root/chunk-dpwtsz9f.js";import{X}from"/$bunfs/root/chunk-wjyya8wj.js";import{Es}from"/$bunfs/root/chunk-xdy4dwjd.js";import{Lco}from"/$bunfs/root/chunk-hyq1psdx.js";import{ntt}from"/$bunfs/root/chunk-sw8hjwvv.js";function i(t){return{arm(){X().templateLanes[t]=!0},take(){let e=X().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){X().templateLanes[t]=!0}}}var o=i("prototypeArmed");function xZr(){o.arm(),y("prototype_started",{})}function IZr(){return o.take()}function VSt(){o.giveBack()}function p(t,e){X().templateLanes.boundSlugs.set(t,e)}function PZr(t){return X().templateLanes.boundSlugs.get(t)}function OZr(t,e){p(t,"prototype"),y("prototype_publish",{artifact_slug:ntt(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function HZr(t){n=t}async function zQe(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-jcjyq8qx.js");return r=Lco(Es(t).content.trimStart().replace(s,()=>n())),r}function MZr(){return r}
export{xZr,IZr,VSt,PZr,OZr,HZr,zQe,MZr};
