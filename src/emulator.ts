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

const setVx = (oc: number, calcVx: (vx: number, vy: number) => number) => {
    const x = X(oc)
    state.V[x] = calcVx(state.V[x], Vy(oc))
    state.pc += 2
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
        setVx(oc, (vx, vy) => vx + vy)
        state.V[0xf] = +(Vx(oc) > 255)
        // if (Vx(oc) > 255) state.V[X(oc)] -= 256
    },
    subVy: (oc: number) => {
        state.V[0xf] = +(Vx(oc) > Vy(oc))
        setVx(oc, (vx, vy) => vx - vy)
        // if (Vx(oc) < 0) state.V[X(oc)] += 256
    }
}
