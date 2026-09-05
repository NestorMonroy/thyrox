// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{A$b as y,s$b as c,t$b as i}from"/$bunfs/root/_667.js";import{Lvc as v,muc as _,puc as s}from"/$bunfs/root/_668.js";import{QGc as l,VGc as E}from"/$bunfs/root/_704.js";import{nMc as S,sMc as w}from"/$bunfs/root/_709.js";import{D_c as b,v_c as f,w_c as g,x_c as p}from"/$bunfs/root/_780.js";import{Pcd as r,Rcd as h}from"/$bunfs/root/_814.js";import{$nd as a,atd as R}from"/$bunfs/root/_826.js";import{fwd as n,nwd as H}from"/$bunfs/root/_833.js";import{xxd as M}from"/$bunfs/root/_837.js";function m(e){return S.includes(e)?e:void 0}function C(){if(!i())return"unspecified";return T()??"unspecified"}function T(){return m(s().remoteHomeSettingsMode)}async function N(e,t){if(e==="forward"&&!await c())return g("remote_home_settings_mode","flag_off"),"refused";let o={previous:"unspecified"},d=await _((u)=>(o.previous=m(u.remoteHomeSettingsMode)??"unspecified",{...u,remoteHomeSettingsMode:e}),t);if(o.previous!==e)r("tengu_home_settings_mode_set",{mode:n(e),previous:n(o.previous),persisted:d});if(!d)return p("remote_home_settings_mode","unconfirmed"),"unconfirmed";return f("remote_home_settings_mode"),"written"}function W(e){return e.settingsToCloudEnabled&&e.launchMayForward&&(e.hostConsent??C())==="forward"}function j(e){if(!i())return!1;let t=k(e);if(t!==null)return r("tengu_home_settings_mode_prompt_skipped",{reason:n(t)}),!1;return!0}function k({staysAttached:e,launchMayForward:t,hostConsent:o}){if(a())return"non_interactive";if(!e)return"not_attached";if(!t)return"launch_flag";if(o!=null)return"host";if(!l().includes("userSettings"))return"user_settings_disabled";if(m(s().remoteHomeSettingsMode)!==void 0)return"answered";return null}var x=M(()=>{R();v();w();E();y();b();h();H()});
export{C as G2a,T as H2a,N as I2a,W as J2a,j as K2a,x as L2a};
