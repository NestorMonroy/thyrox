// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ye,ct,F0,x}from"/$bunfs/root/chunk-3btyksgt.js";import{b,ge}from"/$bunfs/root/chunk-64dkx51v.js";import{Dt}from"/$bunfs/root/chunk-akpzg2yh.js";import{J,t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{qm,Ue,nt,Vr,Gt,byt,xn,I}from"/$bunfs/root/chunk-27bj2wbx.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{te}from"/$bunfs/root/chunk-1mz51xz6.js";import{hP}from"/$bunfs/root/chunk-deawgr1z.js";import{OH,Sgt,Lt}from"/$bunfs/root/chunk-gx4tznbd.js";import{Vi,Cme}from"/$bunfs/root/chunk-hfkkcqwq.js";import{hi,vF}from"/$bunfs/root/chunk-xvt6q4jb.js";import{tt,Usn,wLt,dve,kin,us,ZD,aB,jve,lH,bln,ype,BKe,jKe,zKe,WKe,dQ,nl,Hr}from"/$bunfs/root/chunk-ayyj05ne.js";import{oo,xf}from"/$bunfs/root/chunk-n51f9mcf.js";import{Rj,$ee,y1,tXe}from"/$bunfs/root/chunk-8m2vm0bk.js";import{rj,oj}from"/$bunfs/root/chunk-jc407an0.js";import{dLe}from"/$bunfs/root/chunk-wrt6m0qp.js";import{lT}from"/$bunfs/root/chunk-z9wsanj8.js";import{be}from"/$bunfs/root/chunk-hyjn4arn.js";import{z}from"/$bunfs/root/chunk-48qhkc6m.js";import*as me from"vm";var O="McpToolError";class N extends Error{toolName;error;detailJson;constructor(e,n){super(n);this.name=O,this.toolName=e,this.error=n;let r,c=n.trim();if(c.startsWith("{")||c.startsWith("["))try{let u=J(c);if(u!==null&&typeof u==="object")r=c}catch{}this.detailJson=r}}function Tot(){return I("tengu_repl_mcp_error_throw",!0)}import{types as _e}from"util";var D;function Te(){if(D)return D;return D=new Bun.Transpiler({loader:"js",replMode:!0}),D}function lZt(e){let n=Te(),r=n.transformSync(e);return Se(n,e),r}var Re={"import-statement":"import","dynamic-import":"import","require-call":"require"};function Se(e,n){let r;try{r=e.scanImports(n.replace(/^#!.*\n?/,""))}catch{return}for(let{kind:c}of r){let u=Re[c];if(!u)continue;throw Error(`Module loading (${u}) is not available in REPL \u2014 the vm context is sealed. `+"Use the tool globals instead: await Read({file_path: '...'}), await Glob({pattern: '...'}), the registered shell tool, etc.")}}function cZt(e){if(e===null||typeof e!=="object")return e;if(_e.isProxy(e))return e;let n=Object.getOwnPropertyDescriptor(e,"value");return n&&"value"in n?n.value:e}function ne(e,n){return`[${e.length} base64 chars \u2014 ${n} bytes moved to the REPL result, subject to its per-result ${n} cap]`}function Cot(e,n){if(e!==nt||n===null||typeof n!=="object"||!("type"in n))return n;if((n.type==="image"||n.type==="pdf")&&"file"in n&&typeof n.file==="object"&&n.file!==null&&"base64"in n.file&&typeof n.file.base64==="string"&&n.file.base64.length>0){if(n.type==="image"&&!(("type"in n.file)&&typeof n.file.type==="string"))return n;return{...n,file:{...n.file,base64:ne(n.file.base64,n.type==="pdf"?"document":"image")}}}if(n.type==="parts"&&"pages"in n&&Array.isArray(n.pages)&&n.pages.some(uZt))return{...n,pages:n.pages.map((r)=>uZt(r)?{...r,base64:ne(r.base64,"image")}:r)};return n}function uZt(e){return typeof e==="object"&&e!==null&&"base64"in e&&typeof e.base64==="string"&&e.base64.length>0&&"mediaType"in e&&typeof e.mediaType==="string"}import{isAbsolute as Oe,resolve as Ae}from"path";import{types as le}from"util";import*as L from"vm";import{randomUUID as Ee}from"crypto";function B(e,n,r){function c(g,y){return async(f,l)=>{let p=`repl_${Ee()}`,s={prompt:typeof f==="string"?f.slice(0,200):`<non-string ${typeof f}>`};r?.({type:"progress",toolUseID:p,data:{type:"repl_tool_call",toolName:g,toolInput:s,toolUseId:p,phase:"start"}});try{if(typeof f!=="string")throw Error(`${g}: prompt must be a string`);let a;if(l!==void 0){let h;try{h=J(e(l))}catch{throw Error(`${g}: schema must be JSON-serializable`)}if(h===null||typeof h!=="object"||Array.isArray(h))throw Error(`${g}: schema must be an object`);a=W(h)}let o=await dQ({systemPrompt:us([]),userPrompt:f,outputFormat:a?{type:"json_schema",schema:a}:void 0,signal:n.abortController.signal,options:{model:y(),querySource:"repl_sampling",agents:[],isNonInteractiveSession:n.options.isNonInteractiveSession,hasAppendSystemPrompt:!1,mcpTools:[],agentContext:n.agentContext,proactivityLevel:OH(n),credentials:n.credentials}}),m=Hr(o.message.content);if(o.isApiErrorMessage||ZD(m))throw Error(m);let k=a?J(hP(m)):m;return r?.({type:"progress",toolUseID:p,data:{type:"repl_tool_call",toolName:g,toolInput:s,toolUseId:p,phase:"complete",result:k}}),k}catch(a){let o=a instanceof Error?a.message:String(a);throw r?.({type:"progress",toolUseID:p,data:{type:"repl_tool_call",toolName:g,toolInput:s,toolUseId:p,phase:"error",error:o}}),a}}}let u=c("haiku",qm);return{haiku:u,opus:u,sonnet:u,fable:u}}function W(e){if(e===null||typeof e!=="object")return e;if(Array.isArray(e))return e.map(W);let n=e,r={};for(let c of Object.keys(n))r[c]=W(n[c]);if(r.type==="object"&&!("additionalProperties"in r))r.additionalProperties=!1;return r}import{randomUUID as ve}from"crypto";var Me=new Set(["Read","Write","Edit","Glob","Grep","NotebookEdit","TodoWrite","TaskCreate","TaskGet","TaskList","TaskStop","TaskUpdate"]);function re(e,n){let r=e.timeout;return typeof r==="number"&&r>0?r:n}function oe(e,n){if(e.name===Ue||e.name===Gt)return re(n,dve());if(e.name===vF)return re(n,30000);if(Me.has(e.name))return 1e4;return}function ae(e,n){return{error:n}}var U="repl-inner-call";function G(e,n,r,c,u,g){let y=(s)=>{if(g!==void 0){g(s);return}Sgt(s,n.abortController.signal.aborted,d)},f={},l=[],p=[...n.options.tools,...e];for(let s of e)f[s.name]=Pe(s,n,r,c,l,p,y,u);return f}function Pe(e,n,r,c,u,g,y,f){let l=async(p,s)=>{let a=s?.toolUseID??`repl_${ve()}`,o=e.isMcp===!0&&Tot(),m=(_)=>{if(u.push({id:a,name:e.name,input:p}),f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:p,toolUseId:a,phase:"error",error:_}}),o)throw i("tengu_repl_mcp_error_thrown",{toolName:byt(e.name)?xn(e.name):b("mcp_tool"),preExecution:!0}),new N(e.name,_);return ae(e.name,_)},k=(_,S)=>f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:_,toolUseId:a,phase:"executing",nativeTimeoutMs:S}});f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:p,toolUseId:a,phase:"start"}});let h=p,E;try{let _=e.inputSchema.safeParse(p);if(!_.success){let w=lH(e.name,_.error),R=e.validationErrorSteer?.(p,_.error);if(R)w=`${R}

