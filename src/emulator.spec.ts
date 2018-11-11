import { opcodes, init, state } from "./emulator"

const initWithV = (delta: NMap<number>) =>
    init({ V: new Array(16).fill(0).map((_, i) => (delta[i] !== undefined ? delta[i] : 0)) })

describe("opcodes", () => {
    beforeEach(() => init())

    describe("flow opcodes", () => {
        it("Calls a subroutine.", () => {
            opcodes.call(0x2123)
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123)
        })

        it("Calls a subrutine and returns", () => {
            opcodes.call(0x2123)
            opcodes.return()
            expect(state.pc).toEqual(0x200)
            expect(state.sp).toEqual(0)
        })

        it("Calls two subrutines and returns", () => {
            opcodes.call(0x2123)
            opcodes.call(0x2234)
            opcodes.return()
            expect(state.sp).toEqual(1)
            expect(state.pc).toEqual(0x123)
        })

        it("Goto to address", () => {
            opcodes.goto(0x1123)
            expect(state.pc).toEqual(0x123)
        })
    })
    describe("Conditional opcodes", () => {
        it("runs next instruction when VX are not equal", () => {
            opcodes.skipNextEqual(0x30ff)
            expect(state.pc).toEqual(0x202)
        })
        it("skips next instruction when VX are equal", () => {
            opcodes.skipNextEqual(0x3000)
            expect(state.pc).toEqual(0x204)
        })

        it("runs next instruction when VX are equal", () => {
            opcodes.skipNextNotEqual(0x30ff)
            expect(state.pc).toEqual(0x204)
        })
        it("skips next instruction when VX are not equal", () => {
            opcodes.skipNextNotEqual(0x3000)
            expect(state.pc).toEqual(0x202)
        })

        it("skips next instruction if V[X] === V[Y]", () => {
            opcodes.skipNextIfVEqual(0x5010)
            expect(state.pc).toEqual(0x204)
        })
        it("runs next instruction if V[X] === V[Y]", () => {
            initWithV({ 1: 108 })
            opcodes.skipNextIfVEqual(0x5010)
            expect(state.pc).toEqual(0x202)
        })
    })
})
