// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ot,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";var r=new Ot(()=>({store:void 0}));function Uyr(e){return r.peek(e)?.store}function Vv(){return Uyr(W())}async function Y7t(e,o){try{return await e.save(o)}catch{return t("A result could not be saved where the model reads files",{level:"error"}),null}}
export{Uyr,Vv,Y7t};
