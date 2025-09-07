import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const base = [
  resolve({ browser: true, preferBuiltins: false, mainFields: ["browser", "module", "main"] }),
  commonjs(),
  typescript({ tsconfig: "./tsconfig.app.json" })
];

export default [
  // {
  //   input: "src/host-content.ts",
  //   output: { file: "dist/host-content.js", format: "iife", name: "HostContent" },
  //   plugins: base
  // },
  // {
  //   input: "src/client-content.ts",
  //   output: { file: "dist/client-content.js", format: "iife", name: "ClientContent" },
  //   plugins: base
  // },
  {
    input: "src/background.ts",
    output: { file: "dist/background.js", format: "iife", name: "Background" },
    plugins: base
  }
];