${w}`;return m(w)}let S=_.data,v=WKe(e,n,S);if(v.denyMessage)return i("tengu_tool_use_isolation_latch_denied",{toolName:xn(e.name),toolUseID:be(a),isMcp:e.isMcp??!1,isolationLatch:ge(v.activeLatch),isolationClassifiedAs:ge(v.classifiedAs),replInnerCall:!0}),m(v.denyMessage);let P=S,Y,K;if(oo()&&!n.abortController.signal.aborted)await xf();let Q={...n,options:{...n.options,tools:g},messages:[...n.messages,...u.map((w)=>nl({content:[{type:"tool_use",id:w.id,name:w.name,input:w.input}],isVirtual:!0}))]},A=await Usn(e,S,n);if(A.where==="refused")return m(A.message);if(A.where==="elsewhere"){if(A.route.kind==="remote")k(S,void 0);rj("tool_exec",U);let w;try{w=await A.hosts.runReplCall({tool:e,route:A.route,rawInput:S,toolUseContext:Q,canUseTool:r,parentMessage:c,toolUseId:a})}finally{oj("tool_exec",U)}if(w.kind==="error")return m(w.message);return u.push({id:a,name:e.name,input:S}),f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:S,toolUseId:a,phase:"complete",result:w.value}}),w.value}S=A.input,P=S;for await(let w of zKe(n,e,S,a,c.message.id,c.requestId,void 0,void 0)){if(w.type==="hookPermissionResult")Y=w.hookPermissionResult;if(w.type==="hookUpdatedInput")P=w.updatedInput;if(w.type==="stopReason")K=w.stopReason;if(w.type==="stop")return m(w.stopReason??K??"Blocked by PreToolUse hook")}let X=await jKe(Y,e,P,Q,r,c,a),j=X.decision;if(P=X.input,j.behavior!=="allow"){if(oo()&&!n.abortController.signal.aborted)await xf();n.onPermissionDenial?.(e,a,P);let w=j.behavior==="deny"?j.message??"Permission denied":"Permission denied";return m(`Permission denied for ${e.name}: ${w}`)}if(h=j.updatedInput??P,e.name===Ue&&h&&typeof h==="object"&&"_simulatedSedEdit"in h){let{_simulatedSedEdit:w,...R}=h;h=R}let Z=oe(e,h);if(k(h,Z),i("tengu_repl_inner_executing",{toolName:xn(e.name),nativeTimeoutMs:Z,isMcp:e.isMcp??!1}),oo()&&!n.abortController.signal.aborted)await xf();if(wLt(e)&&Cme(h).requested!==void 0)return m(kin);E=Date.now(),rj("tool_exec",U);let M;try{M=await e.call(h,{...n,toolUseId:a,innerCall:!0,fileReadingLimits:{maxTokens:1/0,maxSizeBytes:268435456}},r,c,void 0,{userModified:j.userModified??!1,globLimits:{maxResults:25000}})}finally{oj("tool_exec",U)}if(o&&M.data===void 0&&n.abortController.signal.aborted)throw new Ye;if(o&&M.urlElicitationDeclined){let w=typeof M.data==="string"&&M.data.length>0?M.data:`URL elicitation was declined; the tool "${e.name}" could not complete.`;throw new x(`${w} Required URL: ${M.urlElicitationDeclined.url}`,"REPL MCP URL elicitation declined")}let we=Date.now()-E;k(h,void 0);let ee=!1;for await(let w of ype(n,e,a,c.message.id,h,M.data,c.requestId,void 0,void 0,we))if(ee=!0,"updatedToolOutput"in w&&e.outputSchema?.safeParse(w.updatedToolOutput)?.success!==!1){let R=w.updatedToolOutput;if(e.restoreTransientForRemap)try{R=e.restoreTransientForRemap(M.data,R)}catch(ke){d(ke),R=w.updatedToolOutput}M.data=R}if(ee)await bln(e.name,a,h,n.readFileState);y(M);let V=M.data;if(e.isMcp&&Array.isArray(M.data)){let w=M.data.filter((R)=>R!=null&&typeof R==="object"&&("type"in R)&&R.type==="text"&&("text"in R)&&typeof R.text==="string").map((R)=>R.text);if(w.length===M.data.length&&w.length>0){let R=w.join(`
`);try{V=J(R)}catch{V=R}}}return u.push({id:a,name:e.name,input:h}),f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:h,toolUseId:a,phase:"complete",result:V}}),Cot(e.name,V)}catch(_){if(_ instanceof N)throw _;let S=jve(_),v=ct(_);if(E!==void 0)k(h,void 0);for await(let P of BKe(n,e,a,c.message.id,h,S,v,c.requestId,void 0,void 0,E!==void 0?Date.now()-E:void 0));if(f?.({type:"progress",toolUseID:a,data:{type:"repl_tool_call",toolName:e.name,toolInput:h,toolUseId:a,phase:"error",error:S}}),e.name===Ue&&_ instanceof F0&&_.hadSandboxViolation&&p?.dangerouslyDisableSandbox!==!0&&aB(p)===void 0&&tt.isSandboxingEnabled()&&tt.areUnsandboxedCommandsAllowed())return t("REPL Bash sandbox violation \u2014 auto-retrying unsandboxed"),l({...p,dangerouslyDisableSandbox:!0,...!1},{toolUseID:a});if(u.push({id:a,name:e.name,input:h}),y(_),o)throw i("tengu_repl_mcp_error_thrown",{toolName:byt(e.name)?xn(e.name):b("mcp_tool"),preExecution:E===void 0,isInterrupt:v}),new N(e.name,S);return ae(e.name,S)}};return l}var Ne=/^[a-zA-Z0-9_-]{1,111}$/,ue=["sh","cat","rg","rgf","gl","put","gh","chdir","log","str","o","REPO"],se=52428800;function Ie(e){let n=[],r=[],c=0;function u(y,f){if(c>=se)return;if(c+=f.length,y.push(f),c>=se)y.push("[console output truncated at 50MB]")}function g(y){return y.map((f)=>{if(typeof f==="string")return f;try{return e.stringify(f,null,2)}catch{return e.toStr(f)}}).join(" ")}return{log:(...y)=>u(n,g(y)),info:(...y)=>u(n,g(y)),debug:(...y)=>u(n,g(y)),error:(...y)=>u(r,g(y)),warn:(...y)=>u(r,g(y)),getStdout:()=>n.join(`
`),getStderr:()=>r.join(`
`),clear:()=>{n.length=0,r.length=0,c=0}}}var ce=new WeakSet;class F extends x{key;constructor(e){super(`REPL sandbox code made the global '${e}' non-configurable; the host cannot restore it`,"REPL sandbox pinned a managed global non-configurable");this.name="VMContextPoisonedError",this.key=e,ce.add(this)}}function qPt(e){return typeof e==="object"&&e!==null&&ce.has(e)}function T(e,n,r){try{Object.defineProperty(e,n,{value:r,writable:!0,enumerable:!0,configurable:!0})}catch{throw new F(n)}}var Le=["console","setTimeout","clearTimeout","setInterval","clearInterval","atob","btoa","shQuote","registerTool","unregisterTool","listTools","getTool"];function pe(e){let n=new Set([...Le,...ue,...e.toolWrapperNames]);for(let r of n){let c=Object.getOwnPropertyDescriptor(e.vmContext,r);if(c&&!c.configurable)return r}return null}function C(e){Object.setPrototypeOf(e,null);try{delete e.constructor,delete e.prototype}catch{}return e}function je(e){let n=L.runInContext(`(() => {
      // Capture intrinsics in closure NOW (literal-eval time, pre-user-code).
      // Global identifiers inside these function bodies resolve at CALL time
      // via globalThis \u2014 hardenVMIntrinsics freezes the String/Object
      // constructor OBJECTS but the globalThis bindings stay writable, so VM
      // code can reassign globalThis.String and a call-time lookup would use
      // it (same convention as createVMClone in vmHardening.ts). The
      // value-captured members below (Err/stringify/parse/toStr/exotics) are
      // immune by construction.
      const _String = String, _keys = Object.keys,
            _defineProperty = Object.defineProperty, _isArray = Array.isArray,
            _Error = Error, _parse = JSON.parse
      // Single error-message extractor for EVERY catch in this literal
      // (also exported as errMsg). Read .message ONCE \u2014 a stateful accessor
      // can return a string to a typeof check and a hostile VM value to a
      // re-read, smuggling a non-string into {error} objects that cross to
      // the host. String() fallback via the captured intrinsic; never
      // throws ('<unprintable thrown value>' for poison getters), so a
      // throwing getter can't turn an {error} return into a raw rejection.
      const _errStr = (e) => {
        try {
          const m = e?.message
          return typeof m === 'string' ? m : _String(e)
        } catch {
          return '<unprintable thrown value>'
        }
      }
      // MCP inner-call failures cross the realm boundary by NAME (the same
      // protocol as ReplayCacheExhausted below): the host-side wrapper
      // throws an error named MCP_INNER_TOOL_ERROR_NAME (toolWrappers.ts,
      // flag-gated), and this rebuilds it as a VM-realm Error so the
      // script's catch never holds a host-realm object (a host Error would
      // be a sandbox escape via e.constructor.constructor). Each property
      // is read ONCE and typeof-gated (stateful-accessor hygiene, same as
      // _errStr); only string primitives cross, and .detail is re-parsed
      // from JSON with VM-realm _parse so the object is VM-owned.
      const _throwMcpVM = (e) => {
        const err = new _Error(_errStr(e))
        _defineProperty(err, 'name', { value: '${O}', configurable: true, writable: true })
        const t = e?.toolName
        if (typeof t === 'string') {
          _defineProperty(err, 'toolName', { value: t, enumerable: true, configurable: true, writable: true })
        }
        const m = e?.error
        _defineProperty(err, 'error', { value: typeof m === 'string' ? m : _errStr(e), enumerable: true, configurable: true, writable: true })
        const d = e?.detailJson
        if (typeof d === 'string') {
          try {
            _defineProperty(err, 'detail', { value: _parse(d), enumerable: true, configurable: true, writable: true })
          } catch {}
          // Also stamp detailJson (non-enumerable plumbing) so the rebuilt
          // error round-trips through a SECOND _throwMcpVM: a registerTool
          // handler proxying an MCP call re-enters wrap()'s catch with the
          // rebuilt error (rejections propagate by identity), and without
          // this the second pass reads e?.detailJson === undefined and
          // silently drops .detail, breaking the advertised e.detail
          // contract on the nested path.
          try {
            _defineProperty(err, 'detailJson', { value: d, enumerable: false, configurable: true, writable: true })
          } catch {}
        }
        throw err
      }
      return {
      arr: () => [],
      obj: () => ({}),
      wrap: (hostFn, cloneFn, sanitizeFn) => (input) => {
        const p = (async () => {
          // INTAKE sanitize, VM-side (\uD83D\uDEE1\uFE0F HIGH, \xA710.5.12): hostFn's input is
          // otherwise a live VM reference whose get/ownKeys traps would
          // receive HOST-realm argArrays when host code (zod parse, the
          // consent param walk) reads it on V8. The walk runs here in the
          // VM, so traps only ever see VM-realm arguments; hostFn receives
          // inert data-property containers. Sanitize throws (length caps,
          // unreadable traps) take this wrap's normal {error} path.
          try { return cloneFn(await hostFn(sanitizeFn ? sanitizeFn(input) : input)) }
          catch (e) {
            // Read .name ONCE (stateful-accessor hygiene, as _errStr).
            const n = e?.name
            if (n === 'ReplayCacheExhausted') throw e
            if (n === '${O}') _throwMcpVM(e)
            return { error: _errStr(e) }
          }
        })()
        p.catch(() => {})
        return p
      },
      wrapN: (hostFn, cloneFn, sanitizeFn) => (...args) => {
        const p = (async () => {
          // Same intake sanitize as wrap, per positional arg.
          try { return cloneFn(await hostFn(...(sanitizeFn ? args.map(a => sanitizeFn(a)) : args))) }
          catch (e) {
            // Read .name ONCE (stateful-accessor hygiene, as _errStr).
            const n = e?.name
            if (n === 'ReplayCacheExhausted') throw e
            if (n === '${O}') _throwMcpVM(e)
            return { error: _errStr(e) }
          }
        })()
        p.catch(() => {})
        return p
      },
      wrapPropagate: (hostFn, cloneFn, Err, sanitizeFn) => (input) => {
        const p = (async () => {
          // Same intake sanitize as wrap.
          try { return cloneFn(await hostFn(sanitizeFn ? sanitizeFn(input) : input)) }
          catch (e) {
            // Read .name once for the same stateful-accessor reason.
            const n = e?.name
            // MCP_INNER_TOOL_ERROR_NAME rebuilds with its machine-readable
            // props so replayed scripts (installed via asyncDataPropagate)
            // see the same error shape live scripts do.
            if (n === '${O}') _throwMcpVM(e)
            const err = new Err(_errStr(e))
            if (typeof n === 'string') {
              _defineProperty(err, 'name', { value: n, configurable: true, writable: true })
            }
            throw err
          }
        })()
        p.catch(() => {})
        return p
      },
      callVM: (vmFn, cloneFn) => async (input) => ({__proto__: null, v: cloneFn(await vmFn(input))}),
      resolveDeep: async (v, cloneFn) => {
        // This catch's return is the one resolveDeep exit that bypasses
        // cloneFn, so every member of the {error} value MUST be a
        // primitive \u2014 _errStr guarantees a string, keeping raw VM objects
        // from crossing the boundary by identity. This exit IS reachable
        // for MCP rejections: a script ENDING on an unawaited MCP call
        // (e.g. last expression \`o.x = mcp__server__tool({})\`) returns the
        // pending promise inside the transpiler envelope, awaitVM unwraps
        // only the IIFE promise down to the envelope (null-proto, no
        // .then), and the inner promise first settles here. Mirror the
        // per-key marker so the failure value is never a bare
        // success-shaped {error} \u2014 but primitives ONLY: unlike the per-key
        // catch below, nothing on this exit passes through cloneFn, so
        // embedding e.detail (an object \u2014 and on an impostor, a hostile
        // getter's Proxy) would cross by identity. The raw body text is
        // already in the error string; consumers can parse it. (The
        // marker itself is normal-proto, matching the per-key marker it
        // mirrors \u2014 null-proto bought nothing here: the VM's
        // Object.prototype is frozen by hardenVMIntrinsics, and the host
        // .then-probes only the envelope, never the inner value. Note
        // util.inspect still prefixes BOTH markers' tool_result
        // renderings \u2014 the frozen intrinsics accessorize
        // Object.prototype.constructor, defeating inspect's plain-object
        // fast path regardless of prototype; the realm-safe fix would be
        // a host-side rebuild of this primitive-only value, deliberately
        // not added at this boundary.)
        try { v = await v } catch (e) {
          // try-guarded reads keep this catch total (resolveDeep must never
          // reject): a hostile rejection value with a throwing name/toolName
          // getter degrades to the bare-{error} shape, same as _errStr's
          // own throw discipline.
          let n; try { n = e?.name } catch {}
          if (n === '${O}') {
            const failure = { error: _errStr(e), mcpToolError: true }
            let t; try { t = e?.toolName } catch {}
            if (typeof t === 'string') {
              _defineProperty(failure, 'toolName', { value: t, writable: true, enumerable: true, configurable: true })
            }
            return {__proto__: null, v: failure}
          }
          return {__proto__: null, v: { error: _errStr(e) }}
        }
        if (v !== null && typeof v === 'object' && !_isArray(v)) {
          try {
            for (const k of _keys(v)) {
              try {
                const val = v[k]
                if (val === null || typeof val !== 'object' || typeof val.then !== 'function') continue
                _defineProperty(v, k, { value: await val, writable: true, enumerable: true, configurable: true })
              } catch (e) {
                // o.*-assigned promises are awaited only here, at return
                // time \u2014 there is no script left to throw into, so a
                // rejected MCP call can't keep the throw contract on this
                // path. Second-best: carry the marker + toolName so the
                // failure value is discriminable from data (a bare {error}
                // is exactly the success-shaped value the MCP throw
                // contract exists to eliminate). Try-guarded reads keep
                // this catch total, mirroring the top-level catch above: a
                // throwing getter on the rejection value would otherwise
                // throw INSIDE this catch, escape to the enclosing for-loop
                // try, and silently abort auto-await of every remaining
                // o.* key (dropping innocent pending tool calls).
                let failure
                let n; try { n = e?.name } catch {}
                if (n === '${O}') {
                  failure = { error: _errStr(e), mcpToolError: true }
                  let t; try { t = e?.toolName } catch {}
                  if (typeof t === 'string') {
                    _defineProperty(failure, 'toolName', { value: t, writable: true, enumerable: true, configurable: true })
                  }
                  // The rejection here is normally the _throwMcpVM-rebuilt
                  // VM error, which carries .detail already parsed
                  // (VM-realm); an impostor's throwing getter degrades to
                  // a detail-less failure value.
                  let d; try { d = e?.detail } catch {}
                  if (d !== null && typeof d === 'object') {
                    _defineProperty(failure, 'detail', { value: d, writable: true, enumerable: true, configurable: true })
                  }
                } else {
                  failure = { error: _errStr(e) }
                }
                _defineProperty(v, k, { value: failure, writable: true, enumerable: true, configurable: true })
              }
            }
          } catch {}
        }
        try { return {__proto__: null, v: cloneFn(v)} } catch { return {__proto__: null, v: undefined} }
      },
      awaitVM: async (v) => v,
      exotics: new Set([
        Date, Map, Set, WeakMap, WeakSet, RegExp, Promise,
        Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, AggregateError,
        ArrayBuffer, SharedArrayBuffer, DataView,
        Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
        Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array,
        ...(typeof URL !== 'undefined' ? [URL] : []),
      ].map(C => C.prototype)),
      Err: Error,
      stringify: JSON.stringify,
      parse: JSON.parse,
      toStr: String,
      errMsg: _errStr,
      }
    })()`,e),r=tXe(e).sanitize;function c(l){let p;try{p=n.errMsg(l)}catch{return"<unprintable thrown value>"}return typeof p==="string"?p:"<unprintable thrown value>"}function u(l,p=new WeakMap,s=!0){if(typeof l==="function")return;if(l===null||typeof l!=="object")return l;if(le.isProxy(l))return;let a=p.get(l);if(a!==void 0)return a;if(!Object.hasOwn(l,"then")&&!Object.hasOwn(l,"toJSON")&&!Object.hasOwn(l,"toString")&&!Object.hasOwn(l,"valueOf")&&!Object.hasOwn(l,Symbol.toPrimitive)&&n.exotics.has(Object.getPrototypeOf(l))){if(s)try{Object.preventExtensions(l)}catch{return}return l}if(Array.isArray(l)){let m=n.arr();p.set(l,m);let k=Number.isSafeInteger(l.length)?l.length:0,h=Math.min(k,lT);for(let E=0;E<h;E++){let _=Object.getOwnPropertyDescriptor(l,E);m[E]=u(_&&"value"in _?_.value:void 0,p,s)}return m.length=k,m}let o=n.obj();p.set(l,o);for(let m of Object.keys(l)){let k=Object.getOwnPropertyDescriptor(l,m);Object.defineProperty(o,m,{value:u(k&&"value"in k?k.value:void 0,p,s),writable:!0,enumerable:!0,configurable:!0})}return o}let g=new WeakSet;function y(l){return g.add(l),l}function f(l){throw new n.Err(c(l))}return{fn:(l)=>C((...p)=>{try{return l(...p)}catch(s){f(s)}}),clone:u,throwVM:(l)=>{throw new n.Err(l)},stringify:n.stringify,parse:n.parse,toStr:n.toStr,errMsg:c,asyncData:(l)=>{let p=C((s)=>l(s));return y(n.wrap(p,u,r))},asyncDataN:(l)=>{let p=C((...s)=>l(...s));return y(n.wrapN(p,u))},asyncDataPropagate:(l)=>{let p=C((s)=>l(s));return y(n.wrapPropagate(p,u,n.Err,r))},asyncDataVM:(l)=>{let p=(a)=>u(a,void 0,!1),s=n.wrap(l,u);return y(C((a)=>{try{return s(p(a))}catch(o){f(o)}}))},hostCallVM:(l)=>{let p=n.callVM(l,u);return(s)=>p(u(s))},resolveDeep:(l)=>n.resolveDeep(l,u),awaitVM:n.awaitVM,isSealedAsync:(l)=>typeof l==="function"&&g.has(l)}}function H(e,n){let r=Object.getOwnPropertyDescriptor(e,n);return r&&"value"in r?r.value:void 0}function de(e,n,r,c,u,g,y,f,l){let p={__proto__:null,log:n.fn(r.log),info:n.fn(r.info),debug:n.fn(r.debug),error:n.fn(r.error),warn:n.fn(r.warn)};T(e,"console",p);for(let[o,m]of Object.entries(c))T(e,o,n.asyncData(m));for(let[o,m]of Object.entries(u))T(e,o,n.asyncDataN(m));let s=L.runInContext('(f) => { try { if (typeof f === "function") f() } catch {} }',e);T(e,"setTimeout",n.fn((o,m)=>{if(typeof o!=="function")return 0;let k=Number(setTimeout(()=>s(o),typeof m==="number"?m:void 0));return f.add(k),k})),T(e,"clearTimeout",n.fn((o)=>{if(typeof o!=="number")return;clearTimeout(o),f.delete(o)})),T(e,"setInterval",n.fn((o,m)=>{if(typeof o!=="function")return 0;let k=Number(setInterval(()=>s(o),typeof m==="number"?m:void 0));return f.add(k),k})),T(e,"clearInterval",n.fn((o)=>{if(typeof o!=="number")return;clearInterval(o),f.delete(o)})),T(e,"atob",n.fn((o)=>atob(n.toStr(o)))),T(e,"btoa",n.fn((o)=>btoa(n.toStr(o)))),T(e,"shQuote",n.fn((o)=>`'${n.toStr(o).replaceAll("'","'\\''")}'`));let a=n.fn((o,m,k,h,E)=>{if(typeof o!=="string"||!Ne.test(o))n.throwVM(`registerTool: name must match ^[a-zA-Z0-9_-]{1,111}$ (wire name is prefixed with 'eval_registered__'), got ${typeof o}: ${n.toStr(o).slice(0,50)}`);if(y.has(o)&&!g.has(o))n.throwVM(`registerTool: '${o}' collides with a built-in global; choose a different name`);let _=n.parse(n.stringify(k)??"null");if(_===null||typeof _!=="object"||Array.isArray(_))n.throwVM(`registerTool: schema must be a JSON-serializable object, got ${_===null?"null":Array.isArray(_)?"array":typeof _}`);let{displayName:S}=fe(E,["displayName"]),v=n.toStr(m),P=S==null?void 0:n.toStr(S);T(e,o,n.asyncDataVM(h)),g.set(o,{name:o,description:v,schema:_,handler:n.hostCallVM(h),displayName:P})});T(e,"registerTool",a),T(e,"unregisterTool",n.fn((o)=>{if(!g.has(o))return!1;g.delete(o);try{delete e[o]}catch{throw new F(o)}return!0})),T(e,"listTools",n.fn(()=>n.clone([...g.keys()]))),$e(e,n,l,p.log),T(e,"getTool",n.fn((o)=>{let m=g.get(o);return m?n.clone({name:m.name,description:m.description,schema:m.schema,displayName:m.displayName}):void 0}))}var Ce="Read",Fe="Write",ie="Grep",xe=["A","B","C","glob","head","type","i"];function fe(e,n){let r={};if(e===null||typeof e!=="object"||le.isProxy(e))return r;for(let c of n){let u=Object.getOwnPropertyDescriptor(e,c);if(!u||!("value"in u))continue;let g=u.value;if(typeof g==="string"||typeof g==="number"||typeof g==="boolean")r[c]=g}return r}var Ve=/^(pr|issue|run|workflow|release|label|cache)\b/,De=/(^|\s)(-R|--repo\b)/;function $e(e,n,r,c){function u(s){let a=n.toStr(s);return Oe(a)?a:Ae(r.cwd,a)}function g(s,a){let o=H(e,s);if(typeof o!=="function"||!n.isSealedAsync(o))n.throwVM(`${s} tool is not available in this REPL context`);return o(a)}function y(s){return s!==null&&typeof s==="object"?s:{}}function f(s,a){return typeof s[a]==="string"?s[a]:""}function l(s){if(s!==void 0)return{path:u(s)};return r.cwd!==te()?{path:r.cwd}:{}}async function p(s,a){let o=hi(),m=r.cwd===te()?"":o?`cd ${He(r.cwd)} && `:`Set-Location -LiteralPath ${dLe(r.cwd,"the REPL working directory")}; `,k=y(await g(o?Ue:Gt,{command:m+s,...typeof a==="number"&&{timeout:a}})),h=f(k,"stdout"),E=f(k,"stderr"),_=f(k,"error");return[h,E&&`[stderr]
