import { Options } from "poi"

const options: Options = {
    entry: "src/chip8.ts",
    presets: [require("poi-preset-typescript")()],
    port: 3500
}

export default options
