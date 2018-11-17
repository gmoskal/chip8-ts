import { state, run, init, loadProgram } from "./cpu"

const setupGraphics = () => null as any
const setupInput = () => null as any
const draw = (_content: any) => null as any

export const load = async (path: string) => {
    const resp = await fetch(path)
    const buffer = await resp.arrayBuffer()
    return new Uint8Array(buffer)
}

let currentTick = 0
const main = async () => {
    setupGraphics()
    setupInput()

    init()
    const program = await load("./tetris.rom")
    loadProgram(program)

    setInterval(() => {
        currentTick++
        const opcode = (state.memory[state.pc] << 8) | state.memory[state.pc + 1]
        run(opcode)

        if (state.isDrawing) {
            draw(state.display.content)
            state.isDrawing = false
        }

        if (currentTick % 6 === 0 && state.delayTimer > 0) state.delayTimer--
    }, 0)
}

main()
