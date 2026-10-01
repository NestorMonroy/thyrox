// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{AsyncLocalStorage as t}from"async_hooks";class ZKn{#o=!1;#s=!1;#e=!1;get backgroundTasksDisabled(){return this.#o}get unsandboxedCommandsDisabled(){return this.#s}get backgroundDeadlineDisabled(){return this.#e}disableBackgroundTasks(){this.#o=!0}disableBackgroundDeadline(){this.#e=!0}disableUnsandboxedCommands(){this.#s=!0}}var r=new q(()=>new ZKn);function LH(){return o.getStore()??r.of(j().host)}var o=new t;function e0o(s,e){return o.run(s,e)}
export{ZKn,LH,e0o};
