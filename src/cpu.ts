import { chars, keys } from "./consts"

const getArray = (size: number): number[] => new Array(size).fill(0)
const getKeys = (): NMap<boolean> => keys.reduce((acc, _, ind) => ({ ...acc, [ind]: false }), {})

export let initialState = () => {
    const memory = new Uint8Array(new ArrayBuffer(0x1000)).fill(0)
    memory.set(chars)
    return {
        sp: 0,
        I: 0,
        pc: 0x200,
        stack: getArray(16),
        memory,
        keys: getKeys(),
        delayTimer: 0,
        soundTimer: 0,
        V: getArray(16),
        display: {
            width: 64,
            height: 32,
            content: getArray(64 * 32)
        },
        isDrawing: false
    }
}

export const loadProgram = (program: Uint8Array) => {
    for (let i = 0; i < program.length; i++) state.memory[i + 0x200] = program[i]
}

type State = ReturnType<typeof initialState>
export let state = initialState()

export const init = (delta: Partial<State> = {}) => (state = { ...initialState(), ...delta })

const transformPixel = (x: number, y: number) => {
    const { width, height, content } = state.display
    if (x > width) x -= width
    else if (x < 0) x += width
    if (y > height) y -= height
    else if (y < 0) y += height
    const location = x + y * width
    // console.log("-- (" + x + "," + y + ") = " + content[location] + " -> " + (content[location] ^ 1))
    content[location] ^= 1
    return !content[location]
}

const X = (oc: number) => (oc & 0x0f00) >> 8
const Vx = (oc: number) => state.V[X(oc)]
const Y = (oc: number) => (oc & 0x00f0) >> 4
const Vy = (oc: number) => state.V[Y(oc)]
const N = (oc: number) => oc & 0x000f
const NN = (oc: number) => oc & 0x00ff
const NNN = (oc: number) => oc & 0x0fff

const setVf = (oc: number, calcVf: (vx: number, vy: number) => boolean | number) =>
    (state.V[0xf] = +calcVf(Vx(oc), Vy(oc)))

const setVx = (oc: number, calcVx: (vx: number, vy: number) => number) => {
    const x = X(oc)
    const newVx = calcVx(state.V[x], Vy(oc))
    if (newVx > 255) state.V[x] = newVx - 256
    else if (newVx < 0) state.V[x] = newVx + 256
    else state.V[x] = newVx
    state.pc += 2
}

const setI = (oc: number, calcI: (vx: number, i: number) => number) => {
    state.I = calcI(Vx(oc), state.I)
    state.pc += 2
}

const skipNext = (oc: number, cond: (vx: number, vy: number) => boolean) => (state.pc += cond(Vx(oc), Vy(oc)) ? 4 : 2)

