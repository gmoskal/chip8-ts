import { chars, keys } from "./consts"

const getArray = (size: number): number[] => new Array(size).fill(0)

const pressedKeys = (): NMap<boolean> => keys.reduce((acc, _, ind) => ({ ...acc, [ind]: false }), {})

export let initialState = () => {
    const memory = new Uint8Array(new ArrayBuffer(0x1000)).fill(0)
    memory.set(chars)
    return {
        sp: 0,
        I: 0,
        pc: 0x200,
        stack: getArray(16),
        memory,
        pressedKeys: pressedKeys(),
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

export const opcodes = {
    return: () => {
        state.sp--
        state.pc = state.stack[state.sp]
    },

    gotoNNN: (oc: number) => (state.pc = NNN(oc)),
    gotoV0PlusNNN: (oc: number) => (state.pc = NNN(oc) + state.V[0]),

    call: (oc: number) => {
        state.stack[state.sp] = state.pc
        state.sp++
        opcodes.gotoNNN(oc)
    },

    skipIfNNEq: (oc: number) => skipNext(oc, vx => vx === NN(oc)),
    skipIfNNNotEq: (oc: number) => skipNext(oc, vx => vx !== NN(oc)),
    skipIfVyEq: (oc: number) => skipNext(oc, (vx, vy) => vx === vy),
    skipIfVyNotEq: (oc: number) => skipNext(oc, (vx, vy) => vx !== vy),
    skipIfKey: (oc: number) => skipNext(oc, vx => state.pressedKeys[vx]),
    skipIfNotKey: (oc: number) => skipNext(oc, vx => !state.pressedKeys[vx]),

    setNN: (oc: number) => setVx(oc, () => NN(oc)),
    addNN: (oc: number) => setVx(oc, vx => vx + NN(oc)),
    setVy: (oc: number) => setVx(oc, (_, vy) => vy),
    orVy: (oc: number) => setVx(oc, (vx, vy) => vx | vy),
    andVy: (oc: number) => setVx(oc, (vx, vy) => vx & vy),
    xorVy: (oc: number) => setVx(oc, (vx, vy) => vx ^ vy),

    addVy: (oc: number) => {
        setVf(oc, (vx, vy) => vx + vy > 255)
        setVx(oc, (vx, vy) => vx + vy)
    },
    subVy: (oc: number) => {
        setVf(oc, (vx, vy) => vx > vy)
        setVx(oc, (vx, vy) => vx - vy)
    },

    shiftRight: (oc: number) => {
        setVf(oc, vx => vx & 0x1)
        setVx(oc, vx => vx >> 1)
    },
    shiftLeft: (oc: number) => {
        setVf(oc, vx => vx & 0xf0)
        setVx(oc, vx => vx << 1)
    },

    setVyMinusVx: (oc: number) => {
        setVf(oc, (vx, vy) => vy > vx)
        setVx(oc, (vx, vy) => vy - vx)
    },
    setIToNNN: (oc: number) => setI(oc, () => NNN(oc)),
    randAndNN: (oc: number) => setVx(oc, () => ~~(Math.random() * 0xff) & NN(oc)),

    draw: (oc: number) => {
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
    },

    setDelayTimer: (oc: number) => {
        state.delayTimer = Vx(oc)
        state.pc += 2
    },

    delayTimer: (oc: number) => setVx(oc, () => state.delayTimer),

    setSoundTimer: (oc: number) => {
        state.soundTimer = Vx(oc)
        state.pc += 2
    },

    addVxToI: (oc: number) => {
        // Undocumented overflow feature of the CHIP-8 used by the Spacefight 2091! game
        state.V[0xf] = +(state.I + Vx(oc) > 0xfff)
        setI(oc, (vx, i) => vx + i)
    },

    setIBySprite: (oc: number) => setI(oc, vx => vx * 5),

    loadVxBDC: (oc: number) => {
        const { memory, I } = state
        const vx = Vx(oc)
        memory[I + 2] = vx % 10
        memory[I + 1] = ~~(vx / 10) % 10
        memory[I] = ~~(vx / 100) % 10
    }
}
