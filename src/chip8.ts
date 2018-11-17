import { state, nextCommand, init, loadProgram } from "./cpu"

let ctx: CanvasRenderingContext2D

const setupGraphics = () => {
    const element = document.createElement("canvas")
    element.width = state.display.width
    element.height = state.display.height
    document.body.appendChild(element)
    ctx = element.getContext("2d")
}

const draw = () => {
    if (!state.isDrawing) return
    const imageData = ctx.getImageData(0, 0, state.display.width, state.display.height)
    const activeColor = [0, 255, 0]
    const clearColor = [0, 0, 0]
    state.display.content.forEach((pixel, index) => {
        const i = index * 4
        const color = pixel ? activeColor : clearColor
        imageData.data[i] = color[0]
        imageData.data[i + 1] = color[1]
        imageData.data[i + 2] = color[2]
        imageData.data[i + 3] = 255
    })
    ctx.putImageData(imageData, 0, 0)
    state.isDrawing = false
}

const setupInput = () => null as any

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
    await readProgram("./tetris.rom")

    let currentTick = 0
    setInterval(() => {
        nextCommand()
        draw()
        if (++currentTick % 6 === 0 && state.delayTimer > 0) state.delayTimer--
    }, 0)
}

main()
