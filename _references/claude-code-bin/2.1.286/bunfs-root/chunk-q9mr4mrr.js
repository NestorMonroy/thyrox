// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_,c}from"/$bunfs/root/chunk-dwaez71m.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{Jve,HZ,rz,MMn,HMn}from"/$bunfs/root/chunk-jqjq5sjh.js";var Yve={accepted:"Allowed",declined:"Not allowed",unset:"Not asked yet"},t="Turned off by your organization's settings (remoteTools.allowUnattendedServing)",o="Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";function CAt(){return MMn()==="user"?o:t}function hXt(e){return HZ()!=="unset"||HMn()||e}function yXt(){return HZ()==="accepted"||HMn()}async function _Xt(e){if(e==="accepted"&&rz())return"forbidden";let n=e==="accepted"?"accepted":HZ()==="accepted"?"revoked":"declined";if(!await Jve(e))return"not_saved";return i("tengu_served_unattended_consent",{action:c(n),surface:_("cli")}),"saved"}
export{Yve,CAt,hXt,yXt,_Xt};
