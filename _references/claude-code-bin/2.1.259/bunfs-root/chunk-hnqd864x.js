// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{er,L}from"/$bunfs/root/chunk-x722nt0q.js";import{VH}from"/$bunfs/root/chunk-mzmfq60a.js";import{Ft}from"/$bunfs/root/chunk-1qpkzqbm.js";function ske(){return a.CLAUDE_CODE_DISABLE_WORKFLOWS||VH()?.settings.disableWorkflows===!0}class t{cached=void 0;resolve(){if(this.cached!==void 0)return this.cached;return this.cached=i(),this.cached}}var n=new V(()=>new t);function xc(){if(ske())return!1;if(!cwt())return!1;let{available:r,defaultOn:e}=o();if(!r)return!1;return VH()?.settings.enableWorkflows??e}function Uwn(){return o().defaultOn}function lwt(){return cwt()&&!a.CLAUDE_CODE_DISABLE_WORKFLOWS&&o().available}function LJe(){return VH()?.settings.workflowKeywordTriggerEnabled??!0}function cwt(){return Ft("allow_workflows")}function lrr(){if(ske()||!cwt())return!0;if(VH()?.settings.enableWorkflows===!1)return!0;return a.CLAUDE_CODE_WORKFLOWS===!1||!L("tengu_workflows_enabled",!0)}function o(){return n.of(z().host).resolve()}function i(){if(a.CLAUDE_CODE_WORKFLOWS===!0){let e=L("tengu_workflows_enabled",!0);return{available:e,defaultOn:e}}if(a.CLAUDE_CODE_WORKFLOWS===!1)return{available:!1,defaultOn:!1};if(!L("tengu_workflows_enabled",!0))return{available:!1,defaultOn:!1};return{available:!0,defaultOn:er()!=="pro"}}function crr(){return L("tengu_jade_compass",!0)}
export{ske,xc,Uwn,lwt,LJe,cwt,lrr,crr};
