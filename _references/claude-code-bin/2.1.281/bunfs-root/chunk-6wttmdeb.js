// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{y}from"/$bunfs/root/chunk-2pwc1ycq.js";import{ee}from"/$bunfs/root/chunk-v8ayv6rk.js";import{Zo}from"/$bunfs/root/chunk-wc16b5wk.js";import{R4r}from"/$bunfs/root/chunk-9fe4b1kg.js";import{v9e}from"/$bunfs/root/chunk-xs677pz7.js";function i(t){return{arm(){ee().templateLanes[t]=!0},take(){let e=ee().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){ee().templateLanes[t]=!0}}}var o=i("prototypeArmed");function Ujr(){o.arm(),y("prototype_started",{})}function Bjr(){return o.take()}function xpt(){o.giveBack()}function p(t,e){ee().templateLanes.boundSlugs.set(t,e)}function jjr(t){return ee().templateLanes.boundSlugs.get(t)}function Wjr(t,e){p(t,"prototype"),y("prototype_publish",{artifact_slug:v9e(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function Gjr(t){n=t}async function mYe(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-0k3vhfjj.js");return r=R4r(Zo(t).content.trimStart().replace(s,()=>n())),r}function zjr(){return r}
export{Ujr,Bjr,xpt,jjr,Wjr,Gjr,mYe,zjr};
