export let state = {
    sp: 0,
    pc: 0x200,
    stack: new Array(16).fill(0),
    V: new Array(16).fill(0)
}
type State = typeof state

export const init = (delta: Partial<State> = {}) =>
    (state = { sp: 0, pc: 0x200, V: new Array(16).fill(0), stack: new Array(16).fill(0), ...delta })

const X = (oc: number) => (oc & 0x0f00) >> 8
const Vx = (oc: number) => state.V[X(oc)]
const Y = (oc: number) => (oc & 0x00f0) >> 4
const Vy = (oc: number) => state.V[Y(oc)]
const NN = (oc: number) => oc & 0x00ff

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

const skipNext = (oc: number, cond: (vx: number) => boolean) => (state.pc += cond(Vx(oc)) ? 4 : 2)

export const opcodes = {
    return: () => {
        state.sp--
        state.pc = state.stack[state.sp]
    },

    goto: (oc: number) => (state.pc = oc & 0xfff),

    call: (oc: number) => {
        state.stack[state.sp] = state.pc
        state.sp++
        opcodes.goto(oc)
    },

    skipIfNNEq: (oc: number) => skipNext(oc, vx => vx === NN(oc)),
    skipIfNNNotEq: (oc: number) => skipNext(oc, vx => vx !== NN(oc)),
    skipIfVyEq: (oc: number) => skipNext(oc, vx => vx === state.V[Y(oc)]),
    skipIfVyNotEq: (oc: number) => skipNext(oc, vx => vx !== state.V[Y(oc)]),
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
    setVySubVx: (oc: number) => {
        setVf(oc, (vx, vy) => vy > vx)
        setVx(oc, (vx, vy) => vy - vx)
    }
}
