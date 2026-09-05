// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{tr,L}from"/$bunfs/root/chunk-8qt7d28b.js";import{$H}from"/$bunfs/root/chunk-64kpb0yv.js";import{Nt}from"/$bunfs/root/chunk-5t2y5d74.js";function BAe(){return a.CLAUDE_CODE_DISABLE_WORKFLOWS||$H()?.settings.disableWorkflows===!0}class t{cached=void 0;resolve(){if(this.cached!==void 0)return this.cached;return this.cached=i(),this.cached}}var n=new Y(()=>new t);function Ac(){if(BAe())return!1;if(!sSt())return!1;let{available:r,defaultOn:e}=o();if(!r)return!1;return $H()?.settings.enableWorkflows??e}function Mbn(){return o().defaultOn}function iSt(){return sSt()&&!a.CLAUDE_CODE_DISABLE_WORKFLOWS&&o().available}function WYe(){return $H()?.settings.workflowKeywordTriggerEnabled??!0}function sSt(){return Nt("allow_workflows")}function gZn(){if(BAe()||!sSt())return!0;if($H()?.settings.enableWorkflows===!1)return!0;return a.CLAUDE_CODE_WORKFLOWS===!1||!L("tengu_workflows_enabled",!0)}function o(){return n.of(W().host).resolve()}function i(){if(a.CLAUDE_CODE_WORKFLOWS===!0){let e=L("tengu_workflows_enabled",!0);return{available:e,defaultOn:e}}if(a.CLAUDE_CODE_WORKFLOWS===!1)return{available:!1,defaultOn:!1};if(!L("tengu_workflows_enabled",!0))return{available:!1,defaultOn:!1};return{available:!0,defaultOn:tr()!=="pro"}}function hZn(){return L("tengu_jade_compass",!0)}
export{BAe,Ac,Mbn,iSt,WYe,sSt,gZn,hZn};
