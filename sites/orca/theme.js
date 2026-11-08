(function () {
  var KEY = "aiaaii-theme";

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function readCookie() {
    var m = document.cookie.match(/(?:^|; )aiaaii-theme=(light|dark)/);
    return m ? m[1] : null;
  }

  function writeCookie(theme) {
    if (!/\.aiaaii\.com$/i.test(location.hostname) && location.hostname !== "aiaaii.com") {
      return;
    }
    document.cookie =
      "aiaaii-theme=" +
      theme +
      ";path=/;max-age=31536000;domain=.aiaaii.com;SameSite=Lax";
  }

  function getStored() {
    try {
      var local = localStorage.getItem(KEY);
      if (local === "light" || local === "dark") return local;
    } catch (e) {}
    return readCookie();
  }

  function setStored(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    writeCookie(theme);
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      var next = theme === "dark" ? "light" : "dark";
      btn.setAttribute(
        "aria-label",
        next === "dark" ? "Switch to dark theme" : "Switch to light theme"
      );
      btn.title = next === "dark" ? "Dark" : "Light";
    }
  }

  function resolve() {
    return getStored() || systemTheme();
  }

  function mountTopRail() {
    if (document.querySelector(".top-rail")) return;

    var rail = document.createElement("div");
    rail.className = "top-rail";
    rail.setAttribute("role", "navigation");
    rail.setAttribute("aria-label", "Site");

    var home = document.createElement("a");
    home.className = "fixed-home";
    home.href = "https://aiaaii.com/";
    home.textContent = "Home";
    home.setAttribute("aria-label", "Any AI home");
    rail.appendChild(home);

    var gh = document.createElement("a");
    gh.className = "fixed-home";
    gh.href = "https://github.com/leexiangf/any-ai";
    gh.target = "_blank";
    gh.rel = "noopener noreferrer";
    gh.textContent = "GitHub";
    gh.setAttribute("aria-label", "Any AI on GitHub");
    gh.title = "GitHub";
    rail.appendChild(gh);


    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) rail.appendChild(btn);

    document.body.appendChild(rail);
  }

  apply(resolve());

  function mountCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var root = btn.closest(".install-block, .marketplace-strip-block") || btn.parentElement;
        var target = root && root.querySelector("[data-copy-target]");
        var text = target ? target.textContent.trim() : "";
        if (!text) return;
        var done = function () {
          var prev = btn.textContent;
          btn.textContent = btn.getAttribute("data-copied-label") || "Copied";
          btn.setAttribute("data-copied", "");
          setTimeout(function () {
            btn.textContent = prev;
            btn.removeAttribute("data-copied");
          }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
          return;
        }
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          done();
        } catch (e) {}
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    mountTopRail();
    mountCopyButtons();
    apply(resolve());
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      setStored(next);
      apply(next);
    });
  });

  try {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function () {
        if (!getStored()) apply(systemTheme());
      });
  } catch (e) {}
})();
