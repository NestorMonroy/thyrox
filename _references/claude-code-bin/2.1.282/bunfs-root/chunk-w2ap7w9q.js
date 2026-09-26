// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Ht}from"/$bunfs/root/chunk-dw9y6h6j.js";import{ke,le}from"/$bunfs/root/chunk-wbbthbh9.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{Ye}from"/$bunfs/root/chunk-a23hx12j.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await ke((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function Ngt(e){await ke((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function p(){let e=le();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function $gt(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function HKr(e){let a=$gt(),r=`${a}.bak`;try{let{code:n}=await Ye("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Ye("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(Ht(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return u(n),null}}async function ozt(e){let{inProgress:a,backupPath:r}=p();if(!a)return{status:"no_backup"};if(!r)return await Ngt(e),{status:"no_backup"};try{await i(r)}catch{return await Ngt(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Ye("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Ye("killall",["cfprefsd"]),await Ngt(e),{status:"restored"}}catch(o){if(Ht(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else u(o);return await Ngt(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{Ngt,$gt,HKr,ozt};
