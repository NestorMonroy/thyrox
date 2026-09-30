// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{_}from"/$bunfs/root/chunk-epe8zpsz.js";import{Q}from"/$bunfs/root/chunk-srde070v.js";import{Ko}from"/$bunfs/root/chunk-w65mzm64.js";import{yTr}from"/$bunfs/root/chunk-rpmm118j.js";import{XGe}from"/$bunfs/root/chunk-991sqjbb.js";function i(t){return{arm(){Q().templateLanes[t]=!0},take(){let e=Q().templateLanes,a=e[t];return e[t]=!1,a},giveBack(){Q().templateLanes[t]=!0}}}var o=i("prototypeArmed");function nSr(){o.arm(),_("prototype_started",{})}function rSr(){return o.take()}function jnt(){o.giveBack()}function p(t,e){Q().templateLanes.boundSlugs.set(t,e)}function oSr(t){return Q().templateLanes.boundSlugs.get(t)}function sSr(t,e){p(t,"prototype"),_("prototype_publish",{artifact_slug:XGe(t),is_first_publish:e})}var s="<!-- dataviz-callout -->",n=()=>"",r;function iSr(t){n=t}async function IWe(){let{SKILL_MD:t}=await import("/$bunfs/root/chunk-zq8f7a3a.js");return r=yTr(Ko(t).content.trimStart().replace(s,()=>n())),r}function aSr(){return r}
export{nSr,rSr,jnt,oSr,sSr,iSr,IWe,aSr};
