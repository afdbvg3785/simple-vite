import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import compilerSfc from "@vue/compiler-sfc";
import compilerDom from "@vue/compiler-dom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(async (req, res) => {
  const { url } = req;

  const query = new URL(req.url, `http://${req.headers.host}`).searchParams;

  if (url === "/") {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    })

    const html = fs.readFileSync("./index.html", "utf-8");
    res.end(html);
  } else if (url.endsWith(".js")) {
    const jsFath = path.resolve(__dirname, url.slice(1))

    res.writeHead(200, {
      "Content-type": "application/javascript"
    })

    const jsFile = fs.readFileSync(jsFath, "utf-8");

    res.end(rewriteImport(jsFile))
  } else if (url.startsWith("/@modules/")) {
    const prefix = path.resolve(__dirname, "node_modules", url.replace("/@modules/", ""))

    const modulePackageJsonFile = fs.readFileSync(`${prefix}/package.json`, "utf-8");
    const moduleDistPath = JSON.parse(modulePackageJsonFile).module;

    const moduleDistFile = fs.readFileSync(path.resolve(prefix, moduleDistPath), "utf-8");

    res.writeHead(200, {
      "Content-type": "application/javascript"
    })

    res.end(rewriteImport(moduleDistFile))
  } else if (url.includes(".vue")) {
    const vuePath = path.resolve(__dirname, url.split('?')[0].slice(1));
    const vueFile = fs.readFileSync(vuePath, "utf-8");
    res.writeHead(200, {'Content-Type': 'application/javascript'})
    const { descriptor } = compilerSfc.parse(vueFile)

    // console.log(descriptor.styles);
    if (!query.get("type")) {
      const content = `
        ${rewriteImport(descriptor.script.content.replace('export default', 'const __script = '))}
        import { render as __render } from "${url}?type=template" 
        __script.render = __render 
        export default __script
      `
      res.end(content);
    } else if (query.get("type") === "template") {
      const render = compilerDom.compile(descriptor.template.content, {mode: 'module'});
      res.end(rewriteImport(render.code))
    }
  } else if (url.endsWith('.css')) {
    const p = path.resolve(__dirname, url.slice(1))
    const file = fs.readFileSync(p, 'utf8')
    const content = `
      const css = "${file.replace(/\n/g, '')}"
      let link = document.createElement('style')
      link.setAttribute('type', 'text/css')
      document.head.appendChild(link)
      link.innerHTML = css
      export default css
    `
    res.writeHead(200, {'Content-Type': 'application/javascript'})
    res.end(content)
  }

})

server.listen(8527, () => {
  console.log("your server is running at 8080!");
})

function rewriteImport(content) {
  // 目的是改造 .js 文件内容， 不是 "/", "./", or "../" 开头的 import，替换成 /@modules/ 开头
  return content.replace(/\s+from\s+['|"]([^'"]+)['|"]/g, ($0, $1) => {
    if($1[0] !== '.' && $1[0] !== '/') {
      return ` from "/@modules/${$1}"`
    }else {
      return $0
    }
  })
};
