// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,G}from"/$bunfs/root/chunk-ja309z9r.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{AsyncLocalStorage as t}from"async_hooks";class Lhn{#o=!1;#s=!1;get backgroundTasksDisabled(){return this.#o}get unsandboxedCommandsDisabled(){return this.#s}disableBackgroundTasks(){this.#o=!0}disableUnsandboxedCommands(){this.#s=!0}}var r=new W(()=>new Lhn);function wY(){return o.getStore()??r.of(G().host)}var o=new t;function Ijr(s,e){return o.run(s,e)}function cc(){return wY().backgroundTasksDisabled||a.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS}var Vzt="Background tasks are disabled in this session.";
export{Lhn,wY,Ijr,cc,Vzt};
