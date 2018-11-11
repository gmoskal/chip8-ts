import { opcodes, init, state } from "./emulator"

describe("opcodes", () => {
    beforeEach(init)
    it("Calls a subroutine.", () => {
        opcodes.call(0x0123)
        expect(state.sp).toEqual(1)
        expect(state.pc).toEqual(0x123)
    })

    it("Calls a subrutine and returns", () => {
        opcodes.call(0x0123)
        opcodes.return()
        expect(state.pc).toEqual(0)
        expect(state.sp).toEqual(0)
    })

    it("Calls two subrutines and returns", () => {
        opcodes.call(0x0123)
        opcodes.call(0x0234)
        opcodes.return()
        expect(state.sp).toEqual(1)
        expect(state.pc).toEqual(0x123)
    })
})
