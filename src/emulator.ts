const initialState = {
    sp: 0,
    pc: 0,
    stack: new Array(16).fill(0)
}

export let state = { ...initialState }
export const init = () => (state = { ...initialState })

export const opcodes = {
    return: () => {
        state.sp--
        state.pc = state.stack[state.sp]
    },

    call: (opcode: number) => {
        state.stack[state.sp] = state.pc
        state.sp++
        state.pc = opcode & 0x0fff
    }
}
