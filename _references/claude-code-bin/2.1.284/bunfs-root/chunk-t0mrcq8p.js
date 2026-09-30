// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{y,c}from"/$bunfs/root/chunk-czwr6846.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{ave,lve,P8,xIn,PIn}from"/$bunfs/root/chunk-t01k7v1v.js";var sve={accepted:"Allowed",declined:"Not allowed",unset:"Not asked yet"},t="Turned off by your organization's settings (remoteTools.allowUnattendedServing)",o="Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";function Ykt(){return xIn()==="user"?o:t}function z8t(e){return lve()!=="unset"||PIn()||e}function V8t(){return lve()==="accepted"||PIn()}async function q8t(e){if(e==="accepted"&&P8())return"forbidden";let n=e==="accepted"?"accepted":lve()==="accepted"?"revoked":"declined";if(!await ave(e))return"not_saved";return i("tengu_served_unattended_consent",{action:c(n),surface:y("cli")}),"saved"}
export{sve,Ykt,z8t,V8t,q8t};
