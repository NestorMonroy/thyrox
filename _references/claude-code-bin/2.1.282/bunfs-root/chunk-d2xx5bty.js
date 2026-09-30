// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Mt,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";var r=new Mt(()=>({store:void 0}));function Bwr(e){return r.peek(e)?.store}function nE(){return Bwr(W())}async function Wen(e,o){try{return await e.save(o)}catch{return t("A result could not be saved where the model reads files",{level:"error"}),null}}
export{Bwr,nE,Wen};
