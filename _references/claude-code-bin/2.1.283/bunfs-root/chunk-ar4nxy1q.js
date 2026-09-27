// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{kt}from"/$bunfs/root/chunk-ern0s5ks.js";import{ke,le}from"/$bunfs/root/chunk-t6pwageh.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Qe}from"/$bunfs/root/chunk-n043szf8.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await ke((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function n_t(e){await ke((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function u(){let e=le();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function r_t(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function R8r(e){let a=r_t(),r=`${a}.bak`;try{let{code:n}=await Qe("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Qe("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(kt(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return d(n),null}}async function Q2t(e){let{inProgress:a,backupPath:r}=u();if(!a)return{status:"no_backup"};if(!r)return await n_t(e),{status:"no_backup"};try{await i(r)}catch{return await n_t(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Qe("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Qe("killall",["cfprefsd"]),await n_t(e),{status:"restored"}}catch(o){if(kt(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else d(o);return await n_t(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{n_t,r_t,R8r,Q2t};
