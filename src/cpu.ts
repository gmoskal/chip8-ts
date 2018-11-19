import { chars, keys, width, height } from "./consts"

const getArray = (size: number): number[] => new Array(size).fill(0)

export const getInitialState = () => ({
    sp: 0,
    I: 0,
    pc: 0x200,
    stack: getArray(16),
    memory: new Uint8Array(new ArrayBuffer(0x1000)).fill(0),
    keys: keys.reduce((acc, _, i) => ({ ...acc, [i]: false }), {}) as NMap<boolean>,
    V: getArray(16),
    screen: getArray(width * height),
    delayTimer: 0,
    soundTimer: 0,
    isDrawing: false
})

export const loadProgram = (program: Uint8Array) => program.forEach((v, i) => (state.memory[i + 0x200] = v))
export let state: ReturnType<typeof getInitialState>
export const init = (delta: Partial<typeof state> = {}) => {
    state = { ...getInitialState(), ...delta }
    state.memory.set(chars)
}

const updatePixel = (x: number, y: number) => {
    x += x < 0 ? width : x > width ? -width : 0
    y += y < 0 ? height : y > height ? -height : 0
    const i = x + y * width
    state.screen[i] ^= 1
    return !state.screen[i]
}

const X = (oc: number) => (oc & 0x0f00) >> 8
const Vx = (oc: number) => state.V[X(oc)]
const Y = (oc: number) => (oc & 0x00f0) >> 4
const Vy = (oc: number) => state.V[Y(oc)]
const N = (oc: number) => oc & 0x000f
const NN = (oc: number) => oc & 0x00ff
const NNN = (oc: number) => oc & 0x0fff

type CalcVf = (vx: number, vy: number) => boolean | number
const setVf = (calcVf: CalcVf) => (oc: number) => (state.V[0xf] = +calcVf(Vx(oc), Vy(oc)))
type CalcVx = (vx: number, vy: number) => number
const setVx = (calcVx: CalcVx) => (oc: number) => {
    const x = X(oc)
    const v = calcVx(state.V[x], Vy(oc))
    state.V[x] = v + (v < 0 ? 256 : v > 255 ? -256 : 0)
}
const setVfVx = (calcVf: CalcVf, calcVx: CalcVx) => (oc: number) => {
    setVf(calcVf)(oc)
    setVx(calcVx)(oc)
}

const setI = (calcI: (vx: number, i: number) => number) => (oc: number) => (state.I = calcI(Vx(oc), state.I))

const incPc = (cond: (vx: number, vy: number) => boolean) => (oc: number) => (state.pc += cond(Vx(oc), Vy(oc)) ? 2 : 0)

const draw = (oc: number) => {
    const { I, V, memory } = state
    const vx = Vx(oc)
    const vy = Vy(oc)
    const h = N(oc)
    V[0xf] = 0
    for (let y = 0; y < h; y++) {
        let pixel = memory[I + y]
        for (let x = 0; x < 8; x++) {
            if ((pixel & 0x80) > 0 && updatePixel(vx + x, vy + y)) V[0xf] = 1
            pixel <<= 1
        }
    }

    state.isDrawing = true
}

const setKey = (oc: number) => {
    let keyPress = false
    keys.forEach((_, i) => {
        if (state.keys[i]) {
            state.V[X(oc)] = i
            keyPress = true
        }
    })
    if (!keyPress) state.pc -= 2
}

export const runOpcode = (oc: number): ((oc: number) => void) | null => {
    switch (oc & 0xf000) {
        case 0x0000:
            switch (oc) {
                case 0x00e0:
                    state.screen.fill(0)
                    break
                case 0x00ee:
                    state.sp--
                    state.pc = state.stack[state.sp]
                    break
                default:
                    state.pc = NNN(oc)
            }
            return null
        case 0x1000: // GOTO NNN
            state.pc = NNN(oc)
            return null
        case 0x2000: // CALL
            state.stack[state.sp] = state.pc
            state.sp++
            state.pc = NNN(oc)
            return null
        case 0x3000:
            return incPc(vx => vx === NN(oc))
        case 0x4000:
            return incPc(vx => vx !== NN(oc))
        case 0x5000:
            return incPc((vx, vy) => vx === vy)
        case 0x6000:
            return setVx(() => NN(oc))
        case 0x7000:
            return setVx(vx => vx + NN(oc))
        case 0x8000:
            switch (oc & 0x000f) {
                case 0x0000: // Sets VX to the value of VY.
                    return setVx((_, vy) => vy)
                case 0x0001:
                    return setVx((vx, vy) => vx | vy)
                case 0x0002:
                    return setVx((vx, vy) => vx & vy)
                case 0x0003:
                    return setVx((vx, vy) => vx ^ vy)
                case 0x0004:
                    return setVfVx((vx, vy) => vx + vy > 255, (vx, vy) => vx + vy)
                case 0x0005:
                    return setVfVx((vx, vy) => vx > vy, (vx, vy) => vx - vy)
                case 0x0006:
                    return setVfVx(vx => vx & 0x1, vx => vx >> 1)
                case 0x0007:
                    return setVfVx((vx, vy) => vy > vx, (vx, vy) => vy - vx)
                case 0x000e:
                    return setVfVx(vx => vx & 0xf0, vx => vx << 1)
            }
            break
        case 0x9000:
            return incPc((vx, vy) => vx !== vy)
        case 0xa000:
            return setI(() => NNN(oc))
        case 0xb000:
            state.pc = NNN(oc) + state.V[0]
            return null
        case 0xc000:
            return setVx(() => ~~(Math.random() * 0xff) & NN(oc))
        case 0xd000:
            return draw
        case 0xe000:
            switch (oc & 0x00ff) {
                case 0x009e:
                    return incPc(vx => state.keys[vx])
                case 0x00a1:
                    return incPc(vx => !state.keys[vx])
            }
            break
        case 0xf000:
            switch (oc & 0x00ff) {
                case 0x0007:
                    return setVx(() => state.delayTimer)
                case 0x000a:
                    return setKey
                case 0x0015:
                    state.delayTimer = Vx(oc)
                    return null
                case 0x0018:
                    state.soundTimer = Vx(oc)
                    return null
                case 0x001e:
                    // Undocumented overflow feature of the CHIP-8 used by the Spacefight 2091! game
                    state.V[0xf] = +(state.I + Vx(oc) > 0xfff)
                    return setI((vx, i) => vx + i)
                case 0x0029:
                    return setI(vx => vx * 5)
                case 0x0033: {
                    const { memory, I } = state
                    const vx = Vx(oc)
                    memory[I + 2] = vx % 10
                    memory[I + 1] = ~~(vx / 10) % 10
                    memory[I] = ~~(vx / 100) % 10
                    return null
                }
                case 0x0055:
                case 0x0065: {
                    const x = X(oc)
                    const { memory, V, I } = state
                    const restore = (oc & 0x00ff) === 0x0065
                    for (let i = 0; i <= x; i++) {
                        if (restore) V[i] = memory[I + i]
                        else memory[I + i] = V[i]
                    }
                    state.I += x + 1
                    return null
                }
            }
    }
    // tslint:disable-next-line:no-console
    console.log(`invalid opcode: ${oc}!`)
    return null
}

export const nextCommand = () => run((state.memory[state.pc] << 8) | state.memory[state.pc + 1])
export const run = (oc: number) => {
    state.pc += 2
    const delta = runOpcode(oc)
    if (delta !== null) delta(oc)
}
