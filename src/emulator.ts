const initialState = {
    sp: 0,
    pc: 0x200,
    stack: new Array(16).fill(0),
    V: new Array(16).fill(0)
}
type State = typeof initialState

export let state = { ...initialState }
export const init = (delta: Partial<State> = {}) => (state = { ...initialState, ...delta })

const getX = (opcode: number) => (opcode & 0x000) >> 8
const getValue = (opcode: number) => opcode & 0xff

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

    skipNextEqual: (oc: number) => (state.pc += state.V[getX(oc)] === getValue(oc) ? 4 : 2),

    skipNextNotEqual: (oc: number) => (state.pc += state.V[getX(oc)] !== getValue(oc) ? 4 : 2),

    skipNextIfVEqual: (oc: number) => (state.pc += state.V[(oc & 0x0f00) >> 8] === state.V[(oc & 0x00f0) >> 4] ? 4 : 2)
}
