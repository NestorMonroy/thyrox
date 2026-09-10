// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Ie as o}from"/$bunfs/root/_39.js";import{qlb as L,tlb as W}from"/$bunfs/root/_518.js";import{lUb as F,oUb as K}from"/$bunfs/root/_601.js";import{EFc as _,sGc as H}from"/$bunfs/root/_701.js";import{G0c as p,O0c as U}from"/$bunfs/root/_753.js";import{q9c as l,s9c as j}from"/$bunfs/root/_772.js";import{D_c as b,v_c as P,w_c as D}from"/$bunfs/root/_780.js";import{Xbd as E,Zbd as T}from"/$bunfs/root/_812.js";import{jhd as c,ohd as I}from"/$bunfs/root/_820.js";import{Uhd as C,nid as B}from"/$bunfs/root/_824.js";import{nud as u,pud as M}from"/$bunfs/root/_829.js";import{Nud as k,Oud as y,zvd as N}from"/$bunfs/root/_831.js";b();I();B();M();U();N();j();W();H();T();K();import{promises as a}from"fs";import*as S from"os";import*as n from"path";var Y="com.anthropic.claude-code-url-handler",w="Claude Code URL Handler",x="claude-code-url-handler.desktop",G="Claude Code URL Handler.app",d=n.join(S.homedir(),"Applications",G),f=n.join(d,"Contents","MacOS","claude");function m(){return n.join(F(),"applications",x)}var g=`HKEY_CURRENT_USER\\Software\\Classes\\${o}`,v=`${g}\\shell\\open\\command`,h=86400000;function A(e){return`Exec="${e}" --handle-uri %u`}function R(e){return`"${e}" --handle-uri "%1"`}async function X(e){let t=n.join(d,"Contents");try{await a.rm(d,{recursive:!0})}catch(s){if(k(s)!=="ENOENT")throw s}await a.mkdir(n.dirname(f),{recursive:!0});let r=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${Y}</string>
  <key>CFBundleName</key>
  <string>${w}</string>
  <key>CFBundleExecutable</key>
  <string>claude</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Claude Code Deep Link</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${o}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await a.writeFile(n.join(t,"Info.plist"),r),await a.symlink(e,f),await l("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",["-R",d],{useCwd:!1}),c(`Registered ${o}:// protocol handler at ${d}`)}async function q(e){await a.mkdir(n.dirname(m()),{recursive:!0});let t=`[Desktop Entry]
Name=${w}
Comment=Handle ${o}:// deep links for Claude Code
${A(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${o};
`;await a.writeFile(m(),t);let r=await E("xdg-mime");if(r){let{code:i}=await l(r,["default",x,`x-scheme-handler/${o}`],{useCwd:!1});if(i!==0)throw Object.assign(Error(`xdg-mime exited with code ${i}`),{code:"XDG_MIME_FAILED"})}c(`Registered ${o}:// protocol handler at ${m()}`)}async function z(e){for(let t of[["add",g,"/ve","/d",`URL:${w}`,"/f"],["add",g,"/v","URL Protocol","/d","","/f"],["add",v,"/ve","/d",R(e),"/f"]]){let{code:r}=await l("reg",t,{useCwd:!1});if(r!==0)throw Object.assign(Error(`reg add exited with code ${r}`),{code:"REG_FAILED"})}c(`Registered ${o}:// protocol handler in Windows registry`)}async function J(e){let t=e??await O();switch("linux"){case"darwin":await X(t);break;case"linux":await q(t);break;case"win32":await z(t);break;default:throw Error("Unsupported platform: linux")}}async function O(){let e=L();try{return await a.realpath(e),e}catch{return process.execPath}}async function Q(e){try{switch("linux"){case"darwin":return await a.readlink(f)===e;case"linux":return(await a.readFile(m(),"utf8")).includes(A(e));case"win32":{let{stdout:t,code:r}=await l("reg",["query",v,"/ve"],{useCwd:!1});return r===0&&t.includes(R(e))}default:return!1}}catch{return!1}}async function pe(e){if(_().disableDeepLinkRegistration==="disable")return;if(!["darwin","linux","win32"].includes("linux"))return;let t=await O();if(await Q(t))return;let r=n.join(C(),".deep-link-register-failed");if(u()&&e!==void 0){let i=await e.stat(p.state("deep-link-register-failed"));if(i.ok&&Date.now()-i.value.mtimeMs<h)return}else try{let i=await a.stat(r);if(Date.now()-i.mtimeMs<h)return}catch{}try{if(await J(t),P("deep_link_register"),c("Auto-registered claude-cli:// deep link protocol handler"),u()&&e!==void 0)await e.delete(p.state("deep-link-register-failed"));else await a.rm(r,{force:!0}).catch(()=>{})}catch(i){let s=y(i);if(D("deep_link_register",s??"register_failed"),c(`Failed to auto-register deep link protocol handler: ${i instanceof Error?i.message:String(i)}`,{level:"warn"}),s==="EACCES"||s==="ENOSPC")if(u()&&e!==void 0)await e.write(p.state("deep-link-register-failed"),"",{publishDiscipline:"inPlace"});else await a.writeFile(r,"").catch(()=>{})}}
export{Y as Ge,pe as He};