${E}`,_&&`[error] ${_}`].filter(Boolean).join(`
`)}T(e,"sh",n.asyncDataN((s,a)=>p(n.toStr(s),a))),T(e,"gh",n.asyncDataN((s)=>{let a=n.toStr(s).trim(),o=r.repo;if(o&&!De.test(a)){if(Ve.test(a))a=`${a} -R ${o}`;a=a.replaceAll("repos/:owner/:repo",`repos/${o}`)}return p(`gh ${a}`)})),T(e,"cat",n.asyncDataN(async(s,a,o)=>{let m=y(await g(Ce,{file_path:u(s),...typeof a==="number"&&{offset:a},...typeof o==="number"&&{limit:o}})),k=y(m.file);return f(k,"content")||f(m,"error")})),T(e,"rg",n.asyncDataN(async(s,a,o)=>{let m=fe(o,xe),k=y(await g(ie,{pattern:n.toStr(s),output_mode:"content","-n":!0,...l(a),...m.A!==void 0&&{"-A":m.A},...m.B!==void 0&&{"-B":m.B},...m.C!==void 0&&{"-C":m.C},...m.glob!==void 0&&{glob:m.glob},...m.head!==void 0&&{head_limit:m.head},...m.type!==void 0&&{type:m.type},...m.i!==void 0&&{"-i":m.i}}));return f(k,"content")||f(k,"error")})),T(e,"rgf",n.asyncDataN(async(s,a,o)=>{let m=y(await g(ie,{pattern:n.toStr(s),output_mode:"files_with_matches",...l(a),...typeof o==="string"&&{glob:o}}));return Array.isArray(m.filenames)?m.filenames:[]})),T(e,"gl",n.asyncDataN(async(s,a)=>{let o=y(await g(Vr,{pattern:n.toStr(s),...l(a)}));return Array.isArray(o.filenames)?o.filenames:[]})),T(e,"put",n.asyncDataN(async(s,a)=>{let o=y(await g(Fe,{file_path:u(s),content:n.toStr(a)})),m=f(o,"error");return m?`[error] ${m}`:""})),T(e,"chdir",n.fn((s)=>{r.cwd=u(s)})),T(e,"log",c),T(e,"str",n.fn((s,a,o)=>{if(typeof a==="function")n.throwVM("str: function replacer not supported");return n.stringify(s,a,o)}))}function He(e){return`'${e.replaceAll("'","'\\''")}'`}function dZt(e,n){if(e.helperState.cwd=te(),n!==void 0)e.helperState.repo=n;T(e.vmContext,"REPO",e.helperState.repo??""),T(e.vmContext,"o",e.sealers.clone({}))}function pZt(e,n){let r=n===void 0?H(e.vmContext,"o"):n;return e.sealers.resolveDeep(r)}function fZt(e,n,r,c,u,g){let y=new Map,f=new Set,l=new Set,p={cwd:te(),repo:void 0},s=L.createContext({__proto__:null},{codeGeneration:{strings:!0,wasm:!1}}),a=je(s),o=Ie(a);L.runInContext(`Promise.prototype.toString = function () {
      throw new TypeError(
        "REPL: unawaited Promise coerced to string. Shorthand results used " +
        "inline need 'await' \u2014 e.g. const c = await cat(f); put(f, c + s). " +
        "Auto-await applies only to o.* keys at return time.",
      )
    }`,s),$ee(s);let m=G(e.filter((h)=>!Lt(h,Vi)),n,r,c,u,g),k=B(a.stringify,n,u);de(s,a,o,m,k,y,f,l,p),Object.keys(s).forEach((h)=>f.add(h)),ue.forEach((h)=>f.add(h));try{L.runInContext("Object.getOwnPropertyNames(globalThis)",s).forEach((E)=>f.add(E))}catch{["JSON","Array","Object","Promise","globalThis"].forEach((h)=>f.add(h))}return f.add("__proto__"),{vmContext:s,registeredTools:y,reservedGlobals:f,toolWrapperNames:new Set([...Object.keys(m),...Object.keys(k)]),mcpToolNames:new Set(e.filter((h)=>h.isMcp===!0).map((h)=>h.name)),boundaryUuid:null,console:o,sealers:a,activeTimers:l,clearAllTimers:()=>{for(let h of l)clearTimeout(h);l.clear()},replayLog:[],helperState:p}}function YSr(e,n,r,c,u,g,y){let f=G(n.filter((p)=>!Lt(p,Vi)),r,c,u,g,y),l=B(e.sealers.stringify,r,g);de(e.vmContext,e.sealers,e.console,f,l,e.registeredTools,e.reservedGlobals,e.activeTimers,e.helperState);for(let p of Object.keys(f))e.toolWrapperNames.add(p);for(let p of Object.keys(l))e.toolWrapperNames.add(p);for(let p of n)if(p.isMcp===!0)e.mcpToolNames.add(p.name)}function lDn(e){return Array.from(e.values()).filter((n)=>n.phase==="complete"||n.phase==="error").map((n)=>n.phase==="error"?{kind:"err",toolName:n.toolName,error:n.error??""}:{kind:"ok",toolName:n.toolName,result:Cot(n.toolName,n.result)})}function ye(e,n){if(e===null||typeof e!=="object")return"";let r=e[n];return typeof r==="string"?r:""}function We(e,n){if(e===null||typeof e!=="object")return!1;return e[n]===!0}function Be(e){if(e.type!=="assistant"||e.isVirtual)return[];let n=e.message.content;if(!Array.isArray(n))return[];return n.filter((r)=>r.type==="tool_use"&&r.name===Vi).map((r)=>({id:r.id,code:ye(r.input,"code")}))}function ze(e){if(e.type!=="assistant"||!e.isVirtual)return;let n=e.message.content;if(!Array.isArray(n))return;let r=n[0];return r?.type==="tool_use"?r.name:void 0}function Ge(e,n){if(e.type!=="user"||!e.isVirtual)return;let r=e.message.content;if(!Array.isArray(r))return;let c=r[0];if(c?.type!=="tool_result")return;return c.is_error?{kind:"err",toolName:n,error:typeof c.content==="string"?c.content:""}:{kind:"ok",toolName:n,result:e.toolUseResult}}function Je(e,n){if(e.type!=="user"||e.isVirtual)return;let r=e.message.content;if(!Array.isArray(r))return;if(!r.some((u)=>u.type==="tool_result"&&u.tool_use_id===n))return;return ye(e.toolUseResult,"error").length>0}function qe(e,n){if(e.type!=="user"||e.isVirtual)return!1;let r=e.message.content;if(!Array.isArray(r))return!1;if(!r.some((c)=>c.type==="tool_result"&&c.tool_use_id===n))return!1;return We(e.toolUseResult,"asyncDispatched")}function VPt(e){let n=[],r,c=()=>{if(!r)return;n.push({code:r.code,calls:r.calls,threw:r.threw}),r=void 0};for(let u of e){if(u.type!=="assistant"&&u.type!=="user")continue;if(u.isVirtual){if(!r)continue;let y=ze(u);if(y!==void 0){r.pendingName=y;continue}let f=r.pendingName;if(f===void 0)continue;let l=Ge(u,f);if(!l)continue;r.calls.push(l),r.pendingName=void 0;continue}let g=Be(u);if(g.length>0){for(let y of g)c(),r={replId:y.id,code:y.code,calls:[],threw:!1,pendingName:void 0};continue}if(r){if(qe(u,r.replId)){r=void 0;continue}let y=Je(u,r.replId);if(y!==void 0)r.threw=y}}return c(),n}class he extends Error{constructor(e,n){super(`REPL replay: ${e} invoked but only ${n} calls were cached. `+"The replayed code is making more tool calls than the original \u2014 "+"likely nondeterminism (Date.now, Math.random) took a different branch.");this.name="ReplayCacheExhausted"}}var Ke=100;function Qe(e,n,r){let c=0,u=[],g=Tot(),y=(s)=>{if(u.length<Ke)u.push(s)},f=(s)=>{let a=e[c];if(!a)throw y(`position ${c}: ${s} invoked but only ${e.length} calls cached (exhausted)`),new he(s,e.length);if(c++,a.toolName!==s)y(`position ${c-1}: expected ${a.toolName}, invoked ${s}`);return a},l=(s)=>async function(){await new Promise((m)=>setImmediate(m));let o=f(s);if(o.kind==="ok")return o.result;if(g&&(r.has(o.toolName)||o.toolName.startsWith("mcp__")))throw new N(o.toolName,o.error);return{error:o.error}};return{wrappers:Object.fromEntries(n.map((s)=>[s,l(s)])),diagnostics:()=>({consumed:c,total:e.length,drift:u})}}var q=30000;async function Xe(e,n){let r=[...e.toolWrapperNames],{wrappers:c,diagnostics:u}=Qe(n.calls,r,e.mcpToolNames),g=r.map((y)=>[y,H(e.vmContext,y)]);try{r.forEach((s)=>{T(e.vmContext,s,e.sealers.asyncDataPropagate(c[s]))}),dZt(e);let y=lZt(n.code),l=new me.Script(y,{filename:"repl-replay.js",importModuleDynamically:()=>{throw y1("import() is not available in REPL code.")}}).runInContext(e.vmContext,Rj(q));await Dt(e.sealers.awaitVM(l).then((s)=>pZt(e,cZt(s))),q,`REPL replay timed out after ${q}ms`);let p=u();if(n.threw)return{kind:"drift",reason:"original threw, replay succeeded",consumed:p.consumed,total:p.total};if(p.drift.length>0||p.consumed!==p.total)return{kind:"drift",reason:p.drift[0]??`consumed ${p.consumed}/${p.total} cached calls`,consumed:p.consumed,total:p.total};return{kind:"ok",consumed:p.consumed,total:p.total}}catch(y){if(qPt(y))throw y;let f=u(),l=e.sealers.errMsg(y);if(n.threw){if(f.drift.length>0||f.consumed!==f.total)return{kind:"drift",reason:f.drift[0]??`consumed ${f.consumed}/${f.total} before expected throw`,consumed:f.consumed,total:f.total};return{kind:"ok",consumed:f.consumed,total:f.total}}return{kind:"threw",error:l}}finally{g.forEach(([y,f])=>{try{T(e.vmContext,y,f)}catch{}}),e.console.clear()}}async function XSr(e,n){let r=[];for(let u of n){let g=await Xe(e,u);if(r.push(g),g.kind!=="ok")t(`REPL replay ${g.kind} at block ${r.length}/${n.length}: ${"error"in g?g.error:g.reason}`,{level:"warn"})}let c=pe(e);if(c!==null)throw new F(c);return r}function JSr(e){let n=z(e,(g)=>g.kind==="ok"),r=z(e,(g)=>g.kind==="drift"),c=z(e,(g)=>g.kind==="threw"),u=c>0||r>0?`${n}/${e.length} blocks replayed cleanly (${r} drifted, ${c} threw)`:`${n} blocks replayed`;return{ok:n,drifted:r,threw:c,summary:u}}
export{Tot,lZt,cZt,Cot,uZt,qPt,dZt,pZt,fZt,YSr,lDn,VPt,XSr,JSr};
