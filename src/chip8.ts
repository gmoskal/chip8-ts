import { state, nextCommand, init, loadProgram } from "./cpu"
import { keys } from "./consts"
let ctx: CanvasRenderingContext2D

const setupGraphics = () => {
    const element = document.createElement("canvas")
    element.width = state.display.width
    element.height = state.display.height
    document.getElementById("emulator").appendChild(element)
    ctx = element.getContext("2d")
}

const draw = () => {
    if (!state.isDrawing) return
    const imageData = ctx.getImageData(0, 0, state.display.width, state.display.height)
    const fg = [45, 199, 239]
    const bg = [46 * 0.5, 52 * 0.5, 81 * 0.5]
    state.display.content.forEach((p, index) => {
        const i = index * 4
        const c = p ? fg : bg
        imageData.data[i] = c[0]
        imageData.data[i + 1] = c[1]
        imageData.data[i + 2] = c[2]
        imageData.data[i + 3] = 255
    })
    ctx.putImageData(imageData, 0, 0)
    state.isDrawing = false
}

const toggleKey = (pressed: boolean) => ({ key }: { key: string }) => {
    if (key === "ArrowLeft") key = "q"
    if (key === "ArrowRight") key = "e"
    if (key === "ArrowDown") key = "r"
    if (key === " ") key = "w"
    const i = keys.indexOf(key)
    if (i !== -1) state.keys[i] = pressed
}

const setupInput = () => {
    document.addEventListener("keydown", toggleKey(true))
    document.addEventListener("keyup", toggleKey(false))
}

export const readProgram = async (path: string) => {
    const resp = await fetch(path)
    const buffer = await resp.arrayBuffer()
    const program = new Uint8Array(buffer)
    loadProgram(program)
}

const main = async () => {
    init()
    setupGraphics()
    setupInput()
    await readProgram("./SpaceInvaders2.ch8")

    let currentTick = 0
    setInterval(() => {
        nextCommand()
        draw()
        if (++currentTick % 6 === 0 && state.delayTimer > 0) state.delayTimer--
    }, 0)
}

main()
