// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ht}from"/$bunfs/root/chunk-vqpmen5t.js";import{Ae,ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{Xe}from"/$bunfs/root/chunk-kmk230n6.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await Ae((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function iSt(e){await Ae((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function p(){let e=ce();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function aSt(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function PQr(e){let a=aSt(),r=`${a}.bak`;try{let{code:n}=await Xe("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Xe("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(Ht(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return u(n),null}}async function hKt(e){let{inProgress:a,backupPath:r}=p();if(!a)return{status:"no_backup"};if(!r)return await iSt(e),{status:"no_backup"};try{await i(r)}catch{return await iSt(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Xe("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Xe("killall",["cfprefsd"]),await iSt(e),{status:"restored"}}catch(o){if(Ht(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else u(o);return await iSt(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{iSt,aSt,PQr,hKt};
