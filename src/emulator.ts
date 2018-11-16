const getArray = (size: number): number[] => new Array(size).fill(0)

export let state = { sp: 0, I: 0, pc: 0x200, stack: getArray(16), V: getArray(16) }

export const init = (delta: Partial<typeof state> = {}) =>
    (state = { sp: 0, pc: 0x200, V: getArray(16), I: 0, stack: getArray(16), ...delta })

const X = (oc: number) => (oc & 0x0f00) >> 8
const Vx = (oc: number) => state.V[X(oc)]
const Y = (oc: number) => (oc & 0x00f0) >> 4
const Vy = (oc: number) => state.V[Y(oc)]
const NN = (oc: number) => oc & 0x00ff
const NNN = (oc: number) => oc & 0x0fff

const setVf = (oc: number, calcVf: (vx: number, vy: number) => boolean | number) =>
    (state.V[0xf] = +calcVf(Vx(oc), Vy(oc)))

const setVx = (oc: number, calcVx: (vx: number, vy: number) => number) => {
    const x = X(oc)
    const newVx = calcVx(state.V[x], Vy(oc))
    state.V[x] = newVx
    state.pc += 2
    if (newVx > 255) state.V[x] -= 256
    else if (newVx < 0) state.V[x] += 256
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
    setIToNNN: (oc: number) => {
        state.I = NNN(oc)
        state.pc += 2
    },

    randAndNN: (oc: number) => setVx(oc, () => ~~(Math.random() * 0xff) & (oc & 0x00ff))
}
