export let state = {
    sp: 0,
    pc: 0x200,
    stack: new Array(16).fill(0),
    V: new Array(16).fill(0)
}

type State = typeof state

export const init = (delta: Partial<State> = {}) =>
    (state = { sp: 0, pc: 0x200, V: new Array(16).fill(0), stack: new Array(16).fill(0), ...delta })

const getX = (oc: number) => (oc & 0x0f00) >> 8
const getY = (oc: number) => (oc & 0x00f0) >> 4
const getNN = (oc: number) => oc & 0x00ff

const setVx = (oc: number, getVx: (vx: number, vy: number) => number) => {
    const x = getX(oc)
    state.V[x] = getVx(state.V[x], state.V[getY(oc)])
    state.pc += 2
}

const skipNext = (oc: number, cond: (vx: number) => boolean) => (state.pc += cond(state.V[getX(oc)]) ? 4 : 2)

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

    skipIfNNEq: (oc: number) => skipNext(oc, vx => vx === getNN(oc)),
    skipIfNNNotEq: (oc: number) => skipNext(oc, vx => vx !== getNN(oc)),
    skipIfVyEq: (oc: number) => skipNext(oc, vx => vx === state.V[getY(oc)]),
    setNN: (oc: number) => setVx(oc, () => getNN(oc)),
    addNN: (oc: number) => setVx(oc, vx => vx + getNN(oc)),
    setVy: (oc: number) => setVx(oc, (_, vy) => vy),
    orVy: (oc: number) => setVx(oc, (vx, vy) => vx | vy),
    andVy: (oc: number) => setVx(oc, (vx, vy) => vx & vy),
    xorVy: (oc: number) => setVx(oc, (vx, vy) => vx ^ vy)
}
