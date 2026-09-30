// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Rt}from"/$bunfs/root/chunk-31aa9k3a.js";import{ke,ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{Qe}from"/$bunfs/root/chunk-x15v86ew.js";import{stat as i}from"fs/promises";import{homedir as s}from"os";import{join as l}from"path";async function c(e,a){await ke((r)=>({...r,appleTerminalSetupInProgress:!0,appleTerminalBackupPath:e}),a)}async function iSt(e){await ke((a)=>({...a,appleTerminalSetupInProgress:!1}),e)}function u(){let e=ce();return{inProgress:e.appleTerminalSetupInProgress??!1,backupPath:e.appleTerminalBackupPath||null}}function aSt(){return l(s(),"Library","Preferences","com.apple.Terminal.plist")}async function z7r(e){let a=aSt(),r=`${a}.bak`;try{let{code:n}=await Qe("defaults",["export","com.apple.Terminal",a]);if(n!==0)return null;try{await i(a)}catch{return null}return await Qe("defaults",["export","com.apple.Terminal",r]),await c(r,e),r}catch(n){if(Rt(n))return t(`backupTerminalPreferences: fs inaccessible: ${n}`),null;return d(n),null}}async function CKt(e){let{inProgress:a,backupPath:r}=u();if(!a)return{status:"no_backup"};if(!r)return await iSt(e),{status:"no_backup"};try{await i(r)}catch{return await iSt(e),{status:"no_backup"}}let n=!1;try{let{code:o}=await Qe("defaults",["import","com.apple.Terminal",r]);if(o!==0)return{status:"failed",backupPath:r};return n=!0,await Qe("killall",["cfprefsd"]),await iSt(e),{status:"restored"}}catch(o){if(Rt(o))t(`checkAndRestoreTerminalBackup: fs inaccessible: ${o}`);else d(o);return await iSt(e),n?{status:"restored"}:{status:"failed",backupPath:r}}}
export{iSt,aSt,z7r,CKt};
