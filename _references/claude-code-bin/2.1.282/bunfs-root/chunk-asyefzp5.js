// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{y}from"/$bunfs/root/chunk-fq30rq8e.js";import{ee}from"/$bunfs/root/chunk-7kzh6g5g.js";import{as}from"/$bunfs/root/chunk-0aca0z3e.js";import{HJr}from"/$bunfs/root/chunk-rss9zfts.js";import{XJe}from"/$bunfs/root/chunk-mp1gknps.js";function i(t){return{arm(){ee().templateLanes[t]=!0},take(){let e=ee().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){ee().templateLanes[t]=!0}}}var o=i("prototypeArmed");function CVr(){o.arm(),y("prototype_started",{})}function RVr(){return o.take()}function vmt(){o.giveBack()}function p(t,e){ee().templateLanes.boundSlugs.set(t,e)}function xVr(t){return ee().templateLanes.boundSlugs.get(t)}function IVr(t,e){p(t,"prototype"),y("prototype_publish",{artifact_slug:XJe(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function PVr(t){n=t}async function G8e(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-zba06cx2.js");return r=HJr(as(t).content.trimStart().replace(s,()=>n())),r}function HVr(){return r}
export{CVr,RVr,vmt,xVr,IVr,PVr,G8e,HVr};