export const run = (oc: number) => {
    switch (oc & 0xf000) {
        case 0x0000:
            switch (oc) {
                case 0x00e0:
                    // tslint:disable-next-line:no-console
                    console.log("CLS")
                    break
                case 0x00ee:
                    state.sp--
                    state.pc = state.stack[state.sp]
                    break
            }
            break

        case 0x1000: // GOTO NNN
            state.pc = NNN(oc)
            break

        case 0x2000: // CALL
            state.stack[state.sp] = state.pc
            state.sp++
            state.pc = NNN(oc)
            break

        case 0x3000:
            skipNext(oc, vx => vx === NN(oc))
            break

        case 0x4000:
            skipNext(oc, vx => vx !== NN(oc))
            break

        case 0x5000:
            skipNext(oc, (vx, vy) => vx === vy)
            break

        case 0x6000:
            setVx(oc, () => NN(oc))
            break
        case 0x7000:
            setVx(oc, vx => vx + NN(oc))
            break

        case 0x8000:
            switch (oc & 0x000f) {
                case 0x0000: // Sets VX to the value of VY.
                    setVx(oc, (_, vy) => vy)
                    break
                case 0x0001:
                    setVx(oc, (vx, vy) => vx | vy)
                    break
                case 0x0002:
                    setVx(oc, (vx, vy) => vx & vy)
                    break
                case 0x0003:
                    setVx(oc, (vx, vy) => vx ^ vy)
                    break
                case 0x0004:
                    setVf(oc, (vx, vy) => vx + vy > 255)
                    setVx(oc, (vx, vy) => vx + vy)
                    break
                case 0x0005:
                    setVf(oc, (vx, vy) => vx > vy)
                    setVx(oc, (vx, vy) => vx - vy)
                    break
                case 0x0006:
                    setVf(oc, vx => vx & 0x1)
                    setVx(oc, vx => vx >> 1)
                    break
                case 0x0007:
                    setVf(oc, (vx, vy) => vy > vx)
                    setVx(oc, (vx, vy) => vy - vx)
                    break
                case 0x000e:
                    setVf(oc, vx => vx & 0xf0)
                    setVx(oc, vx => vx << 1)
                    break
            }
            break

        case 0x9000:
            skipNext(oc, (vx, vy) => vx !== vy)
            break

        case 0xa000:
            setI(oc, () => NNN(oc))
            break

        case 0xb000:
            state.pc = NNN(oc) + state.V[0]
            break

        case 0xc000:
            setVx(oc, () => ~~(Math.random() * 0xff) & NN(oc))
            break

        case 0xd000:
            {
                const { I, V, memory } = state

                const vx = Vx(oc)
                const vy = Vy(oc)
                const height = N(oc)
                V[0xf] = 0
                for (let y = 0; y < height; y++) {
                    let pixel = memory[I + y]
                    for (let x = 0; x < 8; x++) {
                        if ((pixel & 0x80) > 0 && transformPixel(vx + x, vy + y)) V[0xf] = 1
                        pixel <<= 1
                    }
                }

                state.isDrawing = true
                state.pc += 2
            }
            break

        case 0xe000:
            switch (oc & 0x00ff) {
                case 0x009e:
                    skipNext(oc, vx => state.keys[vx])

                    break
                case 0x00a1:
                    skipNext(oc, vx => !state.keys[vx])
                    break
            }

            break

        case 0xf000:
            switch (oc & 0x00ff) {
                case 0x0007:
                    setVx(oc, () => state.delayTimer)
                    break

                case 0x000a:
                    {
                        let keyPress = false
                        for (let i = 0; i < 16; ++i) {
                            if (state.keys[i]) {
                                state.V[X(oc)] = i
                                keyPress = true
                            }
                        }
                        // If we didn't received a keypress, skip this cycle and try again.
                        if (!keyPress) return
                        state.pc += 2
                    }
                    return
                case 0x0015:
                    state.delayTimer = Vx(oc)
                    state.pc += 2
                    break
                case 0x0018:
                    state.soundTimer = Vx(oc)
                    state.pc += 2
                    break
                case 0x001e:
                    // Undocumented overflow feature of the CHIP-8 used by the Spacefight 2091! game
                    state.V[0xf] = +(state.I + Vx(oc) > 0xfff)
                    setI(oc, (vx, i) => vx + i)
                    break
                case 0x0029:
                    setI(oc, vx => vx * 5)
                    break
                case 0x0033:
                    {
                        const { memory, I } = state
                        const vx = Vx(oc)
                        memory[I + 2] = vx % 10
                        memory[I + 1] = ~~(vx / 10) % 10
                        memory[I] = ~~(vx / 100) % 10
                    }
                    break
                case 0x0055:
                    {
                        const x = X(oc)
                        const { memory, V, I } = state
                        for (let i = 0; i <= x; i++) memory[I + i] = V[i]

                        // On the original interpreter, when the operation is done, I = I + X + 1.
                        state.I += x + 1
                        state.pc += 2
                    }

                    break
                case 0x0065:
                    {
                        const x = X(oc)
                        const { memory, V, I } = state
                        for (let i = 0; i <= x; i++) V[i] = memory[I + i]

                        // On the original interpreter, when the operation is done, I = I + X + 1.
                        state.I += x + 1
                        state.pc += 2
                    }

                    break
            }

            break

        default:
            // tslint:disable-next-line:no-console
            console.log(`invalid opcode: ${oc}!`)
    }
    // tslint:disable-next-line:max-file-line-count
}
