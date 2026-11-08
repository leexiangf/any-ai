/**
 * Client-side search + sort + catalog filter for Orca plugin grids.
 * Expects: #catalog-q, #catalog-sort, #catalog-kind?, #catalog-count,
 *          [data-catalog] > .item[data-name][data-stars][data-installs?][data-catalog-kind?]
 */
(function () {
  var list = document.querySelector("[data-catalog]");
  if (!list) return;

  var items = Array.prototype.slice.call(list.querySelectorAll(":scope > .item"));
  if (!items.length) return;

  var q = document.getElementById("catalog-q");
  var sort = document.getElementById("catalog-sort");
  var kind = document.getElementById("catalog-kind");
  var vis = document.getElementById("catalog-visibility");
  var countEl = document.getElementById("catalog-count");
  var emptyEl = document.getElementById("catalog-empty");

  function apply() {
    var query = ((q && q.value) || "").trim().toLowerCase();
    var mode = (sort && sort.value) || "stars-desc";
    var catalogKind = ((kind && kind.value) || "all").toLowerCase();
    var visibility = ((vis && vis.value) || "all").toLowerCase();

    var visible = [];
    var hidden = [];

    items.forEach(function (el) {
      var name = (el.getAttribute("data-name") || "").toLowerCase();
      var owner = (el.getAttribute("data-owner") || "").toLowerCase();
      var one = "";
      var oneEl = el.querySelector(".item-one");
      if (oneEl) one = (oneEl.textContent || "").toLowerCase();
      var itemKind = (el.getAttribute("data-catalog-kind") || "").toLowerCase();
      if (!itemKind) {
        itemKind = owner === "stablyai" ? "official" : "community";
      }
      var itemVis = (el.getAttribute("data-visibility") || "unknown").toLowerCase();
      var kindOk = catalogKind === "all" || itemKind === catalogKind;
      var visOk =
        visibility === "all" ||
        itemVis === visibility ||
        (visibility === "needs-ref" && (itemVis === "web-ref" || itemVis === "unknown"));
      var hit =
        kindOk &&
        visOk &&
        (!query ||
          name.indexOf(query) !== -1 ||
          owner.indexOf(query) !== -1 ||
          one.indexOf(query) !== -1);
      el.hidden = !hit;
      if (hit) visible.push(el);
      else hidden.push(el);
    });

    visible.sort(function (a, b) {
      var sa = Number(a.getAttribute("data-stars") || 0);
      var sb = Number(b.getAttribute("data-stars") || 0);
      var ia = Number(a.getAttribute("data-installs") || 0);
      var ib = Number(b.getAttribute("data-installs") || 0);
      var na = (a.getAttribute("data-name") || "").toLowerCase();
      var nb = (b.getAttribute("data-name") || "").toLowerCase();
      if (mode === "installs-desc") return ib - ia || sb - sa || na.localeCompare(nb);
      if (mode === "stars-desc") return sb - sa || na.localeCompare(nb);
      if (mode === "stars-asc") return sa - sb || na.localeCompare(nb);
      if (mode === "name-desc") return nb.localeCompare(na);
      return na.localeCompare(nb);
    });

    visible.forEach(function (el) {
      list.appendChild(el);
    });
    hidden.forEach(function (el) {
      list.appendChild(el);
    });

    if (countEl) {
      countEl.hidden = false;
      var bits = [];
      if (query || catalogKind !== "all") {
        bits.push(visible.length + " of " + items.length + " plugins");
      } else {
        bits.push(items.length + " plugins");
      }
      bits.push("sorted by " + labelFor(mode));
      if (catalogKind !== "all") bits.push(catalogKind);
      countEl.textContent = bits.join(" · ");
    }
    if (emptyEl) emptyEl.hidden = visible.length > 0;
  }

  function labelFor(mode) {
    if (mode === "installs-desc") return "installs ↓";
    if (mode === "stars-asc") return "stars ↑";
    if (mode === "name-asc") return "name A–Z";
    if (mode === "name-desc") return "name Z–A";
    return "stars ↓";
  }

  if (q) q.addEventListener("input", apply);
  if (sort) sort.addEventListener("change", apply);
  if (kind) kind.addEventListener("change", apply);
  if (vis) vis.addEventListener("change", apply);
  apply();
})();
