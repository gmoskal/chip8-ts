import * as cpu from "./cpu"
import { keys, width, height } from "./consts"

let ctx: CanvasRenderingContext2D
const setupGraphics = () => {
    const element = document.createElement("canvas")
    element.width = width
    element.height = height
    const emulator = document.getElementById("emulator")
    const lctx = element.getContext("2d")
    if (!emulator || !lctx) throw new Error("invalid template")
    emulator.appendChild(element)
    ctx = lctx
}

const draw = () => {
    if (!cpu.state.isDrawing) return
    const pixels = ctx.getImageData(0, 0, width, height)
    const fg = [45, 199, 239]
    const bg = [23, 26, 40]
    cpu.state.screen.forEach((p, index) => {
        const i = index * 4
        const c = p ? fg : bg
        pixels.data[i] = c[0]
        pixels.data[i + 1] = c[1]
        pixels.data[i + 2] = c[2]
        pixels.data[i + 3] = 255
    })
    ctx.putImageData(pixels, 0, 0)
    cpu.state.isDrawing = false
}

let screenSwitcher: HTMLInputElement
const setupSwitch = () => {
    const v = document.getElementById("switch") as HTMLInputElement
    if (v) screenSwitcher = v
}

const setupProgramLoader = () => {
    const input = document.getElementById("file") as HTMLInputElement
    if (!input) return
    input.onchange = (e: any) => {
        if (!e.target || !e.target.files || !e.target.files[0]) return
        screenSwitcher.checked = false
        const reader = new FileReader()
        reader.onload = () => init(reader.result as any)
        reader.readAsArrayBuffer(e.target.files[0])
    }
}

const isMobile = !![/Android/i, /webOS/i, /iPhone/i, /iPad/i].find(r => navigator.userAgent.match(r) !== null)
const setupButtons = () => {
    const buttons = document.getElementById("buttons")
    if (!buttons || !isMobile) return
    keys.forEach(key => {
        const button = document.createElement("button")
        buttons.appendChild(button)
        button.innerHTML = key
        const i = keys.indexOf(key)
        button.onclick = () => {
            cpu.state.keys[i] = true
            setTimeout(() => (cpu.state.keys[i] = false), 500)
        }
    })
}

const init = (programBuffer: ArrayBuffer) => {
    cpu.init()
    cpu.loadProgram(new Uint8Array(programBuffer))
    setTimeout(() => (screenSwitcher.checked = true), 500)
}

const toggleKey = (pressed: boolean) => ({ key }: { key: string }) => {
    if (key === "ArrowLeft") key = "w"
    if (key === "ArrowRight") key = "e"
    if (key === "ArrowDown") key = "r"
    if (key === "ArrowUp") key = "q"
    if (key === " ") key = "q"
    const i = keys.indexOf(key)
    if (i !== -1) cpu.state.keys[i] = pressed
}

const main = async () => {
    setupGraphics()
    document.addEventListener("keydown", toggleKey(true))
    document.addEventListener("keyup", toggleKey(false))
    setupSwitch()
    setupProgramLoader()
    setupButtons()
    const resp = await fetch("./tetris.ch8")
    init(await resp.arrayBuffer())

    let currentTick = 0
    setInterval(() => {
        if (screenSwitcher.checked === false) return
        cpu.nextCommand()
        draw()

        if (++currentTick % 6 === 0 && cpu.state.delayTimer > 0) {
            cpu.state.delayTimer--
        }
    }, 0)
}

main()
