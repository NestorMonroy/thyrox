(function () {
  var sidebarConfigs = [
    {
      selector: ".md-sidebar--primary",
      collapsedClass: "ai-notes-nav-collapsed",
      storageKey: "ai-notes-sidebar-nav-collapsed",
      buttonClass: "ai-notes-sidebar-toggle--primary",
      restoreClass: "ai-notes-sidebar-restore--primary",
      collapseLabel: "折叠左侧导航",
      restoreLabel: "展开左侧导航",
      collapseIcon: "M15 6 9 12l6 6",
      restoreIcon: "M9 6l6 6-6 6"
    },
    {
      selector: ".md-sidebar--secondary",
      collapsedClass: "ai-notes-toc-collapsed",
      storageKey: "ai-notes-sidebar-toc-collapsed",
      buttonClass: "ai-notes-sidebar-toggle--secondary",
      restoreClass: "ai-notes-sidebar-restore--secondary",
      collapseLabel: "折叠右侧目录",
      restoreLabel: "展开右侧目录",
      collapseIcon: "M9 6l6 6-6 6",
      restoreIcon: "M15 6 9 12l6 6"
    }
  ];

  function icon(path) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"></path></svg>';
  }

  function setCollapsed(config, collapsed) {
    document.body.classList.toggle(config.collapsedClass, collapsed);
    try {
      localStorage.setItem(config.storageKey, collapsed ? "1" : "0");
    } catch (_error) {
      return;
    }
  }

  function storedCollapsed(config) {
    try {
      return localStorage.getItem(config.storageKey) === "1";
    } catch (_error) {
      return false;
    }
  }

  function createButton(className, label, path) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon(path);
    return button;
  }

  function installToggle(config) {
    var sidebar = document.querySelector(config.selector);
    if (!sidebar) {
      return;
    }
    var scrollwrap = sidebar.querySelector(".md-sidebar__scrollwrap") || sidebar;
    var collapseButton = createButton(
      "ai-notes-sidebar-toggle " + config.buttonClass,
      config.collapseLabel,
      config.collapseIcon
    );
    var restoreButton = createButton(
      "ai-notes-sidebar-restore " + config.restoreClass,
      config.restoreLabel,
      config.restoreIcon
    );

    collapseButton.addEventListener("click", function () {
      setCollapsed(config, true);
    });
    restoreButton.addEventListener("click", function () {
      setCollapsed(config, false);
    });

    scrollwrap.prepend(collapseButton);
    document.body.appendChild(restoreButton);
    setCollapsed(config, storedCollapsed(config));
  }

  function scrollKey() {
    return "ai-notes-scroll:" + location.origin + location.pathname + location.search;
  }

  function saveScrollPosition() {
    try {
      sessionStorage.setItem(scrollKey(), String(Math.round(window.scrollY || window.pageYOffset || 0)));
    } catch (_error) {
      return;
    }
  }

  function restoreScrollPosition() {
    if (location.hash) {
      return;
    }
    var value;
    try {
      value = sessionStorage.getItem(scrollKey());
    } catch (_error) {
      return;
    }
    var y = Number(value);
    if (!Number.isFinite(y) || y <= 0) {
      return;
    }
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    requestAnimationFrame(function () {
      window.scrollTo({ top: y, left: 0, behavior: "auto" });
      setTimeout(function () {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      }, 120);
    });
  }

  function installScrollMemory() {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(function () {
        saveScrollPosition();
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener("pagehide", saveScrollPosition);
    restoreScrollPosition();
  }

  document.addEventListener("DOMContentLoaded", function () {
    sidebarConfigs.forEach(installToggle);
    installScrollMemory();
  });
})();
