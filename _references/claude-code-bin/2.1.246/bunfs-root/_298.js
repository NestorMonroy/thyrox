// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Lvc as b,luc as u,puc as p}from"/$bunfs/root/_668.js";import{q9c as o,s9c as P}from"/$bunfs/root/_772.js";import{Ged as c,Oed as d}from"/$bunfs/root/_816.js";import{jhd as l,ohd as k}from"/$bunfs/root/_820.js";import{nvd as s,zvd as g}from"/$bunfs/root/_831.js";import{xxd as f}from"/$bunfs/root/_837.js";import{stat as m}from"fs/promises";import{homedir as T}from"os";import{join as h}from"path";async function w(e,t){await u((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),t)}async function i(e){await u((t)=>({...t,appleTerminalSetupInProgress:!1}),e)}function y(){let e=p();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function S(){return h(T(),"Library","Preferences","com.apple.Terminal.plist")}async function A(e){let t=S(),r=`${t}.bak`;try{let{code:a}=await o("defaults",["export","com.apple.Terminal",t]);if(a!==0)return null;try{await m(t)}catch{return null}return await o("defaults",["export","com.apple.Terminal",r]),await w(r,e),r}catch(a){if(s(a))return l(`backupTerminalPreferences: fs inaccessible: ${a}`),null;return c(a),null}}async function E(e){let{inProgress:t,backupPath:r}=y();if(!t)return{status:"no_backup"};if(!r)return await i(e),{status:"no_backup"};try{await m(r)}catch{return await i(e),{status:"no_backup"}}let a=!1;try{let{code:n}=await o("defaults",["import","com.apple.Terminal",r]);if(n!==0)return{status:"failed",backupPath:r};return a=!0,await o("killall",["cfprefsd"]),await i(e),{status:"restored"}}catch(n){if(s(n))l(`checkAndRestoreTerminalBackup: fs inaccessible: ${n}`);else c(n);return await i(e),a?{status:"restored"}:{status:"failed",backupPath:r}}}var B=f(()=>{b();k();g();P();d()});
export{i as fF,S as gF,A as hF,E as iF,B as jF};
