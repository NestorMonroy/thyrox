// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Dt}from"/$bunfs/root/chunk-d5d0zdsy.js";import{ke,ie}from"/$bunfs/root/chunk-xbd48fav.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{Ke}from"/$bunfs/root/chunk-rawgb24z.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await ke((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function vrt(e){await ke((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function u(){let e=ie();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function Ert(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function fwr(e){let a=Ert(),r=`${a}.bak`;try{let{code:n}=await Ke("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Ke("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(Dt(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return d(n),null}}async function yIt(e){let{inProgress:a,backupPath:r}=u();if(!a)return{status:"no_backup"};if(!r)return await vrt(e),{status:"no_backup"};try{await i(r)}catch{return await vrt(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Ke("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Ke("killall",["cfprefsd"]),await vrt(e),{status:"restored"}}catch(o){if(Dt(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else d(o);return await vrt(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{vrt,Ert,fwr,yIt};
