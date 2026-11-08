/**
 * Build Chinese mirrors under sites/orca/zh/ for static pages, categories, and items.
 * Plugin descriptions stay English; chrome / labels / nav become zh-CN.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "sites", "orca");
const ZH = path.join(ROOT, "zh");
const DOMAIN = "https://orca.aiaaii.com";

const THEME_BOOT = `    <script>
      (function () {
        try {
          var k = "aiaaii-theme";
          var t = localStorage.getItem(k);
          if (t !== "light" && t !== "dark") {
            var m = document.cookie.match(/(?:^|; )aiaaii-theme=(light|dark)/);
            t = m ? m[1] : null;
          }
          if (t !== "light" && t !== "dark") {
            t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          }
          document.documentElement.setAttribute("data-theme", t);
        } catch (e) {}
      })();
    </script>`;

const CAT_ZH = {
  themes: { h1: "Orca 主题插件", lead: "应用界面与终端配色主题。" },
  languages: { h1: "语言", lead: "语法高亮与界面语言包。" },
  icons: { h1: "图标", lead: "文件与文件夹图标主题。" },
  editors: { h1: "编辑器", lead: "自定义编辑器、预览与图表工具。" },
  "commands-panels": { h1: "命令与面板", lead: "侧栏面板、命令、skills、小游戏。" },
  "remote-vms": { h1: "远程 / 虚拟机", lead: "虚拟机配方、沙箱、远程工作区。" },
  marketplaces: { h1: "市场源", lead: "插件目录与 marketplace 索引源。" },
  "content-packs": { h1: "内容包", lead: "内容与资源包。" },
  keybindings: { h1: "快捷键", lead: "键位与快捷键方案。" },
  syntax: { h1: "语法", lead: "语法高亮与语言支持。" },
  "terminal-themes": { h1: "终端主题", lead: "终端配色主题。" },
  "vm-recipes": { h1: "虚拟机配方", lead: "虚拟机与沙箱配方。" },
};

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(rel, html) {
  const out = path.join(ZH, rel);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, html, "utf8");
}

function zhNav(active = "") {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<nav class="nav" aria-label="主导航">
              ${link("/zh/items/", "插件目录", "items")}
              ${link("/zh/guides/", "指南", "guides")}
              ${link("/zh/changelog/", "更新", "changelog")}
              ${link("/zh/submit/", "提交", "submit")}
              ${link("/zh/about/", "关于", "about")}
              <a href="/">English</a>
            </nav>`;
}

function pageShell({ title, description, canonicalPath, enPath, navActive, heroTitle, heroLead, body, footerExtra = "" }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${DOMAIN}${canonicalPath}" />
    <link rel="alternate" hreflang="en" href="${DOMAIN}${enPath}" />
    <link rel="alternate" hreflang="zh-CN" href="${DOMAIN}${canonicalPath}" />
${THEME_BOOT}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/zh/">
            <span class="brand-name">Orca Plugin Market</span>
            <span class="brand-domain">orca.aiaaii.com · 中文</span>
          </a>
          <div class="header-end">
            ${zhNav(navActive)}
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="切换主题" title="Theme">
              <span class="theme-toggle-icon" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
      <header class="page-hero">
        <div class="wrap">
          <h1>${heroTitle}</h1>
          <p>${heroLead}</p>
        </div>
      </header>
    </div>
    <main class="section">
${body}
    </main>
    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="footer-row">
          <div>
            <a href="/zh/items/">插件目录</a>
            <a href="/zh/guides/">指南</a>
            <a href="/zh/about/">关于</a>
            <a href="${enPath}">English</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI 总站</a>
          </div>
          <p>与 Orca / Stably 无关 · 实验性${footerExtra}</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
  </body>
</html>
`;
}

function localizeChrome(html, { enPath, zhPath }) {
  let out = html;
  out = out.replace(/<html\s+lang="en"/, '<html lang="zh-CN"');
  out = out.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]*"\s*\/>/g, "");
  out = out.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${DOMAIN}${zhPath}" />\n    <link rel="alternate" hreflang="en" href="${DOMAIN}${enPath}" />\n    <link rel="alternate" hreflang="zh-CN" href="${DOMAIN}${zhPath}" />`
  );
  // brand home
  out = out.replace(/href="\/"/g, 'href="/zh/"');
  out = out.replace(/href="\/items\//g, 'href="/zh/items/');
  out = out.replace(/href="\/categories\//g, 'href="/zh/categories/');
  out = out.replace(/href="\/guides\//g, 'href="/zh/guides/');
  out = out.replace(/href="\/about\/"/g, 'href="/zh/about/"');
  out = out.replace(/href="\/submit\/"/g, 'href="/zh/submit/"');
  out = out.replace(/href="\/changelog\/"/g, 'href="/zh/changelog/"');
  out = out.replace(/href="\/glossary\/"/g, 'href="/zh/glossary/"');
  // undo wrong rewrites for absolute external already fine

  const navReplacements = [
    [/>Plugins</g, ">插件目录<"],
    [/>Guides</g, ">指南<"],
    [/>Submit</g, ">提交<"],
    [/>About</g, ">关于<"],
    [/>Changelog</g, ">更新<"],
    [/>Home</g, ">首页<"],
    [/>中文</g, ">English<"],
    [/href="\/zh\/">English</g, 'href="/">English<'],
    [/aria-label="Primary"/g, 'aria-label="主导航"'],
    [/aria-label="Switch color theme"/g, 'aria-label="切换主题"'],
    [/Search plugins by name/g, "按名称搜索插件"],
    [/placeholder="Search by name…"/g, 'placeholder="按名称搜索…"'],
    [/placeholder="Search by name\.\.\."/g, 'placeholder="按名称搜索…"'],
    [/>Featured</g, ">精选<"],
    [/High-traffic official listings from the Orca catalog\./g, "官方目录中安装量较高的插件。"],
    [/Orca plugin directory/g, "Orca 插件目录"],
    [/Orca 插件目录 — sources, pins, visibility/g, "Orca 插件目录 — 安装源、版本钉、可见性"],
    [/Browse community and official Orca plugins with marketplace sources, #ref pins, Featured installs, and visibility labels\. Not a race against onorca\.dev\./g, "浏览社区与官方 Orca 插件：市场源、版本钉、精选与可见性标注。非官方。"],
    [/Install paths &amp; visibility — not “more than official\.” Prefer onorca\.dev when the pack is already in All\./g, "安装路径与可见性说明。官方商店已有的优先用官方。"],
    [/>Author</g, ">作者<"],
    [/>Category</g, ">分类<"],
    [/>Plugin id</g, ">插件 ID<"],
    [/>Version</g, ">版本<"],
    [/>Requires</g, ">要求<"],
    [/>Access</g, ">权限<"],
    [/>License</g, ">许可<"],
    [/>Installs</g, ">安装量<"],
    [/>Catalog</g, ">目录来源<"],
    [/>Official page</g, ">官方页<"],
    [/>Visibility</g, ">可见性<"],
    [/>Review</g, ">审核<"],
    [/>Status</g, ">状态<"],
    [/>Source</g, ">源码<"],
    [/>Screenshots</g, ">截图<"],
    [/>What it adds</g, ">提供的能力<"],
    [/>Core capabilities</g, ">核心能力<"],
    [/>Related plugins</g, ">相关插件<"],
    [/← All plugins/g, "← 全部插件"],
    [/All plugins/g, "全部插件"],
    [/In Orca \(catalog search\)/g, "在 Orca 里（目录搜索）"],
    [/Git source \(pin when required\)/g, "Git 源（需要时加版本）"],
    [/Official catalog page/g, "官方目录页"],
    [/How to install and enable/g, "如何安装并启用"],
    [/Community listing on orca\.aiaaii\.com\./g, "社区收录于 orca.aiaaii.com。"],
    [/unreviewed/g, "未审核"],
    [/>Official</g, ">官方<"],
    [/>Community</g, ">社区<"],
    [/>Themes</g, ">主题<"],
    [/>Languages</g, ">语言<"],
    [/>Icons</g, ">图标<"],
    [/>Editors</g, ">编辑器<"],
    [/>Commands &amp; panels</g, ">命令与面板<"],
    [/>Commands & panels</g, ">命令与面板<"],
    [/>Remote\/VMs</g, ">远程 / 虚拟机<"],
    [/>Marketplaces</g, ">市场源<"],
    [/href="https:\/\/aiaaii\.com\/">首页</g, 'href="https://aiaaii.com/">总站<'],
  ];
  for (const [re, to] of navReplacements) out = out.replace(re, to);

  // inject English twin in nav if missing
  if (!out.includes('href="/">English') && out.includes("</nav>")) {
    out = out.replace(
      "</nav>",
      `<a href="${enPath}">English</a>\n          </nav>`
    );
  }

  // brand domain
  out = out.replace(
    /<span class="brand-domain">orca\.aiaaii\.com(?: · Any AI)?<\/span>/g,
    '<span class="brand-domain">orca.aiaaii.com · 中文</span>'
  );
  out = out.replace(/href="\/zh\/">\s*\n\s*<span class="brand-name"/g, 'href="/zh/">\n            <span class="brand-name"');

  return out;
}

function mirrorTree(relDir) {
  const srcRoot = path.join(ROOT, relDir);
  if (!fs.existsSync(srcRoot)) return 0;
  let n = 0;
  function walk(dir, rel = "") {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const r = path.join(rel, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full, r);
        continue;
      }
      if (name !== "index.html") continue;
      const enPath = `/${relDir}/${r.replace(/\\/g, "/").replace(/index\.html$/, "")}`.replace(/\/+/g, "/");
      const zhPath = `/zh${enPath}`;
      let html = fs.readFileSync(full, "utf8");
      html = localizeChrome(html, { enPath, zhPath });

      if (relDir === "items") {
        if (/<body\s+class="/.test(html)) {
          html = html.replace(/<body\s+class="/, '<body class="item-page ');
        } else {
          html = html.replace("<body>", '<body class="item-page">');
        }
      }

      // category hero titles
      if (relDir === "categories") {
        const slug = r.split(path.sep)[0];
        const meta = CAT_ZH[slug];
        if (meta) {
          html = html.replace(/<h1>[^<]*<\/h1>/, `<h1>${meta.h1}</h1>`);
          html = html.replace(
            /<header class="page-hero">[\s\S]*?<\/header>/,
            `<header class="page-hero">
        <div class="wrap">
          <h1>${meta.h1}</h1>
          <p>${meta.lead}</p>
        </div>
      </header>`
          );
          html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.h1} | Orca Plugin Market</title>`);
        }
      }

      write(path.join(relDir, r), html);
      n++;
    }
  }
  walk(srcRoot);
  return n;
}

function writeStaticPages() {
  write(
    "about/index.html",
    pageShell({
      title: "关于本站 | Orca Plugin Market",
      description: "orca.aiaaii.com：社区整理的 Orca 插件安装说明与目录，非官方。",
      canonicalPath: "/zh/about/",
      enPath: "/about/",
      navActive: "about",
      heroTitle: "关于本站",
      heroLead: "社区 Orca 插件目录 —— 需要时再看安装说明。",
      body: `      <div class="wrap prose">
        <p>
          <strong>orca.aiaaii.com</strong> 属于
          <a href="https://aiaaii.com/">Any AI（AI-AAII）</a>，
          用来整理 Orca 插件的安装步骤与社区目录。
          它不是官方商店，也不是
          <a href="https://www.onorca.dev/plugins" rel="noopener noreferrer">onorca.dev</a> 的拷贝。
        </p>
        <h2>这里会提供什么</h2>
        <ul>
          <li>可直接复制的市场源地址，以及需要钉版本时的写法</li>
          <li>常见报错怎么处理：源失败、要写版本号、主题装了却看不到</li>
          <li>能核实的情况下，标注插件是否出现在端内列表</li>
          <li>社区插件默认<strong>未审核</strong>，启用前请自己看源码</li>
        </ul>
        <h2>这里不会做什么</h2>
        <ul>
          <li>不和官方比收录数量</li>
          <li>不收录装不上的仓库</li>
          <li>不代表 Orca / Stably</li>
        </ul>
        <p>可以从首页的 <a href="/zh/#tasks">三步说明</a> 开始，或直接打开 <a href="/zh/items/">插件目录</a>。</p>
      </div>`,
    })
  );

  write(
    "changelog/index.html",
    pageShell({
      title: "更新日志 — Orca 插件目录 | Orca Plugin Market",
      description: "Orca 插件目录本周新增、安装路径变更与下架说明。",
      canonicalPath: "/zh/changelog/",
      enPath: "/changelog/",
      navActive: "changelog",
      heroTitle: "更新日志",
      heroLead: "本周新收录、安装说明调整，以及需要留意的下架项。",
      body: `      <div class="wrap prose">
        <h2 id="2026-11-08">2026-11-08 这一周</h2>
        <h3>新增</h3>
        <ul>
          <li>新收录约 78 个社区插件（通过清单校验后上架）。</li>
          <li>详情页补充显示名、权限、两种安装方式；有数据时展示精选、安装量与截图。</li>
          <li>中文站页面补齐：首页、指南、目录与分类。</li>
        </ul>
        <h3>调整</h3>
        <ul>
          <li>分类改为「命令与面板」「远程 / 虚拟机」等；旧链接仍可跳转。</li>
          <li>首页与关于页改成更贴近「怎么装」的说法。</li>
        </ul>
        <h3>注意</h3>
        <ul>
          <li>本周没有批量下架。装不上的仓库不会收录。</li>
          <li>社区插件默认<strong>未审核</strong>。建议钉版本；权限较高的面板请谨慎开启。</li>
        </ul>
        <p class="source-line">数据文件：<a href="/catalog.json">catalog.json</a> · <a href="/llms.txt">llms.txt</a></p>
      </div>`,
    })
  );

  write(
    "submit/index.html",
    pageShell({
      title: "提交收录 | Orca Plugin Market",
      description: "提交公开、可钉版本的 Orca 插件或市场索引到社区目录。",
      canonicalPath: "/zh/submit/",
      enPath: "/submit/",
      navActive: "submit",
      heroTitle: "提交收录",
      heroLead: "公开仓库、能钉版本、不要冒用官方身份。",
      body: `      <div class="wrap prose">
        <h2>提交前请确认</h2>
        <ul>
          <li>仓库公开可访问</li>
          <li>含 <span class="acronym">orca-plugin.json</span> 或 <span class="acronym">orca-marketplace.json</span></li>
          <li>别人能按说明装上（市场源，或带版本的插件地址）</li>
          <li>不要使用 <span class="acronym">stablyai</span> / <span class="acronym">orca-</span> 这类保留身份</li>
        </ul>
        <h2>收录徽章</h2>
        <p>
          <img src="/badges/listed.svg" alt="Listed on orca.aiaaii.com" width="184" height="20" />
        </p>
        <div class="install-block">
          <span class="label">Markdown</span>
          <code>[![Listed on orca.aiaaii.com](https://orca.aiaaii.com/badges/listed.svg)](https://orca.aiaaii.com/items/{owner}/{slug})</code>
        </div>
        <h2>怎么提交</h2>
        <p>
          到 GitHub 新建 <strong>Listing request</strong>：宿主选 Orca，填上仓库或市场索引地址、建议版本，以及一句话介绍。
        </p>
        <p>
          <a class="btn btn-primary" href="https://github.com/leexiangf/any-ai/issues/new?template=listing-request.yml">打开收录申请</a>
        </p>
        <p>
          问题跟踪：
          <a href="https://github.com/leexiangf/any-ai/issues" rel="noopener noreferrer">github.com/leexiangf/any-ai/issues</a>
          · 总站提交页：
          <a href="https://aiaaii.com/submit/">aiaaii.com/submit</a>
        </p>
      </div>`,
    })
  );

  write(
    "glossary/index.html",
    pageShell({
      title: "安装词表 — 市场源 vs 插件地址 | Orca Plugin Market",
      description: "Any AI 各宿主共用的安装词：市场源、插件地址、版本钉。",
      canonicalPath: "/zh/glossary/",
      enPath: "/glossary/",
      navActive: "",
      heroTitle: "安装词表",
      heroLead: "名字因产品而异，意思差不多。",
      body: `      <div class="wrap prose">
        <h2>市场源和插件地址有什么不同</h2>
        <ul>
          <li><strong>市场源 / 索引</strong>：一个列出很多插件的仓库。在设置里添加一次即可。</li>
          <li><strong>插件地址</strong>：某一个插件的仓库。直接安装时，通常要写上版本（<code>#tag</code> 或 <code>#commit</code>）。</li>
        </ul>
        <h2>各产品里怎么说</h2>
        <ul>
          <li><a href="/zh/guides/how-to-add-marketplace-source/">Orca</a>：设置 → Plugins → Marketplace sources；装单个插件时要写版本。</li>
          <li><a href="https://amp.aiaaii.com/guides/amp-plugins-add/">Amp</a>：<code>amp plugins add …</code></li>
          <li><a href="https://droid.aiaaii.com/guides/droid-plugin-marketplace-add/">Droid</a>：先 <code>droid plugin marketplace add</code>，再 <code>droid plugin install</code></li>
          <li><a href="https://kimi.aiaaii.com/guides/how-to-install-kimi-plugin/">Kimi</a>：<code>/plugins install</code>，装完后常需要再执行 <code>/new</code></li>
        </ul>
        <p>总站：<a href="https://aiaaii.com/">aiaaii.com</a></p>
      </div>`,
    })
  );
}

function writeGuidesHubAndMissing() {
  write(
    "guides/index.html",
    pageShell({
      title: "Orca 插件安装与排错指南（中文）| Orca Plugin Market",
      description: "Orca 插件中文指南：添加市场源、钉版本、主题不显示、源报错与保留 ID。",
      canonicalPath: "/zh/guides/",
      enPath: "/guides/",
      navActive: "guides",
      heroTitle: "Orca 插件指南",
      heroLead: "先把插件装上，再处理报错。",
      body: `      <div class="wrap">
        <div class="guide-tree">
          <section>
            <h2>安装</h2>
            <div class="guide-list">
              <a href="/zh/guides/what-is-an-orca-plugin/">什么是 Orca 插件<span>主题、编辑器、面板等扩展包</span></a>
              <a href="/zh/guides/how-to-enable-orca-plugins/">如何打开插件功能<span>先启用 Plugins</span></a>
              <a href="/zh/guides/how-to-add-marketplace-source/">如何添加市场源<span>在设置里粘贴 Git 地址</span></a>
              <a href="/zh/guides/how-to-install-orca-plugin/">如何安装插件<span>目录搜索，或按版本直装</span></a>
              <a href="/zh/guides/how-to-update-orca-plugins/">如何更新插件<span>刷新源，再升级已装包</span></a>
            </div>
          </section>
          <section>
            <h2>排错</h2>
            <div class="guide-list">
              <a href="/zh/guides/fix-add-an-explicit-ref/">提示要写版本号<span>别把市场目录贴进安装框</span></a>
              <a href="/zh/guides/fix-marketplace-source-error/">市场源报错<span>地址或版本不对</span></a>
              <a href="/zh/guides/fix-orca-plugin-not-showing/">装了却看不到<span>列表过滤与刷新</span></a>
              <a href="/zh/guides/fix-orca-categories-hidden/">主题装了列表里没有<span>要到外观设置里选</span></a>
              <a href="/zh/guides/fix-reserved-plugin-id/">保留身份被拒<span>别用 stablyai / orca- 冒充官方</span></a>
              <a href="/zh/guides/how-to-troubleshoot-orca-plugins/">排错总览<span>按报错类型跳转</span></a>
            </div>
          </section>
          <section>
            <h2>发布</h2>
            <div class="guide-list">
              <a href="/zh/guides/how-to-publish-orca-marketplace/">如何发布市场索引<span>写好索引文件，再用自己的命名</span></a>
            </div>
          </section>
        </div>
        <p class="section-lead" style="margin-top:1.25rem;text-align:center;margin-inline:auto">
          卡住时按这个顺序看：要写版本号 → 市场源报错 → 保留身份 → 主题不显示 → 完全找不到。
        </p>
      </div>`,
    })
  );

  const guides = [
    {
      slug: "what-is-an-orca-plugin",
      title: "什么是 Orca 插件",
      lead: "给 Orca 加主题、编辑器、语言、面板或配方的扩展包。",
      body: `<ol class="steps">
          <li>插件通常是一个 Git 仓库，里面有 <code>orca-plugin.json</code>；也可以出现在市场索引里。</li>
          <li>常见类型：主题、图标、语法、自定义编辑器、侧栏面板、skills、虚拟机配方。</li>
          <li>功能还在快速变化，安装前先看仓库说明和权限要求。</li>
          <li>官方目录：<a href="https://www.onorca.dev/plugins" rel="noopener noreferrer">onorca.dev/plugins</a>。本站主要补充社区包怎么装。</li>
        </ol>`,
    },
    {
      slug: "how-to-enable-orca-plugins",
      title: "如何打开插件功能",
      lead: "先在设置里打开 Plugins，再添加源或安装。",
      body: `<ol class="steps">
          <li>打开 Orca → <strong>Settings → Plugins</strong>。</li>
          <li>打开实验性 Plugins（具体文案可能随版本变化）。</li>
          <li>要用社区包时，先 <a href="/zh/guides/how-to-add-marketplace-source/">添加市场源</a>。</li>
          <li>然后在目录里搜索安装，或按 <a href="/zh/guides/how-to-install-orca-plugin/">安装指南</a> 写上版本直装。</li>
        </ol>`,
    },
    {
      slug: "how-to-add-marketplace-source",
      title: "如何添加市场源",
      lead: "把索引仓库加进设置，不要贴进「安装插件」输入框。",
      body: `<ol class="steps">
          <li>打开 <strong>Settings → Plugins</strong>，确认已启用插件功能。</li>
          <li>进入 <strong>Marketplace sources</strong>（管理源）。</li>
          <li>
            粘贴索引仓库的 Git 地址（一般用默认分支即可）：
            <div class="install-block">
              <span class="label">市场源示例</span>
              <code>https://github.com/stablyai/orca-plugins.git</code>
            </div>
          </li>
          <li>源没有报错后，再到插件列表里搜索并安装具体插件。</li>
        </ol>
        <p class="zh-note">如果提示要写版本号，多半是把索引仓库贴进了安装框。见 <a href="/zh/guides/fix-add-an-explicit-ref/">提示要写版本号</a>。</p>`,
    },
    {
      slug: "how-to-install-orca-plugin",
      title: "如何安装插件",
      lead: "官方能搜到就直接装；否则加市场源，或按版本直装。",
      body: `<h2>方式一：在 Orca 里搜索</h2>
        <ol class="steps">
          <li>Settings → Plugins → 搜索插件名称 → Install。</li>
          <li>也可以先在 <a href="https://www.onorca.dev/plugins" rel="noopener noreferrer">onorca.dev/plugins</a> 确认官方是否已有。</li>
        </ol>
        <h2>方式二：添加市场源</h2>
        <p>适合社区包。步骤见 <a href="/zh/guides/how-to-add-marketplace-source/">如何添加市场源</a>。</p>
        <h2>方式三：插件地址 + 版本</h2>
        <div class="install-block">
          <span class="label">直装示例（必须带版本）</span>
          <code>https://github.com/OWNER/PLUGIN.git#v1.0.0</code>
        </div>
        <p class="zh-note">这里只能贴单个插件仓库，不要贴整个市场目录。</p>`,
    },
    {
      slug: "how-to-update-orca-plugins",
      title: "如何更新插件",
      lead: "先刷新市场源，再更新已安装的插件。",
      body: `<ol class="steps">
          <li>打开 <strong>Settings → Plugins → Marketplace sources</strong>，刷新源。</li>
          <li>到已安装列表看是否有更新，按界面提示升级。</li>
          <li>如果源报错，见 <a href="/zh/guides/fix-marketplace-source-error/">市场源报错</a>。</li>
          <li>如果当初是按某个 tag/commit 装的，不会自动跟主分支，需要手动改版本再装。</li>
        </ol>`,
    },
    {
      slug: "fix-add-an-explicit-ref",
      title: "提示要写版本号",
      lead: "多半是把市场目录当成单个插件来装了。",
      body: `<p>Orca 的「安装插件」需要：<strong>单个插件仓库 + 明确版本</strong>。市场索引仓库不能直接贴进去。</p>
        <ol class="steps">
          <li>如果是索引 / 目录仓库 → 改走 <a href="/zh/guides/how-to-add-marketplace-source/">添加市场源</a>。</li>
          <li>
            如果是单个插件仓库 → 在地址后面加上 tag 或 commit：
            <div class="install-block">
              <span class="label">插件地址 + 版本</span>
              <code>https://github.com/OWNER/PLUGIN.git#v1.0.0</code>
            </div>
          </li>
        </ol>
        <h2>怎么区分</h2>
        <ul>
          <li>索引仓：根目录有 <code>orca-marketplace.json</code> → 加到市场源</li>
          <li>插件仓：有 <code>orca-plugin.json</code> → 安装时带上 <code>#版本</code></li>
        </ul>`,
    },
    {
      slug: "fix-marketplace-source-error",
      title: "市场源报错怎么办",
      lead: "检查地址、版本，以及仓库里是否有索引文件。",
      body: `<ol class="steps">
          <li>确认粘贴的是<strong>索引仓库</strong>，不是某个插件的说明页。</li>
          <li>仓库要公开，并且有 <code>orca-marketplace.json</code>（或官方要求的索引格式）。</li>
          <li>指定的分支 / tag 无效时，改成默认分支或一个真实存在的版本再试。</li>
          <li>还不行就对照 <a href="/zh/guides/how-to-troubleshoot-orca-plugins/">排错总览</a>。</li>
        </ol>`,
    },
    {
      slug: "fix-orca-plugin-not-showing",
      title: "装了却看不到",
      lead: "先检查过滤条件，再看是不是主题这类特殊项。",
      body: `<ol class="steps">
          <li>确认已打开 Plugins，并刷新过市场源。</li>
          <li>看看搜索框和「全部」过滤是不是太窄。</li>
          <li>主题等类型有时不在「全部」里 —— 见 <a href="/zh/guides/fix-orca-categories-hidden/">主题装了列表里没有</a>。</li>
          <li>如果装的时候提示要写版本号，见 <a href="/zh/guides/fix-add-an-explicit-ref/">提示要写版本号</a>。</li>
        </ol>`,
    },
    {
      slug: "fix-orca-categories-hidden",
      title: "主题装了列表里没有",
      lead: "很多主题要在外观设置里选用，不一定出现在「全部」。",
      body: `<ol class="steps">
          <li>确认市场源正常，插件状态为已安装。</li>
          <li>检查「全部 / 已安装」里的分类过滤。</li>
          <li>主题请到 Appearance / 主题设置里直接选择。</li>
          <li>还是没有 → 再看 <a href="/zh/guides/fix-orca-plugin-not-showing/">装了却看不到</a>。</li>
        </ol>
        <p class="zh-note">有些主题可以网页直装，但不一定出现在端内「全部」列表，这不一定是没收录。</p>`,
    },
    {
      slug: "fix-reserved-plugin-id",
      title: "保留身份被拒",
      lead: "社区索引不能冒用 stablyai、orca- 这类官方命名。",
      body: `<ol class="steps">
          <li>报错里如果出现 reserved / stablyai / orca-，说明 publisher 或插件 id 撞了保留名。</li>
          <li>改成你自己的 GitHub 用户名或组织名。</li>
          <li>不要把官方的 <code>stablyai.*</code> id 抄进社区清单。</li>
          <li>改完后重新发布索引，并在 Orca 里刷新市场源。</li>
        </ol>`,
    },
    {
      slug: "how-to-troubleshoot-orca-plugins",
      title: "排错总览",
      lead: "先看报错属于哪一类，再打开对应说明。",
      body: `<ol class="steps">
          <li>提示要写版本 / #ref？→ <a href="/zh/guides/fix-add-an-explicit-ref/">提示要写版本号</a></li>
          <li>市场源那一行报错？→ <a href="/zh/guides/fix-marketplace-source-error/">市场源报错</a></li>
          <li>因为 stablyai / orca- 被拒？→ <a href="/zh/guides/fix-reserved-plugin-id/">保留身份被拒</a></li>
          <li>主题装了却不在列表？→ <a href="/zh/guides/fix-orca-categories-hidden/">主题装了列表里没有</a></li>
          <li>装完完全找不到？→ <a href="/zh/guides/fix-orca-plugin-not-showing/">装了却看不到</a></li>
        </ol>`,
    },
    {
      slug: "how-to-publish-orca-marketplace",
      title: "如何发布市场索引",
      lead: "准备索引文件，并用自己的命名空间。",
      body: `<ol class="steps">
          <li>新建公开仓库，放入 <code>orca-marketplace.json</code>（或官方要求的索引格式）。</li>
          <li>列出的每个插件都要能按版本安装；publisher 用你自己的名字。</li>
          <li>可以在本站 <a href="/zh/submit/">提交收录</a>，也可以让用户直接把你的仓库加为市场源。</li>
          <li>自己测一遍：添加源 → 能看到列表 → 能装下一个插件。</li>
        </ol>`,
    },
  ];

  for (const g of guides) {
    write(
      `guides/${g.slug}/index.html`,
      pageShell({
        title: `${g.title} | Orca Plugin Market`,
        description: `${g.lead}`,
        canonicalPath: `/zh/guides/${g.slug}/`,
        enPath: `/guides/${g.slug}/`,
        navActive: "guides",
        heroTitle: g.title,
        heroLead: g.lead,
        body: `      <div class="wrap prose">
        ${g.body}
        <p><a href="/zh/guides/">← 指南目录</a></p>
      </div>`,
      })
    );
  }
}

function writeHome() {
  // Keep manually curated zh home (plugin-first SEO). Do not regenerate from this template.
  const existing = path.join(ZH, "index.html");
  if (fs.existsSync(existing)) {
    console.log("zh home: kept existing sites/orca/zh/index.html");
    return;
  }
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orca 插件 — 主题、编辑器与社区扩展目录 | Orca Plugin Market</title>
    <meta
      name="description"
      content="社区 Orca 插件目录：添加市场源、按版本安装、主题装了却不显示时的排错。非官方，不是 Orca Note。"
    />
    <link rel="canonical" href="${DOMAIN}/zh/" />
    <link rel="alternate" hreflang="en" href="${DOMAIN}/" />
    <link rel="alternate" hreflang="zh-CN" href="${DOMAIN}/zh/" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "这是官方 Orca 插件商店吗？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "不是。官方在 Orca 应用与 onorca.dev。本站是 Any AI 上的社区安装索引。"
            }
          },
          {
            "@type": "Question",
            "name": "装了插件但列表里看不到怎么办？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "先添加市场源；装单个插件时钉版本；主题等类型可能被界面过滤，需到外观设置或按排错指南检查。"
            }
          },
          {
            "@type": "Question",
            "name": "市场源地址和插件地址有什么区别？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "市场源是索引仓；安装单个插件需要插件仓并钉版本，不要把目录仓贴进 Install plugin。"
            }
          }
        ]
      }
    </script>
${THEME_BOOT}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="hero">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/zh/">
            <span class="brand-name">Orca Plugin Market</span>
            <span class="brand-domain">orca.aiaaii.com · 中文</span>
          </a>
          <div class="header-end">
            ${zhNav("")}
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="切换主题" title="Theme">
              <span class="theme-toggle-icon" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <div class="hero-main">
          <p class="hero-kicker">Orca 插件社区目录 · 非官方</p>
          <h1>在 Orca 里搜不到插件？先看怎么装</h1>
          <p class="hero-sub">
            官方商店没有的社区包、装完列表里不出现、或提示要写版本号——这里给出可复制的安装步骤与排错说明。
          </p>
          <div class="cta-row">
            <a class="btn btn-secondary" href="/zh/guides/how-to-add-marketplace-source/">添加市场源</a>
            <a class="btn btn-primary btn-spotlight" href="/zh/items/">插件目录</a>
            <a class="btn btn-ghost" href="/zh/guides/fix-add-an-explicit-ref/">安装报错了</a>
          </div>
          <p class="disclaimer">由 Any AI（AI-AAII）社区维护，与 Orca / Stably 无关。插件功能仍在快速变化中。</p>
        </div>
      </div>
    </header>

    <main>
      <section class="section" id="tasks">
        <div class="wrap">
          <p class="section-label">常见情况</p>
          <h2>你更可能需要哪一步</h2>
          <div class="task-grid">
            <a class="task-card" href="/zh/guides/how-to-add-marketplace-source/">
              <span class="task-step">1</span>
              <h3>添加市场源</h3>
              <p>在 Orca 设置里加入一个 Git 市场地址，才能看到社区插件列表。</p>
            </a>
            <a class="task-card" href="/zh/guides/fix-add-an-explicit-ref/">
              <span class="task-step">2</span>
              <h3>提示要写版本号</h3>
              <p>把「单个插件」的仓库地址装进去时，需要带上标签或 commit，不能贴整个市场目录。</p>
            </a>
            <a class="task-card" href="/zh/guides/fix-orca-categories-hidden/">
              <span class="task-step">3</span>
              <h3>装了但列表里没有</h3>
              <p>主题等类型有时不会出现在「全部」里，要到外观设置里选用，或按排错步骤检查。</p>
            </a>
          </div>
          <p class="section-lead" style="margin-top: 1.25rem">
            更多说明：
            <a href="/zh/guides/">指南目录</a>
            ·
            <a href="/zh/guides/how-to-troubleshoot-orca-plugins/">排错总览</a>
          </p>
        </div>
      </section>

      <section class="section section-alt">
        <div class="wrap">
          <p class="section-label">本站做什么</p>
          <h2>帮你把插件真正装上</h2>
          <ul class="feature-list">
            <li>
              <strong>可复制的安装地址</strong>
              <span>市场源和插件版本分开写清楚，方便直接粘贴。</span>
            </li>
            <li>
              <strong>装了却看不到</strong>
              <span>主题等类型有时不会出现在「全部」，我们会说明怎么找。</span>
            </li>
            <li>
              <strong>状态说明</strong>
              <span>能核实的情况下，标明是否出现在端内列表。</span>
            </li>
            <li>
              <strong>默认未审核</strong>
              <span>社区代码不做安全审计。建议钉版本，并自己看源码。</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="section" id="categories">
        <div class="wrap">
          <p class="section-label">浏览</p>
          <h2>分类</h2>
          <div class="category-grid">
            <a href="/zh/categories/themes/">主题 <small>应用界面与终端配色</small></a>
            <a href="/zh/categories/languages/">语言 <small>语法与界面语言包</small></a>
            <a href="/zh/categories/icons/">图标 <small>文件与文件夹图标</small></a>
            <a href="/zh/categories/editors/">编辑器 <small>自定义编辑器与预览</small></a>
            <a href="/zh/categories/commands-panels/">命令与面板 <small>侧栏、命令、skills</small></a>
            <a href="/zh/categories/remote-vms/">远程 / 虚拟机 <small>配方、沙箱、远程工作区</small></a>
            <a href="/zh/categories/marketplaces/">市场源 <small>目录与索引仓</small></a>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="wrap">
          <p class="section-label">宿主</p>
          <h2>Orca 是什么？</h2>
          <p class="section-lead">
            <strong>Orca</strong>（Stably AI）是并行跑多组编程助手的 ADE，常用各自的 git worktree。
            插件可加主题、编辑器、语言、面板与配方。
          </p>
          <p class="section-lead host-links">
            官方入口<br />
            <a href="https://www.onorca.dev/plugins" rel="noopener noreferrer">onorca.dev/plugins</a>
            ·
            <a href="https://github.com/stablyai/orca-plugins" rel="noopener noreferrer">stablyai/orca-plugins</a>
          </p>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <p class="section-label">常见问题</p>
          <h2>Orca 插件安装问答</h2>
          <div class="faq">
            <details>
              <summary>这是官方 Orca 商店吗？</summary>
              <p>
                不是。官方浏览与安装在 Orca 应用和
                <a href="https://www.onorca.dev/plugins" rel="noopener noreferrer">onorca.dev</a>。
                本站是 Any AI（AI-AAII）上的社区网页目录。
              </p>
            </details>
            <details>
              <summary>装完在列表里找不到？</summary>
              <p>
                先看过滤与隐藏类目：
                <a href="/zh/guides/fix-orca-categories-hidden/">主题装了列表里没有</a>，
                再看
                <a href="/zh/guides/fix-orca-plugin-not-showing/">插件装了却不显示</a>。
              </p>
            </details>
            <details>
              <summary>市场源地址和插件地址有何不同？</summary>
              <p>
                市场源用索引仓。「Install plugin」要的是单个插件仓并钉版本。
                指南：<a href="/zh/guides/fix-add-an-explicit-ref/">提示要写版本号</a>。
              </p>
            </details>
            <details>
              <summary>社区插件审核过吗？</summary>
              <p>
                默认<strong>未审核</strong>。我们不做第三方安全审计。优先钉版本，启用前请阅读 GitHub 源码。
              </p>
            </details>
            <details>
              <summary>如何上架？</summary>
              <p><a href="/zh/submit/">提交</a>公开、可钉版本的插件或市场索引。装不上的仓库我们不会收。</p>
            </details>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">Orca Plugin Market</span>
          <span class="brand-domain">orca.aiaaii.com · Any AI（AI-AAII）</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/zh/items/">插件目录</a>
            <a href="/zh/guides/">指南</a>
            <a href="/">English</a>
            <a href="/zh/changelog/">更新</a>
            <a href="/zh/submit/">提交</a>
            <a href="/zh/about/">关于</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI 总站</a>
          </div>
          <p>与 Orca / Stably 无关 · 实验性</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
  </body>
</html>
`;
  write("index.html", html);
}

function patchEnHreflang() {
  const pairs = [
    ["index.html", "/", "/zh/"],
    ["about/index.html", "/about/", "/zh/about/"],
    ["changelog/index.html", "/changelog/", "/zh/changelog/"],
    ["submit/index.html", "/submit/", "/zh/submit/"],
    ["glossary/index.html", "/glossary/", "/zh/glossary/"],
    ["guides/index.html", "/guides/", "/zh/guides/"],
    ["items/index.html", "/items/", "/zh/items/"],
  ];
  for (const [rel, en, zh] of pairs) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    let html = fs.readFileSync(p, "utf8");
    html = html.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]*"\s*\/>/g, "");
    html = html.replace(
      /(<link rel="canonical"[^>]*>)/,
      `$1\n    <link rel="alternate" hreflang="en" href="${DOMAIN}${en}" />\n    <link rel="alternate" hreflang="zh-CN" href="${DOMAIN}${zh}" />`
    );
    fs.writeFileSync(p, html, "utf8");
  }
}

writeHome();
writeStaticPages();
writeGuidesHubAndMissing();
const nItems = mirrorTree("items");
const nCats = mirrorTree("categories");
patchEnHreflang();

console.log(
  JSON.stringify(
    {
      ok: true,
      items: nItems,
      categories: nCats,
      zhRoot: ZH,
    },
    null,
    2
  )
);
