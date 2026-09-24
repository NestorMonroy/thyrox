// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ht}from"/$bunfs/root/chunk-2bj5eqbj.js";import{ke,le}from"/$bunfs/root/chunk-5khn4tvf.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{Ye}from"/$bunfs/root/chunk-kvqsg7vn.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await ke((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function zft(e){await ke((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function p(){let e=le();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function Vft(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function F2r(e){let a=Vft(),r=`${a}.bak`;try{let{code:n}=await Ye("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Ye("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(Ht(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return u(n),null}}async function u1t(e){let{inProgress:a,backupPath:r}=p();if(!a)return{status:"no_backup"};if(!r)return await zft(e),{status:"no_backup"};try{await i(r)}catch{return await zft(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Ye("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Ye("killall",["cfprefsd"]),await zft(e),{status:"restored"}}catch(o){if(Ht(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else u(o);return await zft(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{zft,Vft,F2r,u1t};
