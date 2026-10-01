// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{_,c}from"/$bunfs/root/chunk-aap6zsd0.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{ove,sve,N8,QIn,ZIn}from"/$bunfs/root/chunk-dpzpwh3c.js";var nve={accepted:"Allowed",declined:"Not allowed",unset:"Not asked yet"},t="Turned off by your organization's settings (remoteTools.allowUnattendedServing)",o="Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";function Rkt(){return QIn()==="user"?o:t}function YYt(e){return sve()!=="unset"||ZIn()||e}function XYt(){return sve()==="accepted"||ZIn()}async function JYt(e){if(e==="accepted"&&N8())return"forbidden";let n=e==="accepted"?"accepted":sve()==="accepted"?"revoked":"declined";if(!await ove(e))return"not_saved";return i("tengu_served_unattended_consent",{action:c(n),surface:_("cli")}),"saved"}
export{nve,Rkt,YYt,XYt,JYt};
