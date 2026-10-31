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

  apply(resolve());

  document.addEventListener("DOMContentLoaded", function () {
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
