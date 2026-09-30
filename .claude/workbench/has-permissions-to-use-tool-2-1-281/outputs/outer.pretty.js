const eMo = async (e, n, r, s, g, h, _, w) => {
  let M = { ...r, toolUseId: g, permissionModeAtRequest: OZ(s, g, r) };
  if (_0t(M))
    i("tengu_auto_mode_decided_as_requested_mode", {
      toolName: Fn(e.name),
      isMcp: e.isMcp ?? !1,
      requestedMode: c(M.permissionModeAtRequest.mode),
      toolUseId: be(g),
      agentMsgId: be(s.message.id),
    });
  let N,
    U = () => (N ??= gbe(e, M.options.mcpClients)),
    G,
    ge = () => (G ??= Xje(M)),
    _e = await n5e({
      tool: e,
      input: n,
      context: M,
      toolUseID: g,
      evaluate: () => D0t(e, n, M, _),
    });
  if (_e.behavior === "allow") {
    let ve = M.getAppState(),
      Ee = M.localDenialTracking ?? ve.denialTracking;
    if (
      !rq(M.requestDialog !== void 0) &&
      i0(e, fe(M)) === "auto" &&
      Ee &&
      Ee.consecutiveDenials > 0
    ) {
      let xe = tP(Ee);
      sq(M, xe);
    }
    return _e;
  }
  if (_e.behavior === "ask") {
    let ve = M.getAppState(),
      Ee = fe(M),
      xe = i0(e, Ee),
      Pe = Dg(e),
      Le = xde(Pe),
      De = _e.metadata?.command?.chrome,
      $e =
        VPo(e, Ee) &&
        (De?.domainAllowed === !0 ||
          De?.hostHandlesOriginConsent === !0 ||
          L0e(Ee, e) !== null);
    if (xe === "dontAsk" && !$e)
      return {
        behavior: "deny",
        decisionReason: { type: "mode", mode: "dontAsk" },
        message: Kde(e.name),
      };
    if (Ia(xe, Ee.servedCall === !0) || $e) {
      if (eWe(e.name, ve.proactivityLevel)) {
        if (Ee.shouldAvoidPermissionPrompts) return F$(_e.message);
        return _e;
      }
      let Xe = { mode: xe, autoActive: ug() },
        We = V2(),
        st = M.hookAskFloor === !0,
        bt = hE(e);
      if (bt?.onBlock === "refuse" && (st || We))
        return NA(
          e,
          st
            ? "a PreToolUse hook asked for a prompt, and none is raised"
            : "the host re-asks every allow, and no prompt is raised",
        );
      if (
        st &&
        !We &&
        Ee.shouldAvoidPermissionPrompts &&
        bt?.onBlock !== "flag"
      )
        return F$(_e.message);
      let gt = (Yr) => {
          if (Yr.decisionReason.type === "classifier" && Gn) $5t(g, e, n);
          let { classifierRan: Dr, ...ls } = Yr,
            Pr =
              ls.decisionReason.type === "classifier" &&
              ls.decisionReason.noVerdict !== !0 &&
              Dr !== !1
                ? {
                    ...ls,
                    decisionReason: {
                      ...ls.decisionReason,
                      classifierAllowed: !0,
                    },
                  }
                : ls;
          if (bt?.onBlock === "flag") return { behavior: "allow", ...Pr };
          if (We)
            return { ..._e, ...ls, decisionReason: ODe(_e, ls.decisionReason) };
          if (st) {
            if (xe === "dontAsk")
              return {
                behavior: "deny",
                decisionReason: { type: "mode", mode: "dontAsk" },
                message: Kde(e.name),
              };
            return { ..._e, updatedInput: Yr.updatedInput };
          }
          return { behavior: "allow", ...Pr };
        },
        St = (Yr) => {
          if (!eWe(e.name, M.getAppState().proactivityLevel)) return;
          if (
            (i("tengu_auto_mode_fallback_to_ask", {
              reason: c(Yr),
              toolName: Fn(e.name),
              isMcp: e.isMcp ?? !1,
              ...U(),
            }),
            fe(M).shouldAvoidPermissionPrompts)
          )
            return F$(_e.message);
          return _e;
        },
        Ct = kg(
          _e.decisionReason,
          (Yr) => !Yr.classifierApprovable && !(Kz(Yr) && ske(Ee)),
        ),
        Ft = kg(_e.decisionReason, uPr) !== void 0,
        It = _e.decisionReason?.type === "sandboxOverride",
        $t = tQr(_e.decisionReason, Ee),
        Bt = Sbe(_e),
        Vt =
          $Io(_e.decisionReason) ||
          _e.matchedAskRule?.source === "mcpServerPolicy",
        Yt = zPo(Vt, e, n, xe),
        Sn = Bt && !We && !(Vt && (!(e.isDestructive?.(n) ?? !1) || Yt)),
        Yn = e.mcpInfo?.effectiveMaxPermission === "ask",
        Kt = M0t(_e.decisionReason) && !gse(Dg(e), n),
        ln = kg(_e.decisionReason, tMt),
        So = ln !== void 0 && ske(Ee) && !Bt ? p1() : void 0;
      if (ln !== void 0 && So?.enabled) {
        let Yr = b0t(_e, ln, M, So);
        if (Yr.behavior === "ask")
          return (
            i("tengu_auto_mode_fallback_to_ask", {
              reason: b("safety_check"),
              toolName: Fn(e.name),
              isMcp: e.isMcp ?? !1,
              ...U(),
            }),
            Yr
          );
        return (
          L$(M.session, {
            tool: e.name,
            allowlisted: !1,
            decision: "blocked",
            fastPath: "hardcodedDeny",
            durationMs: 0,
            originalDecisionReasonType: "safetyCheck",
          }),
          i("tengu_auto_mode_decision", {
            decision: b("blocked"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
            inProtectedNamespace: JI(),
            ...ge(),
            chromeAutomode: Le,
            mcpServerAskOverride: Yt,
            agentMsgId: be(s.message.id),
            fastPath: b("hardcodedDeny"),
            originalDecisionReasonType: b("safetyCheck"),
            circuitBreaker: pe(ln.circuitBreaker),
            hookAllowVouch: M.hookAllowVouched === !0,
            ...N$(e.name, n),
          }),
          Yr
        );
      }
      if (Ct || It || Sn || Yn || Kt) {
        if (Ee.shouldAvoidPermissionPrompts) return F$(_e.message);
        if (Ct || $t || Sn || Yn || Kt)
          return (
            i("tengu_auto_mode_fallback_to_ask", {
              reason: b(
                Ct || $t
                  ? "safety_check"
                  : Sn
                    ? "ask_rule"
                    : Kt
                      ? "plan_mode_floor"
                      : "org_ask_ceiling",
              ),
              toolName: Fn(e.name),
              isMcp: e.isMcp ?? !1,
              ...U(),
            }),
            _e
          );
      }
      let wo = e.name === $s && _e.behavior === "ask" && !d6() && KFt();
      if (!wo && e.requiresUserInteraction?.() && _e.behavior === "ask")
        return (
          i("tengu_auto_mode_fallback_to_ask", {
            reason: b("requires_user_interaction"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
          }),
          _e
        );
      if (UPo?.workflowNeedsUsageConsentPrompt(e.name, M))
        return (
          i("tengu_auto_mode_fallback_to_ask", {
            reason: b("workflow_usage_consent"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
          }),
          _e
        );
      if (u$t(e, n, _e, M))
        return (
          M.session.outsideReadPrompt.open(g),
          i("tengu_auto_mode_fallback_to_ask", {
            reason: b("outside_read_first_prompt"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
          }),
          { ..._e, offersBlockOutsideReads: !0 }
        );
      let zn = M.localDenialTracking ?? ve.denialTracking ?? BIe(),
        Kn = PJ(Ee.mode),
        yn = Wwt(Kn),
        jn =
          _e.decisionReason?.type === "other" &&
          _e.decisionReason.reason === sMt
            ? _e.decisionReason
            : void 0,
        Nn = jn !== void 0,
        fn = jn?.reroutedFrom,
        Gn = ire(),
        Go,
        xo = () => ((Go ??= Ygt(s)), Go),
        dr = (Yr) => {
          let Dr = Vgt(Kn, Yr, g);
          if (Dr && Kn === "arbiter" && !B9())
            (uNt(),
              i("tengu_server_classifier_no_result_latched", {
                isSubagent: M.agentId !== void 0,
                reason: c(Yr.kind === "none" ? Yr.why : "other"),
              }),
              t(
                Yr.kind === "none" && Yr.why === "server_unsupported"
                  ? "[server-classifier] the API answered that it does not run the server-side classifier for this session (unsupported), so auto mode classifies locally for the rest of this session"
                  : "[server-classifier] a completed response carried no classification result (no safeguard_results); assuming something on the path to the API dropped it, so auto mode classifies locally for the rest of this session",
                { level: "warn" },
              ));
          return Dr;
        },
        yr = !yn && XOe(e.name) && YOe(Cf(M)),
        Uo = async () => {
          if (!yn || !(XOe(e.name) || Nn)) return !1;
          let Yr = await xo();
          if (dr(Yr)) return !Nn && YOe(Cf(M));
          let Dr = Ww(Yr, g);
          if (Nn && Dr === "server_not_requested") return !1;
          return Dr !== "server_call_skipped";
        },
        kn = T0t(L0e(Ee, e), e, n, xe),
        er = xe === "plan" && !Nn,
        Eo = [],
        Do = !1,
        kr = Le ? De?.navigation : void 0;
      if (kr) f0t(g, kr.from, kr.to);
      let gr = kg(_e.decisionReason) !== void 0;
      if (
        kr === void 0 &&
        !d$t(e.name) &&
        bt === void 0 &&
        !Ft &&
        e.sandboxNetworkLists?.(n) === void 0 &&
        !It &&
        !yr &&
        !gr &&
        !er
      )
        try {
          let Yr = e.inputSchema.parse(n),
            Dr = (cr) => {
              let hs = Zn(cr);
              return !D0e(hs.toolName, hs.ruleContent);
            },
            ls = os(Ee.alwaysAllowRules, (cr) => (cr ?? []).filter(Dr)),
            Pr = M.permissionLayers?.map((cr) =>
              cr.kind === "allowed_tools"
                ? { ...cr, allowedTools: cr.allowedTools.filter(Dr) }
                : cr,
            ),
            Or = (cr) =>
              e.checkPermissions(Yr, {
                ...M,
                toolUseId: void 0,
                permissionLayers: Pr,
                getAppState: () => {
                  let hs = M.getAppState(),
                    Hs = {
                      ...hs.toolPermissionContext,
                      mode: "acceptEdits",
                      modeBeforeRewrite: Ee.modeBeforeRewrite ?? Ee.mode,
                      alwaysAllowRules: ls,
                    };
                  return {
                    ...hs,
                    toolPermissionContext: cr.length
                      ? swr(Hs, cr, "session")
                      : Hs,
                  };
                },
              }),
            gs = await Or([]);
          if (
            gs.behavior === "ask" &&
            gs.decisionReason?.type === "workingDir" &&
            $Ln() &&
            !GOe(e.name, n)
          ) {
            if (
              ((Eo = await iwr(M.getAppState().toolPermissionContext)),
              Eo.length > 0)
            )
              gs = await Or(Eo);
          }
          if (
            ((Do = gs.behavior === "allow" && (await Uo())),
            gs.behavior === "allow" && !Do)
          ) {
            let cr = yn ? await xo() : void 0;
            if (yn) {
              let ds = i0(e, fe(M));
              if (
                !(ds === Xe.mode && ug() === Xe.autoActive) &&
                !y0t(ds, $e, e, n)
              ) {
                if (
                  (i("tengu_auto_mode_fallback_to_ask", {
                    reason: b("mode_changed_while_queued"),
                    toolName: Fn(e.name),
                    isMcp: e.isMcp ?? !1,
                    ...U(),
                  }),
                  ds === "dontAsk")
                )
                  return {
                    behavior: "deny",
                    decisionReason: { type: "mode", mode: "dontAsk" },
                    message: Kde(e.name),
                  };
                if (fe(M).shouldAvoidPermissionPrompts) return F$(_e.message);
                return _e;
              }
            }
            let hs = St("ask_level_during_accept_edits_sim");
            if (hs) return hs;
            if (!rq(M.requestDialog !== void 0)) $$(M, tP);
            t(
              Nn
                ? `Server classifier skipped ${e.name} or left it to this CLI: the tool's own allow stands`
                : `Skipping auto mode classifier for ${e.name}: would be allowed in acceptEdits mode`,
            );
            let Hs = Nn
              ? "serverHeldShellAllow"
              : Eo.length > 0
                ? "acceptEditsLinkedWorktree"
                : "acceptEdits";
            if (
              (i("tengu_auto_mode_decision", {
                decision: b("allowed"),
                toolName: Fn(e.name),
                isMcp: e.isMcp ?? !1,
                ...U(),
                inProtectedNamespace: JI(),
                ...ge(),
                chromeAutomode: Le,
                mcpAlwaysAllowOverride: kn,
                mcpServerAskOverride: Yt,
                agentMsgId: be(s.message.id),
                confidence: b("high"),
                fastPath: c(Hs),
                serverHeldShellAllowFrom: pe(fn),
                hookAllowVouch: M.hookAllowVouched === !0,
                ...N$(e.name, n),
                ...(cr !== void 0 && {
                  classifierSource: b("server"),
                  serverClassifierNoVerdict: pe(Ww(cr, g)),
                }),
              }),
              cr !== void 0)
            )
              L$(M.session, {
                tool: e.name,
                allowlisted: !1,
                decision: "allowed",
                fastPath: Hs,
                serverHeldShellAllowFrom: fn,
                durationMs: 0,
                classifierSource: "server",
                serverClassifierNoVerdict: Ww(cr, g),
              });
            return gt({
              updatedInput: (jn ? _e.updatedInput : gs.updatedInput) ?? n,
              decisionReason: jn?.replaces ?? { type: "mode", mode: "auto" },
            });
          }
        } catch (Yr) {
          if (Yr instanceof Ue || Yr instanceof Gd) throw Yr;
          if (!nt(Yr)) u(Yr);
          i("tengu_auto_mode_decision", {
            decision: b("fastpath_error"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
            inProtectedNamespace: JI(),
            ...ge(),
            chromeAutomode: Le,
            mcpAlwaysAllowOverride: kn,
            mcpServerAskOverride: Yt,
            agentMsgId: be(s.message.id),
            fastPath:
              Eo.length > 0 ? b("acceptEditsLinkedWorktree") : b("acceptEdits"),
            hookAllowVouch: M.hookAllowVouched === !0,
            error: mh(Yr) ?? b("unknown"),
            ...N$(e.name, n),
          });
        }
      if (kr === void 0 && bt === void 0 && !Ft && GOe(e.name, n)) {
        if (!rq(M.requestDialog !== void 0)) $$(M, tP);
        return (
          t(
            `Skipping auto mode classifier for ${e.name}: tool is on the safe allowlist`,
          ),
          L$(M.session, {
            tool: e.name,
            allowlisted: !0,
            decision: "allowed",
            durationMs: 0,
          }),
          i("tengu_auto_mode_decision", {
            decision: b("allowed"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
            inProtectedNamespace: JI(),
            ...ge(),
            chromeAutomode: Le,
            mcpAlwaysAllowOverride: kn,
            mcpServerAskOverride: Yt,
            agentMsgId: be(s.message.id),
            confidence: b("high"),
            fastPath: b("allowlist"),
            hookAllowVouch: M.hookAllowVouched === !0,
            ...N$(e.name, n),
          }),
          gt({
            updatedInput: _e.updatedInput ?? n,
            decisionReason: { type: "mode", mode: "auto" },
          })
        );
      }
      let br = (Yr, Dr) => (
          L$(M.session, {
            tool: e.name,
            allowlisted: !1,
            decision: "allowed",
            fastPath: Yr,
            durationMs: 0,
          }),
          i("tengu_auto_mode_decision", {
            decision: b("allowed"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            inProtectedNamespace: JI(),
            ...ge(),
            chromeAutomode: Le,
            mcpAlwaysAllowOverride: kn,
            mcpServerAskOverride: Yt,
            agentMsgId: be(s.message.id),
            fastPath: c(Yr),
            hookAllowVouch: M.hookAllowVouched === !0,
            ...N$(e.name, n),
          }),
          gt({
            updatedInput: _e.updatedInput ?? n,
            decisionReason: { type: "other", reason: Dr },
          })
        ),
        Mr = zBn(M);
      if (
        Mr !== void 0 &&
        Ia(Ee.mode) &&
        Ia(xe) &&
        bt === void 0 &&
        kr === void 0 &&
        !nQe() &&
        kg(_e.decisionReason, Kz) === void 0 &&
        !Ft
      ) {
        if (
          (t(
            `Skipping auto mode classifier for ${e.name}: called by plugin ${Mr}`,
          ),
          wo)
        )
          return _e;
        if (Gn) $5t(g, e, n);
        return br("pluginOrigin", `plugin-origin: ${Mr}`);
      }
      if (
        M.synthesizedBy !== void 0 &&
        e.name === mt &&
        Ia(Ee.mode) &&
        Ia(xe) &&
        bt === void 0 &&
        kr === void 0 &&
        !Ft &&
        kg(_e.decisionReason, Kz) === void 0 &&
        x("tengu_structured_creek", !0)
      )
        return (
          t(
            `Skipping auto mode classifier for ${e.name}: synthesized by ${M.synthesizedBy}`,
          ),
          br("harnessSynthesized", `harness-synthesized: ${M.synthesizedBy}`)
        );
      let mr = M.sameTurnToolUses ?? [],
        Br = qIe(e.name, n, g);
      Rke(w, g);
      let sr,
        Zr = !1,
        xr;
      using Ur = new U4t();
      let ms = g$t();
      try {
        let Yr = mr.length > 0 ? [...M.messages, ...mr] : M.messages,
          Dr = wi(Y()),
          ls = (Hs) =>
            _be(Yr, Br, M.options.tools, fe(M), M.abortController.signal, {
              isSubagentLoop: DN(M.agentId),
              recordPresumed: M.agentId === void 0,
              severityEligible: !0,
              artifactConsentArm: "enroll",
              storageV5: M.storageV5,
              credentials: M.credentials,
              agentId: M.agentId,
              sessionId: Dr,
              queueProgress: Hs,
            }),
          Pr = async () => {
            let Hs = Xgt(await xo(), g, () => i0t(Br, M.options.tools));
            if (!Hs.shouldBlock && ZPo()) {
              let ds = e.staleServerClassifierContext?.(
                n,
                s.serverClassifierResults?.sentArtifacts,
                M,
              );
              if (ds !== void 0)
                return (
                  t(
                    `[server-classifier] ${e.name}: the artifact's ${ds.phrase} changed since the request was built; the server's allow is void`,
                  ),
                  i("tengu_auto_mode_server_context_stale", {
                    toolName: Fn(e.name),
                    staleOwnership: ds.facts.includes("ownership"),
                    staleAudience: ds.facts.includes("audience"),
                    staleSharedLive: ds.facts.includes("shared-live"),
                    staleCowritten: ds.facts.includes("co-written"),
                    staleAttested: ds.facts.includes("attested"),
                    staleTypeDeclaration: ds.facts.includes("type-declaration"),
                    staleWatch: ds.facts.includes("watch"),
                    staleFirstTouch: ds.firstTouch,
                  }),
                  {
                    model: Hs.model,
                    durationMs: 0,
                    shouldBlock: !0,
                    unavailable: !0,
                    errorKind: RZ,
                    reason:
                      "Classifier verdict out of date - blocking for a retry",
                  }
                );
            }
            return Hs;
          },
          Or = Ft
            ? async (Hs) => {
                let ds = await Pr();
                if (ds.shouldBlock && ds.errorKind !== "server_not_requested")
                  return ds;
                return ls(Hs);
              }
            : Pr,
          gs = async () => {
            if (!B9()) return !1;
            if ((await jPo(M)) === "interrupt") {
              if (!M.abortController.signal.aborted)
                xM(M.abortController).abort();
              return !0;
            }
            return !1;
          },
          cr = yn
            ? async (Hs) => {
                let ds = await xo();
                if (dr(ds))
                  return (
                    (Zr = !0),
                    t(
                      `[server-classifier] ${e.name}: no server verdict for this call (${Ww(ds, g)}); the local classifier decides it`,
                    ),
                    (await gs()) ? IDe : ls(Hs)
                  );
                return Or(Hs);
              }
            : ls,
          hs = async (Hs) => ((await gs()) ? IDe : cr(Hs));
        sr = await B4t(
          M.agentId ?? "main",
          hs,
          (Hs) => {
            ((xr = Hs), ms.restartDeadline());
          },
          { commitTurn: Ur },
        );
      } finally {
        (ms(), xJ(w, g));
      }
      if (sr === IDe)
        return {
          behavior: "deny",
          message: ww,
          decisionReason: {
            type: "other",
            reason: "Cancelled at the classifier billing notice",
          },
        };
      if (
        Zr &&
        !sr.unavailable &&
        !sr.transcriptTooLong &&
        !sr.refusedBySafeguard
      )
        xZ(s1(M.agentId));
      let Fr,
        zo = sCn(sr) ? Ur.reached() : void 0;
      if (zo !== void 0) {
        let Yr = Date.now();
        (await zo, (Fr = Date.now() - Yr));
      }
      {
        if (
          ((xe = i0(e, fe(M))),
          !(xe === Xe.mode && ug() === Xe.autoActive) && !y0t(xe, $e, e, n))
        ) {
          if (
            (i("tengu_auto_mode_fallback_to_ask", {
              reason: b("mode_changed_while_queued"),
              toolName: Fn(e.name),
              isMcp: e.isMcp ?? !1,
              ...U(),
            }),
            xe === "dontAsk")
          )
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: Kde(e.name),
            };
          if (fe(M).shouldAvoidPermissionPrompts) return F$(_e.message);
          return _e;
        }
        let Dr = St("ask_level_while_queued");
        if (Dr) return Dr;
      }
      let Sr = sr.unavailable
          ? "unavailable"
          : sr.refusedBySafeguard
            ? "refused"
            : sr.shouldBlock
              ? "blocked"
              : "allowed",
        Cr = mrn(sr);
      L$(M.session, {
        tool: e.name,
        allowlisted: !1,
        decision: Sr,
        classifierModel: sr.model,
        inputTokens: sr.usage?.inputTokens,
        outputTokens: sr.usage?.outputTokens,
        cacheReadInputTokens: sr.usage?.cacheReadInputTokens,
        cacheCreationInputTokens: sr.usage?.cacheCreationInputTokens,
        durationMs: sr.durationMs,
        costUSD: Cr,
        stage: sr.stage,
        category: sr.category,
        stage1Severity: sr.stage1Severity,
        stage2Severity: sr.stage2Severity,
        originalDecisionReasonType: _e.decisionReason?.type,
        editClassificationGated: yr,
        serverVerdictOverrodeFastPath: Do,
        serverHeldShellAllowFrom: fn,
        classifierSource: yn && !Zr ? "server" : "local",
        serverClassifierNoVerdict: yn ? (Ww(await xo(), g) ?? k0t(sr)) : void 0,
      });
      let ys = bt?.onBlock === "flag" ? Jyt(sr) : void 0,
        As =
          sr.shouldBlock &&
          !sr.unavailable &&
          sr.errorKind !== i5 &&
          !sr.transcriptTooLong &&
          !sr.refusedBySafeguard &&
          ys === void 0;
      if (
        (i("tengu_auto_mode_decision", {
          decision: c(Sr),
          toolName: Fn(e.name),
          isMcp: e.isMcp ?? !1,
          ...U(),
          inProtectedNamespace: JI(),
          ...ge(),
          chromeAutomode: Le,
          chromeNavigationForced: kr !== void 0,
          hookAllowVouch: M.hookAllowVouched === !0,
          mcpAlwaysAllowOverride: kn,
          mcpServerAskOverride: Yt,
          ...N$(e.name, n),
          stripAllBashFlag: M0e(),
          originalDecisionReasonType: pe(_e.decisionReason?.type),
          circuitBreaker: pe(
            kg(_e.decisionReason, (Yr) => Yr.circuitBreaker !== void 0)
              ?.circuitBreaker,
          ),
          editClassificationGated: yr,
          serverVerdictOverrodeFastPath: Do,
          serverHeldShellAllowFrom: pe(fn),
          agentMsgId: be(s.message.id),
          sameTurnSiblings: mr.length,
          classifierQueueDepth: xr?.queueDepth,
          classifierQueueWaitMs: xr?.queueWaitMs,
          ...(xr?.overlap !== void 0 && {
            classifierQueueOverlapEnabled: !0,
            classifierQueueInFlightAtStart: xr.overlap.inFlightAtStart,
            classifierQueueOverlapped: xr.overlap.overlapped,
            classifierQueueReleasedByEscalation:
              xr.overlap.releasedByEscalation,
            classifierQueueCommitWaitMs: Fr,
          }),
          classifierSource: yn && !Zr ? b("server") : b("local"),
          serverClassifierNoVerdict: yn
            ? pe(Ww(await xo(), g) ?? k0t(sr))
            : void 0,
          classifierModel: Et(sr.model),
          classifierCategory: F5t(sr.category),
          classifierStage1Severity: sr.stage1Severity,
          classifierStage2Severity: sr.stage2Severity,
          consecutiveDenials: sr.shouldBlock
            ? zn.consecutiveDenials + (As ? 1 : 0)
            : 0,
          totalDenials: zn.totalDenials + (As ? 1 : 0),
          classifierInputTokens: sr.usage?.inputTokens,
          classifierOutputTokens: sr.usage?.outputTokens,
          classifierCacheReadInputTokens: sr.usage?.cacheReadInputTokens,
          classifierCacheCreationInputTokens:
            sr.usage?.cacheCreationInputTokens,
          classifierDurationMs: sr.durationMs,
          classifierSystemPromptLength: sr.promptLengths?.systemPrompt,
          classifierToolCallsLength: sr.promptLengths?.toolCalls,
          classifierUserPromptsLength: sr.promptLengths?.userPrompts,
          sessionInputTokens: b3e(),
          sessionOutputTokens: Wu(),
          sessionCacheReadInputTokens: S3e(),
          sessionCacheCreationInputTokens: w3e(),
          classifierCostUSD: Cr,
          classifierStage: pe(sr.stage),
          classifierFailureMode: pe(sr.failureMode),
          classifierStage1InputTokens: sr.stage1Usage?.inputTokens,
          classifierStage1OutputTokens: sr.stage1Usage?.outputTokens,
          classifierStage1CacheReadInputTokens:
            sr.stage1Usage?.cacheReadInputTokens,
          classifierStage1CacheCreationInputTokens:
            sr.stage1Usage?.cacheCreationInputTokens,
          classifierStage1DurationMs: sr.stage1DurationMs,
          classifierStage1RequestId: be(sr.stage1RequestId),
          classifierStage1MsgId: be(sr.stage1MsgId),
          classifierStage1CostUSD:
            sr.stage1Usage && sr.model ? Lfe(sr.model, sr.stage1Usage) : void 0,
          classifierStage2InputTokens: sr.stage2Usage?.inputTokens,
          classifierStage2OutputTokens: sr.stage2Usage?.outputTokens,
          classifierStage2CacheReadInputTokens:
            sr.stage2Usage?.cacheReadInputTokens,
          classifierStage2CacheCreationInputTokens:
            sr.stage2Usage?.cacheCreationInputTokens,
          classifierStage2DurationMs: sr.stage2DurationMs,
          classifierStage2RequestId: be(sr.stage2RequestId),
          classifierStage2MsgId: be(sr.stage2MsgId),
          classifierStage2CostUSD:
            sr.stage2Usage && sr.model ? Lfe(sr.model, sr.stage2Usage) : void 0,
        }),
        bt !== void 0 && sr.classifierRan === !1)
      )
        return (
          t(
            `${e.name} declares classifierOnly() but serialized to an empty classifier action; denying`,
            { level: "error" },
          ),
          {
            behavior: "deny",
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: sr.reason,
              noVerdict: !0,
            },
            message: `${e.name} was not reviewed: it gave the auto mode classifier nothing to judge (its toAutoClassifierInput is empty), and only the classifier can allow it. This is a tool bug, not a judgment on the action.`,
          }
        );
      if (ys !== void 0)
        return (
          FEe(g, ys),
          t(
            `Auto mode classifier gave no verdict for ${e.name} (${ys.kind}); delivering flagged`,
            { level: "warn" },
          ),
          {
            behavior: "allow",
            updatedInput: _e.updatedInput ?? n,
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason:
                ys.kind === "refused"
                  ? "Delivered with a warning: the classifier request was refused by the safety safeguard"
                  : "Delivered with a note: the classifier could not review it",
              noVerdict: !0,
            },
          }
        );
      if (sr.shouldBlock) {
        if (sr.transcriptTooLong) {
          if (bt !== void 0 && !Ee.shouldAvoidPermissionPrompts)
            return (
              t(
                `Auto mode classifier transcript too long for ${e.name}, denying (classifierOnly: no prompt fallback)`,
                { level: "warn" },
              ),
              {
                behavior: "deny",
                decisionReason: {
                  type: "classifier",
                  classifier: "auto-mode",
                  reason: q4e,
                  noVerdict: !0,
                },
                message: `${e.name} was not reviewed: the auto mode classifier transcript exceeded its context window, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe; the same call will hit the same limit until the conversation is shorter.`,
              }
            );
          if (e.name === mt)
            return {
              behavior: "allow",
              updatedInput: n,
              decisionReason: { type: "mode", mode: "auto" },
            };
          if (wo)
            return (
              t(
                "Auto mode classifier transcript too long for AskUserQuestion, falling back to the question dialog",
                { level: "warn" },
              ),
              i("tengu_auto_mode_fallback_to_ask", {
                reason: b("requires_user_interaction"),
                toolName: Fn(e.name),
                isMcp: e.isMcp ?? !1,
                ...U(),
              }),
              _e
            );
          if (Ee.shouldAvoidPermissionPrompts)
            throw new Ue(
              "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
            );
          if (
            (t(
              "Auto mode classifier transcript too long, falling back to normal permission handling",
              { level: "warn" },
            ),
            i("tengu_auto_mode_fallback_to_ask", {
              reason: b("transcript_too_long"),
              toolName: Fn(e.name),
              isMcp: e.isMcp ?? !1,
              ...U(),
            }),
            xe === "dontAsk")
          )
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: Kde(e.name),
            };
          return {
            ..._e,
            decisionReason: ODe(_e, { type: "other", reason: q4e }),
          };
        }
        let Yr = sr.errorKind === i5 && !sr.refusedBySafeguard;
        if (sr.unavailable || Yr) {
          if (wo && !Yr)
            return (
              t(
                "Auto mode classifier unavailable for AskUserQuestion, falling back to the question dialog",
                { level: "warn" },
              ),
              i("tengu_auto_mode_fallback_to_ask", {
                reason: b("requires_user_interaction"),
                toolName: Fn(e.name),
                isMcp: e.isMcp ?? !1,
                ...U(),
              }),
              _e
            );
          let Or = s.serverClassifierRequest;
          if (
            yn &&
            !Zr &&
            !Yr &&
            Or !== void 0 &&
            Hgt(sr.errorKind, (await xo()).kind === "per_call") &&
            $gt()
          ) {
            let gs = await tMo(Or, M, w, g);
            if (gs.kind === "stop") return nMo(e, M, gs.recorded);
            if (gs.interrupted) throw new Ue();
          }
          return (
            t(
              sr.retryAfterMs === void 0
                ? "Auto mode classifier unavailable, denying with retry guidance (fail closed)"
                : "Auto mode classifier told to wait by the API, denying (fail closed)",
              { level: "warn" },
            ),
            {
              behavior: "deny",
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: Jke,
              },
              message: b6t(
                e.name,
                sr.model,
                sr.httpStatus,
                sr.errorKind,
                sr.retryAfterMs,
              ),
            }
          );
        }
        if (sr.refusedBySafeguard) {
          if (Ee.shouldAvoidPermissionPrompts)
            throw new Ue(
              "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
            );
          return (
            t(
              "Auto mode classifier request refused by the safety safeguard, denying (exempt from the denial counter)",
              { level: "warn" },
            ),
            {
              behavior: "deny",
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: sr.reason,
                noVerdict: !0,
              },
              message: rEt(sr.reason, { refused: !0 }),
            }
          );
        }
        let Dr = $$(M, Lxe);
        if (
          (t(`Auto mode classifier blocked action: ${sr.reason}`, {
            level: "warn",
          }),
          bt?.onBlock === "flag")
        )
          return (
            FEe(g, { kind: "blocked", reason: sr.reason }),
            {
              behavior: "allow",
              updatedInput: _e.updatedInput ?? n,
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: `Flagged by the classifier, delivered with its warning: ${sr.reason}`,
              },
            }
          );
        let Pr =
          wo || (bt !== void 0 && !Ee.shouldAvoidPermissionPrompts)
            ? null
            : oMo(Dr, sr.reason, s, e, _e, M, Ia(xe), {
                ...S0t(sr, M.agentId),
                decideLocation: "pre-ask",
              });
        if (Pr) {
          if (xe === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: Kde(e.name),
            };
          return Pr;
        }
        return S0t(sr, M.agentId);
      }
      if ((!wo && !Nn) || !rq(M.requestDialog !== void 0))
        Ur.runInTurn(() => $$(M, tP));
      if (wo)
        return (
          i("tengu_auto_mode_fallback_to_ask", {
            reason: b("requires_user_interaction"),
            toolName: Fn(e.name),
            isMcp: e.isMcp ?? !1,
            ...U(),
          }),
          _e
        );
      return gt({
        updatedInput: _e.updatedInput ?? n,
        decisionReason: {
          type: "classifier",
          classifier: "auto-mode",
          reason: sr.reason,
        },
        classifierRan: sr.classifierRan,
      });
    }
    if (xe === "bypassPermissions" && !Sbe(_e) && A0t(M)) {
      let Xe = kg(_e.decisionReason, tMt),
        We = Xe !== void 0 ? p1() : void 0;
      if (Xe !== void 0 && We?.enabled) return b0t(_e, Xe, M, We);
    }
    if (fe(M).shouldAvoidPermissionPrompts) {
      let Xe = C0t(_e),
        We = await oCn(h, e, n, Xe.behavior === "ask" ? Xe : _e, g, M);
      if (We) return We;
      return {
        behavior: "deny",
        decisionReason: {
          type: "asyncAgent",
          reason: "Permission prompts are not available in this context",
        },
        message: _0t(M)
          ? b6t(e.name, i1, void 0, "server_not_requested")
          : F0t(e.name),
      };
    }
  }
  return _e;
};
