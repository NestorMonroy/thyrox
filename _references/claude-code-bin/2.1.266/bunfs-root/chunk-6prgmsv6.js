// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{N}from"/$bunfs/root/chunk-m3k3498d.js";import{b,f}from"/$bunfs/root/chunk-dzyeyv65.js";import{A,Jr}from"/$bunfs/root/chunk-vfrpernt.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Se}from"/$bunfs/root/chunk-qsnhycbm.js";import{ke}from"/$bunfs/root/chunk-4te7e7q8.js";import{Ga}from"/$bunfs/root/chunk-9fmxymtw.js";import{Fe}from"/$bunfs/root/chunk-f80rn6zv.js";import{Sme}from"/$bunfs/root/chunk-zapjbeg6.js";import{Ge}from"/$bunfs/root/chunk-kcxa79n8.js";import{$j}from"/$bunfs/root/chunk-jav85y4d.js";import{tge}from"/$bunfs/root/chunk-928s7kda.js";import{promises as n}from"fs";import*as g from"os";import*as o from"path";var E="com.anthropic.claude-code-url-handler",p="Claude Code URL Handler",w="claude-code-url-handler.desktop",P="Claude Code URL Handler.app",c=o.join(g.homedir(),"Applications",P),l=o.join(c,"Contents","MacOS","claude");function d(){return o.join(tge(),"applications",w)}var u=`HKEY_CURRENT_USER\\Software\\Classes\\${$j}`,h=`${u}\\shell\\open\\command`,m=86400000;function k(e){return`Exec="${e}" --handle-uri %u`}function y(e){return`"${e}" --handle-uri "%1"`}async function D(e){let r=o.join(c,"Contents");try{await n.rm(c,{recursive:!0})}catch(s){if(A(s)!=="ENOENT")throw s}await n.mkdir(o.dirname(l),{recursive:!0});let i=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${E}</string>
  <key>CFBundleName</key>
  <string>${p}</string>
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
        <string>${$j}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await n.writeFile(o.join(r,"Info.plist"),i),await n.symlink(e,l),await Fe("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",["-R",c],{useCwd:!1}),t(`Registered ${$j}:// protocol handler at ${c}`)}async function _(e){await n.mkdir(o.dirname(d()),{recursive:!0});let r=`[Desktop Entry]
Name=${p}
Comment=Handle ${$j}:// deep links for Claude Code
${k(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${$j};
`;await n.writeFile(d(),r);let i=await Ga("xdg-mime");if(i){let{code:a}=await Fe(i,["default",w,`x-scheme-handler/${$j}`],{useCwd:!1});if(a!==0)throw Object.assign(Error(`xdg-mime exited with code ${a}`),{code:"XDG_MIME_FAILED"})}t(`Registered ${$j}:// protocol handler at ${d()}`)}async function F(e){for(let r of[["add",u,"/ve","/d",`URL:${p}`,"/f"],["add",u,"/v","URL Protocol","/d","","/f"],["add",h,"/ve","/d",y(e),"/f"]]){let{code:i}=await Fe("reg",r,{useCwd:!1});if(i!==0)throw Object.assign(Error(`reg add exited with code ${i}`),{code:"REG_FAILED"})}t(`Registered ${$j}:// protocol handler in Windows registry`)}async function L(e){let r=e??await C();switch("linux"){case"darwin":await D(r);break;case"linux":await _(r);break;case"win32":await F(r);break;default:throw Error("Unsupported platform: linux")}}async function C(){let e=Sme();try{return await n.realpath(e),e}catch{return process.execPath}}async function S(e){try{switch("linux"){case"darwin":return await n.readlink(l)===e;case"linux":return(await n.readFile(d(),"utf8")).includes(k(e));case"win32":{let{stdout:r,code:i}=await Fe("reg",["query",h,"/ve"],{useCwd:!1});return i===0&&r.includes(y(e))}default:return!1}}catch{return!1}}async function Pjn(e){if(Ge().disableDeepLinkRegistration==="disable")return;if(!["darwin","linux","win32"].includes("linux"))return;let r=await C();if(await S(r))return;let i=o.join(Se(),".deep-link-register-failed");if(N()&&e!==void 0){let a=await e.stat(ke.state("deep-link-register-failed"));if(a.ok&&Date.now()-a.value.mtimeMs<m)return}else try{let a=await n.stat(i);if(Date.now()-a.mtimeMs<m)return}catch{}try{if(await L(r),b("deep_link_register"),t("Auto-registered claude-cli:// deep link protocol handler"),N()&&e!==void 0)await e.delete(ke.state("deep-link-register-failed"));else await n.rm(i,{force:!0}).catch(()=>{})}catch(a){let s=Jr(a);if(f("deep_link_register",s??"register_failed"),t(`Failed to auto-register deep link protocol handler: ${a instanceof Error?a.message:String(a)}`,{level:"warn"}),s==="EACCES"||s==="ENOSPC")if(N()&&e!==void 0)await e.write(ke.state("deep-link-register-failed"),"",{publishDiscipline:"inPlace"});else await n.writeFile(i,"").catch(()=>{})}}
export{Pjn};
