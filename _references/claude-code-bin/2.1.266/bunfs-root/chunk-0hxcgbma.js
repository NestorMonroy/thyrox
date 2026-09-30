// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{b}from"/$bunfs/root/chunk-dzyeyv65.js";import{ee}from"/$bunfs/root/chunk-jxxmkk37.js";import{fOe}from"/$bunfs/root/chunk-1syb6ky7.js";function n(t){return{arm(){ee().templateLanes[t]=!0},take(){let o=ee().templateLanes,r=o[t];return o[t]=!1,r},giveBack(){ee().templateLanes[t]=!0}}}var e=n("prototypeArmed"),a=n("controlPlaneArmed");function yqn(){e.arm(),b("prototype_started",{})}function _qn(){return e.take()}function D4e(){e.giveBack()}function l(t,o){ee().templateLanes.boundSlugs.set(t,o)}function bqn(t){return ee().templateLanes.boundSlugs.get(t)}function Sqn(t,o){l(t,"prototype"),b("prototype_publish",{artifact_slug:fOe(t),is_first_publish:o})}function L4e(){a.giveBack()}
export{yqn,_qn,D4e,bqn,Sqn,L4e};
