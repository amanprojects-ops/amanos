    // -------- Tabs (simple + accessible-ish) --------
    (function setupTabs() {
      const win = document.getElementById("appWindow");
      const tabButtons = Array.from(win.querySelectorAll('menu[role="tablist"] > button[role="tab"]'));
      const panels = Array.from(win.querySelectorAll('article[role="tabpanel"]'));

      function activate(btn) {
        const targetId = btn.getAttribute("aria-controls");

        tabButtons.forEach(b => b.setAttribute("aria-selected", String(b === btn)));
        panels.forEach(p => {
          if (p.id === targetId) p.removeAttribute("hidden");
          else p.setAttribute("hidden", "");
        });
      }

      tabButtons.forEach(btn => btn.addEventListener("click", () => activate(btn)));
    })();

    // -------- Window manager behavior (drag/min/max/close) --------
    (function setupWindow() {
      const win = document.getElementById("appWindow");
      const titleBar = win.querySelector(".title-bar");

      const btnMin = document.getElementById("btnMin");
      const btnMax = document.getElementById("btnMax");
      const btnClose = document.getElementById("btnClose");

      // store restore info for maximize/restore
      let restore = { left: "80px", top: "80px", width: "400px", height: "" };

      // ---- Helpers ----
      function isMaximized() { return win.classList.contains("maximized"); }
      function isMinimized() { return win.classList.contains("minimized"); }

      function saveRestoreRect() {
        const rect = win.getBoundingClientRect();
        restore.left = rect.left + "px";
        restore.top = rect.top + "px";
        restore.width = rect.width + "px";
        restore.height = win.style.height || "";
      }

      function restoreFromSaved() {
        win.classList.remove("maximized");
        win.style.left = restore.left;
        win.style.top = restore.top;
        win.style.width = restore.width;
        win.style.height = restore.height;
      }

      function clamp(val, min, max) {
        return Math.min(max, Math.max(min, val));
      }

      function bringToFront() {
        // single-window demo: no z-index stacking needed
        // If you later add multiple windows, implement z-index incrementing here.
      }

      // ---- Minimize ----
      btnMin.addEventListener("click", (e) => {
        e.stopPropagation();
        win.classList.toggle("minimized");
      });

      // ---- Maximize/Restore ----
      btnMax.addEventListener("click", (e) => {
        e.stopPropagation();

        if (!isMaximized()) {
          // If minimized, unminimize first
          win.classList.remove("minimized");
          saveRestoreRect();
          win.classList.add("maximized");
        } else {
          restoreFromSaved();
        }
      });

      // Double-click title bar to toggle maximize
      titleBar.addEventListener("dblclick", (e) => {
        if (e.target.closest(".title-bar-controls")) return;
        btnMax.click();
      });

      // ---- Close (hide) ----
      btnClose.addEventListener("click", (e) => {
        e.stopPropagation();
        win.classList.add("closed");
        console.log("win is:", win, "class:", win.className);
        console.log("Has closed?", win.classList.contains("closed"));
      });

      // ---- Dragging ----
      let dragging = false;
      let pointerId = null;
      let startX = 0, startY = 0;
      let startLeft = 0, startTop = 0;

      titleBar.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return; // left mouse only
        if (e.target.closest(".title-bar-controls")) return;
        if (isMaximized()) return; // typically you don't drag when maximized

        bringToFront();

        dragging = true;
        pointerId = e.pointerId;
        win.classList.add("dragging");

        // capture pointer so we keep getting events
        titleBar.setPointerCapture(pointerId);

        const rect = win.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        // ensure absolute positioning in px
        win.style.position = "absolute";
        win.style.left = rect.left + "px";
        win.style.top = rect.top + "px";

        // prevent text selection / iframe weirdness
        e.preventDefault();
      });

      function onMove(e) {
        if (!dragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const rect = win.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;

        const newLeft = clamp(startLeft + dx, 0, Math.max(0, maxLeft));
        const newTop = clamp(startTop + dy, 0, Math.max(0, maxTop));

        win.style.left = newLeft + "px";
        win.style.top = newTop + "px";
      }

      function stopDrag(e) {
        if (!dragging) return;
        dragging = false;
        win.classList.remove("dragging");
        try { titleBar.releasePointerCapture(pointerId); } catch { }
        pointerId = null;
      }

      // listen on window so we always end the drag cleanly
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);

      // If user alt-tabs or leaves the page mid-drag, stop anyway
      window.addEventListener("blur", () => { if (dragging) stopDrag({}); });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && dragging) stopDrag({});
      });

      // Keep window within bounds on resize (especially if near edges)
      window.addEventListener("resize", () => {
        if (isMaximized() || win.classList.contains("closed")) return;
        const rect = win.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        win.style.left = clamp(rect.left, 0, Math.max(0, maxLeft)) + "px";
        win.style.top = clamp(rect.top, 0, Math.max(0, maxTop)) + "px";
      });

      // Click window to "activate"
      win.addEventListener("mousedown", () => bringToFront());
    })();

    (function makeResizable() {
      const win = document.getElementById("appWindow");

      const minW = 260;
      const minH = 140;

      let resizing = false;
      let dir = "";
      let startX = 0, startY = 0;
      let startLeft = 0, startTop = 0, startW = 0, startH = 0;
      let pointerId = null;

      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

      function isMaximized() {
        return win.classList.contains("maximized");
      }

      win.querySelectorAll(".resize-handle").forEach(h => {
        h.addEventListener("pointerdown", (e) => {
          if (isMaximized()) return;

          resizing = true;
          dir = h.dataset.dir;
          pointerId = e.pointerId;

          const rect = win.getBoundingClientRect();
          startX = e.clientX;
          startY = e.clientY;
          startLeft = rect.left;
          startTop = rect.top;
          startW = rect.width;
          startH = rect.height;

          // ensure style values are set in px
          win.style.position = "absolute";
          win.style.left = rect.left + "px";
          win.style.top = rect.top + "px";
          win.style.width = rect.width + "px";
          win.style.height = rect.height + "px";

          h.setPointerCapture(pointerId);
          e.preventDefault();
          e.stopPropagation();
        });
      });

      function onMove(e) {
        if (!resizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // compute new rect based on direction
        let newLeft = startLeft;
        let newTop = startTop;
        let newW = startW;
        let newH = startH;

        // East / West affect width (and left for W)
        if (dir.includes("e")) newW = startW + dx;
        if (dir.includes("w")) {
          newW = startW - dx;
          newLeft = startLeft + dx;
        }

        // South / North affect height (and top for N)
        if (dir.includes("s")) newH = startH + dy;
        if (dir.includes("n")) {
          newH = startH - dy;
          newTop = startTop + dy;
        }

        // enforce minimum sizes
        if (newW < minW) {
          if (dir.includes("w")) newLeft -= (minW - newW);
          newW = minW;
        }
        if (newH < minH) {
          if (dir.includes("n")) newTop -= (minH - newH);
          newH = minH;
        }

        // keep inside viewport (simple clamp)
        const maxLeft = window.innerWidth - newW;
        const maxTop = window.innerHeight - newH;
        newLeft = clamp(newLeft, 0, Math.max(0, maxLeft));
        newTop = clamp(newTop, 0, Math.max(0, maxTop));

        // apply
        win.style.left = newLeft + "px";
        win.style.top = newTop + "px";
        win.style.width = newW + "px";
        win.style.height = newH + "px";
      }

      function stop(e) {
        if (!resizing) return;
        resizing = false;
        try {
          // release capture from whichever handle started it
          win.querySelector(`.resize-handle[data-dir="${dir}"]`)?.releasePointerCapture(pointerId);
        } catch { }
        pointerId = null;
        dir = "";
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    })();

    (function setupDesktopIcon() {
      const icon = document.getElementById("appIcon");
      const win = document.getElementById("appWindow");

      function selectIcon(on) {
        icon.classList.toggle("selected", !!on);
        if (on) icon.focus({ preventScroll: true });
      }

      function openWindow() {
        win.classList.remove("closed");
        // If it was minimized, restore it
        win.classList.remove("minimized");
      }

      // Single click selects (Windows-style)
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        selectIcon(true);
      });

      // Double click opens
      icon.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        openWindow();
      });

      // Keyboard: Enter/Space opens
      icon.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openWindow();
        }
      });

      // Click empty desktop clears selection
      document.querySelector(".desktop").addEventListener("click", () => {
        selectIcon(false);
      });

      // Clicking the window should deselect the icon (optional, feels Windows-y)
      win.addEventListener("mousedown", () => selectIcon(false));
    })();
