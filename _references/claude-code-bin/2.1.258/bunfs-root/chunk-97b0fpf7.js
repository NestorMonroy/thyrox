// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Q}from"/$bunfs/root/chunk-b1z7jvb2.js";import{v7,Cve,Ioe,Ive,Rve}from"/$bunfs/root/chunk-jqwc618h.js";import{Rz,K_,bC,Que}from"/$bunfs/root/chunk-vw215j9f.js";import{Tre}from"/$bunfs/root/chunk-rp3kh7w9.js";import{gpe}from"/$bunfs/root/chunk-29fd2a8x.js";import{nR}from"/$bunfs/root/chunk-5qtwk945.js";function K2e(o,s,t){nR("conversation_reset"),bC("conversation_reset"),K_(Rz),Ive(),Ioe(),v7(),Rve(),Cve(),gpe();let e=Q();for(let r of Tre(o.sessionHooksRegistry,e))o.sessionHooksRegistry.remove(e,"Stop",r);t(),Que(),o.applyMessageOp({type:"replace-all",messages:s})}
export{K2e};
