import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";

export default {
  input: "./src/main.ts",
  output: {
    file: "./build/bundle.min.js",
    format: "system",
    name: "bundle",
  },
  plugins: [
    esbuild({
      target: "es2018",
    }),
    babel({
      exclude: "node_modules/**",
    }),
    resolve(),
    commonjs(),
  ],
};
