const rollup = require("rollup");
const nodeBabel = require("@rollup/plugin-babel");
const babel = nodeBabel.babel;
const esbuild = require("rollup-plugin-esbuild");
const nodeResolve = require("@rollup/plugin-node-resolve");
const resolve = nodeResolve.nodeResolve;
const commonjs = require("@rollup/plugin-commonjs");
const rollupStream = require("@rollup/stream");

const fs = require("fs");
const fsPromises = require("fs").promises;
const crypto = require("crypto");
const path = require("path");

const CONTENT_TYPE = "application/javascript";

async function bundleFunctions(file) {
  // return new Promise(async (resolve, reject) => {
  const stream = await rollupStream({
    input: "./src/main.ts",
    plugins: [
      esbuild({
        target: "es2018",
      }),
      babel({
        exclude: "node_modules/**",
        babelHelpers: "bundled",
      }),
      resolve(),
      commonjs(),
    ],
  });

  return await stream;
  // });
}

async function assemble(src) {
  const tmpDir = path.join(__dirname, "handlers-bundle");
  const TYPES_FILE = "netlitypes.d.ts";
  await fsPromises.mkdir(tmpDir);
  // copy types //
  await fsPromises.copyFile(
    path.join(__dirname, "handlers", "types.d.ts"),
    path.join(tmpDir, TYPES_FILE),
  );
  console.log(tmpDir);
  const functions = await fsPromises.readdir(src, { withFileTypes: true });

  let imports = "";
  let registration = "";
  for (const func of functions) {
    const id = "func" + crypto.randomBytes(16).toString("hex");
    const name = func.name.substr(0, func.name.length - 3);

    imports += `import * as ${id} from "./${func.name}";\n`;
    registration += `netlifyRegistry.set("${name}", ${id});\n`;

    await fsPromises.copyFile(path.join(src, func.name), path.join(tmpDir, func.name));
  }

  const mainContents = `/// <reference path="./${TYPES_FILE}" />\n` + imports + registration;
  const mainFile = path.join(tmpDir, "netlify.ts");
  await fsPromises.writeFile(mainFile, mainContents);

  return mainFile;
}

async function writeBundle(buf, output, isLocal) {
  const shasum = crypto.createHash("sha1");
  shasum.update(buf);

  const bundleInfo = {
    sha: shasum.digest("hex"),
    content_length: buf.byteLength,
    content_type: CONTENT_TYPE,
  };
  console.log(bundleInfo);
  if (isLocal) {
    const dir = await fsPromises.mkdir(path.normalize(output));
    const outputFile = path.join(output, bundleInfo.sha);
    await fsPromises.writeFile(outputFile, buf);
  }
}

async function init() {
  // const mainFile = await assemble("handlers");
  const mainFile = "";
  const stream = await bundleFunctions(mainFile);

  const bufs = [];
  let outputBuf;
  stream.on("data", (data) => {
    bufs.push(data);
  });
  stream.on("end", () => {
    writeBundle(Buffer.concat(bufs), "handlers-build", true);
  });
  stream.on("error", () => {
    throw new Error("could not get bundle from stdout");
  });
}

init();
